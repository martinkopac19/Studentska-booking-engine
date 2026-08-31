/**
 * Direct booking. The PMS owns prices and reservations; this route is the
 * public face of it.
 *
 * The site never stores a booking of its own. One source of truth means the
 * guest, the owner's dashboard, the guest register and the monthly city-tax
 * report can never disagree about what was sold.
 *
 * Everything here stays quiet when the PMS is not configured: the endpoints
 * answer 503 and the frontend falls back to the inquiry form.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isBookingEnabled } from "../config.js";
import { sendTransactionalEmail } from "../email.js";
import { toLang } from "../i18n.js";
import {
  PmsError,
  createReservation,
  fetchPayment,
  fetchQr,
  fetchRates,
  fetchReservation,
  requestQuote,
} from "../pms.js";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const QuoteSchema = z.object({
  checkin: DateString,
  checkout: DateString,
  guests: z.coerce.number().int().min(1).max(4),
  coupon: z.string().max(40).optional().nullable(),
});

const BookingSchema = QuoteSchema.extend({
  guest: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(255),
    phone: z.string().max(40).optional(),
    note: z.string().max(2000).optional(),
  }),
  payment_method: z.enum(["transfer", "revolut"]),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "Terms must be accepted" }),
  }),
  lang: z.string().max(5).optional(),
});

/** Booking codes are A–Z and 2–9, six characters. Reject anything else early. */
const CodeSchema = z.string().regex(/^[A-Za-z0-9]{6}$/);

export function registerBookingRoutes(app: FastifyInstance): void {
  app.post("/api/booking/quote", async (request, reply) => {
    if (!isBookingEnabled) return reply.code(503).send({ error: "Booking unavailable" });

    const parsed = QuoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const quote = await requestQuote(parsed.data);
    if (!quote) {
      // The PMS is the only thing that may set a price. Without it the guest
      // gets no number at all rather than a stale or invented one.
      return reply.code(502).send({ error: "Could not price this stay" });
    }
    return reply.send(quote);
  });

  app.post("/api/booking", async (request, reply) => {
    if (!isBookingEnabled) return reply.code(503).send({ error: "Booking unavailable" });

    const parsed = BookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const { guest, payment_method, checkin, checkout, guests, coupon } = parsed.data;
    const lang = toLang(parsed.data.lang);

    let reservation;
    try {
      reservation = await createReservation({
        checkin,
        checkout,
        guests,
        coupon: coupon ?? null,
        guest: { ...guest, lang },
        payment_method,
        accepted_terms: true,
      });
    } catch (error) {
      if (error instanceof PmsError) {
        // 409 means the dates went while the guest was filling in the form.
        // The frontend refreshes the calendar rather than showing a form error.
        request.log.warn({ err: error }, "PMS refused the booking");
        return reply
          .code(error.status === 409 ? 409 : 422)
          .send({ error: error.detail });
      }
      request.log.error({ err: error }, "Booking failed");
      return reply.code(502).send({ error: "Booking failed" });
    }

    const code = reservation.public_code;
    const payment = await fetchPayment(code);

    // The booking already exists in the PMS. A failure to queue mail must not
    // turn a successful booking into an error for the guest.
    try {
      sendTransactionalEmail({
        templateName: "booking-confirmation",
        recipientEmail: guest.email,
        idempotencyKey: `booking-confirm-${code}`,
        templateData: { reservation, payment, lang },
      });
    } catch (error) {
      request.log.error({ err: error, code }, "Failed to queue guest confirmation");
    }

    try {
      sendTransactionalEmail({
        templateName: "booking-owner-alert",
        idempotencyKey: `booking-alert-${code}`,
        templateData: {
          reservation,
          payment,
          guestLang: lang,
          guestEmail: guest.email,
          guestPhone: guest.phone,
          guestNote: guest.note,
        },
      });
    } catch (error) {
      request.log.error({ err: error, code }, "Failed to queue owner alert");
    }

    return reply.code(201).send(reservation);
  });

  app.get<{ Params: { code: string } }>(
    "/api/booking/:code",
    async (request, reply) => {
      const code = CodeSchema.safeParse(request.params.code);
      if (!code.success) return reply.code(404).send({ error: "Not found" });

      const reservation = await fetchReservation(code.data);
      if (!reservation) return reply.code(404).send({ error: "Not found" });
      return reply.send(reservation);
    },
  );

  app.get<{ Params: { code: string } }>(
    "/api/booking/:code/payment",
    async (request, reply) => {
      const code = CodeSchema.safeParse(request.params.code);
      if (!code.success) return reply.code(404).send({ error: "Not found" });

      const payment = await fetchPayment(code.data);
      if (!payment) return reply.code(404).send({ error: "Not found" });
      return reply.send(payment);
    },
  );

  /**
   * The QR image. Public on purpose: it is embedded in the confirmation e-mail
   * with an `<img>` tag, and mail clients cannot send an API key. It encodes a
   * payment *to* the owner, so the worst a leaked code allows is paying us.
   */
  app.get<{ Params: { code: string } }>(
    "/api/booking/:code/qr.png",
    async (request, reply) => {
      const code = CodeSchema.safeParse(request.params.code);
      if (!code.success) return reply.code(404).send({ error: "Not found" });

      const png = await fetchQr(code.data);
      if (!png) return reply.code(404).send({ error: "Not found" });

      return reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "private, max-age=300")
        .send(png);
    },
  );

  /**
   * Exchange rates for showing the price in EUR or USD. Charging always
   * happens in CZK; this is display only. An empty map means the frontend
   * offers Czech crowns and nothing else.
   */
  app.get("/api/booking/rates", async (_request, reply) => {
    const rates = await fetchRates();
    if (!rates) return reply.send({ base: "CZK", czk_per_unit: {}, stale: false });
    return reply.send(rates);
  });
}
