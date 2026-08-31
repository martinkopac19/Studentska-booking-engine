/**
 * Client for Apartmán PMS, which owns prices, availability and reservations.
 *
 * The PMS runs as a sibling container on the same Docker network, so calls go
 * straight to it — never through Caddy, never over the public internet. The
 * API key protects against the other projects sharing that network.
 *
 * Two rules run through this file:
 *
 *  - **A PMS outage must never take the site down.** Read paths return `null`
 *    and the caller degrades: availability falls back to the iCal feeds, the
 *    booking form hides itself. Only the write path throws, because silently
 *    losing a booking would be far worse than an error message.
 *  - **Prices are never invented here.** If the PMS cannot be reached, the
 *    site shows no price rather than a stale or guessed one.
 */

import { config, isBookingEnabled } from "./config.js";

export interface AvailabilityDay {
  date: string;
  free: boolean;
  price_czk: number | null;
  min_stay: number | null;
}

export interface QuoteNight {
  date: string;
  price_czk: number;
}

export interface Quote {
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  nightly: QuoteNight[];
  accommodation_czk: number;
  cleaning_fee_czk: number;
  discount_czk: number;
  city_tax_czk: number;
  total_czk: number;
  min_stay: number;
  bookable: boolean;
  errors: string[];
  coupon: {
    code: string;
    valid: boolean;
    discount_pct: number;
    reason: string | null;
  } | null;
}

export interface Reservation {
  public_code: string;
  status: string;
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  guest_name: string | null;
  total_czk: number | null;
  city_tax_czk: number | null;
  cleaning_fee_czk: number | null;
  coupon_code: string | null;
  payment: {
    method: string | null;
    status: string | null;
    due_at: string | null;
    variable_symbol: string | null;
  };
}

export interface PaymentInstructions {
  payable: boolean;
  paid: boolean;
  method: string;
  amount_czk: number;
  variable_symbol: string;
  message: string;
  due_at: string | null;
  bank: {
    account: string;
    iban: string | null;
    bic: string | null;
    holder: string | null;
  } | null;
  qr_url: string | null;
  revolut_url: string | null;
  revolut_iban: string | null;
}

export interface Rates {
  base: string;
  date: string | null;
  stale: boolean;
  source: string;
  czk_per_unit: Record<string, number>;
}

export interface BookingRequest {
  checkin: string;
  checkout: string;
  guests: number;
  coupon?: string | null;
  guest: { name: string; email: string; phone?: string; note?: string; lang?: string };
  payment_method: string;
  accepted_terms: boolean;
}

/** Thrown by the write path. `status` mirrors what the PMS replied. */
export class PmsError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`PMS responded ${status}: ${detail}`);
    this.name = "PmsError";
  }
}

async function call(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  if (!isBookingEnabled) throw new PmsError(503, "booking is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.PMS_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.PMS_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.PMS_API_KEY as string,
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { detail: text };
    }
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Read helper: any failure becomes `null` so the caller can degrade. */
async function read<T>(path: string): Promise<T | null> {
  if (!isBookingEnabled) return null;
  try {
    const { status, body } = await call(path);
    return status >= 200 && status < 300 ? (body as T) : null;
  } catch {
    return null;
  }
}

export async function fetchAvailability(
  from: string,
  to: string,
): Promise<AvailabilityDay[] | null> {
  const data = await read<{ days: AvailabilityDay[] }>(
    `/api/v1/availability?date_from=${from}&date_to=${to}`,
  );
  return data?.days ?? null;
}

export interface PendingPayment {
  public_code: string;
  guest_email: string | null;
  due_at: string;
  /** Language the guest booked in, when the PMS knows it. */
  lang?: string;
}

export async function fetchPendingPayments(
  withinHours: number,
): Promise<PendingPayment[] | null> {
  const data = await read<{ reservations: PendingPayment[] }>(
    `/api/v1/reservations/pending-payment?within_hours=${withinHours}`,
  );
  return data?.reservations ?? null;
}

export async function fetchRates(): Promise<Rates | null> {
  return read<Rates>("/api/v1/rates");
}

export async function fetchReservation(code: string): Promise<Reservation | null> {
  return read<Reservation>(`/api/v1/reservations/${encodeURIComponent(code)}`);
}

export async function fetchPayment(
  code: string,
): Promise<PaymentInstructions | null> {
  return read<PaymentInstructions>(
    `/api/v1/reservations/${encodeURIComponent(code)}/payment`,
  );
}

/** QR is a PNG, not JSON — proxied straight through to the browser. */
export async function fetchQr(code: string): Promise<Buffer | null> {
  if (!isBookingEnabled) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.PMS_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${config.PMS_BASE_URL}/api/v1/reservations/${encodeURIComponent(code)}/qr.png`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestQuote(input: {
  checkin: string;
  checkout: string;
  guests: number;
  coupon?: string | null;
}): Promise<Quote | null> {
  if (!isBookingEnabled) return null;
  try {
    const { status, body } = await call("/api/v1/quote", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return status >= 200 && status < 300 ? (body as Quote) : null;
  } catch {
    return null;
  }
}

/**
 * Creates the reservation. Unlike the read paths this throws, because the
 * guest has to learn that their booking did not go through.
 */
export async function createReservation(
  input: BookingRequest,
): Promise<Reservation> {
  const { status, body } = await call("/api/v1/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (status >= 200 && status < 300) return body as Reservation;

  const detail =
    body && typeof body === "object" && "detail" in body
      ? String((body as { detail: unknown }).detail)
      : "unknown error";
  throw new PmsError(status, detail);
}
