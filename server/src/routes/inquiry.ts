import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";
import { sendTransactionalEmail } from "../email.js";
import { datesOverlap, fetchCalendarEvents } from "../ical.js";

const InquirySchema = z.object({
  guestName: z.string().min(1).max(255),
  guestEmail: z.string().email().max(255),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
});

const MIN_NIGHTS = 2;

function nightsBetween(checkIn: string, checkOut: string): number {
  const from = new Date(`${checkIn}T12:00:00Z`).getTime();
  const to = new Date(`${checkOut}T12:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function registerInquiryRoute(app: FastifyInstance): void {
  app.post("/api/inquiry", async (request, reply) => {
    const parsed = InquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const { guestName, guestEmail, checkIn, checkOut, notes } = parsed.data;

    const nights = nightsBetween(checkIn, checkOut);
    if (!Number.isFinite(nights) || nights < MIN_NIGHTS) {
      return reply.code(400).send({ error: `Minimum stay is ${MIN_NIGHTS} nights` });
    }

    // Advisory only: a calendar outage must not lose a real inquiry, so a
    // failure here is reported in the notification rather than rejected.
    let availabilityNote: string;
    try {
      const { events, partial } = await fetchCalendarEvents();
      const conflicting = events.filter((e) =>
        datesOverlap(checkIn, checkOut, e.start, e.end),
      );

      if (conflicting.length > 0) {
        const detail = conflicting
          .map((c) => `${c.source}: ${c.summary} (${c.start} to ${c.end})`)
          .join(", ");
        availabilityNote = `⚠️ POSSIBLE CONFLICT: ${detail}`;
      } else if (partial) {
        availabilityNote =
          "⚠️ Could not reach every booking calendar — please verify availability manually.";
      } else {
        availabilityNote = "✅ No conflicts found in Airbnb/Booking calendars.";
      }
    } catch (error) {
      request.log.error({ err: error }, "Availability check failed");
      availabilityNote =
        "⚠️ Availability check failed — please verify availability manually.";
    }

    const inquiryId = randomUUID();

    try {
      db.prepare(
        `INSERT INTO reservation_inquiries
           (id, guest_name, guest_email, check_in, check_out, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(inquiryId, guestName, guestEmail, checkIn, checkOut, notes ?? null);
    } catch (error) {
      request.log.error({ err: error }, "Failed to store inquiry");
      return reply.code(500).send({ error: "Internal server error" });
    }

    try {
      sendTransactionalEmail({
        templateName: "inquiry-notification",
        idempotencyKey: `inquiry-notify-${inquiryId}`,
        templateData: {
          guestName,
          guestEmail,
          checkIn,
          checkOut,
          nights,
          notes: notes || undefined,
          availabilityNote,
        },
      });
    } catch (error) {
      // The inquiry is already safe in the database; the guest should still get
      // a success response even if queueing the notification failed.
      request.log.error({ err: error, inquiryId }, "Failed to queue notification");
    }

    return reply.send({
      success: true,
      hasConflict: availabilityNote.startsWith("⚠️"),
    });
  });
}
