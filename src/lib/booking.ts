/**
 * Types and calls for direct booking.
 *
 * Everything here goes through the site's own `/api/booking/*`, which proxies
 * the PMS. The browser never sees the PMS address or its key.
 */

import { apiGet, apiPost } from "./api";

export interface AvailabilityDay {
  date: string;
  free: boolean;
  price_czk: number | null;
  min_stay: number | null;
}

export interface Availability {
  blockedRanges: Array<{ start: string; end: string }>;
  lastUpdated: string;
  days?: AvailabilityDay[];
  /** False or absent when the PMS is unreachable — offer the inquiry form. */
  booking?: boolean;
}

export interface Quote {
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  nightly: Array<{ date: string; price_czk: number }>;
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

export type PaymentMethod = "transfer" | "revolut";

export const fetchAvailability = () => apiGet<Availability>("/api/availability");

export const fetchQuote = (input: {
  checkin: string;
  checkout: string;
  guests: number;
  coupon?: string | null;
}) => apiPost<Quote>("/api/booking/quote", input);

export const fetchReservation = (code: string) =>
  apiGet<Reservation>(`/api/booking/${encodeURIComponent(code)}`);

export const fetchPayment = (code: string) =>
  apiGet<PaymentInstructions>(`/api/booking/${encodeURIComponent(code)}/payment`);

export const qrSrc = (code: string) =>
  `/api/booking/${encodeURIComponent(code)}/qr.png`;

export const createBooking = (input: {
  checkin: string;
  checkout: string;
  guests: number;
  coupon?: string | null;
  guest: { name: string; email: string; phone?: string; note?: string };
  payment_method: PaymentMethod;
  acceptedTerms: true;
  lang: string;
}) => apiPost<Reservation>("/api/booking", input);

/* --- dates -------------------------------------------------------------- */

/**
 * `toISOString()` converts local midnight to UTC and in Prague that shifts the
 * date back a day. Always format from the local parts.
 */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function nightsBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * The strictest minimum stay across the nights of a range, or null when the
 * range crosses an occupied night.
 *
 * Minimum stay is a property of the day, not of the calendar: the pricing
 * engine raises it on peaks and drops it to one night in a short gap between
 * bookings. This mirrors what the server computes, so the calendar never
 * offers a range the server would reject.
 */
export function requiredNights(
  days: Map<string, AvailabilityDay>,
  from: Date,
  to: Date,
): number | null {
  let need = 1;
  for (const d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    const info = days.get(toDateStr(d));
    if (!info?.free) return null;
    need = Math.max(need, info.min_stay ?? 1);
  }
  return need;
}

export function canCheckout(
  days: Map<string, AvailabilityDay>,
  checkin: Date,
  candidate: Date,
): boolean {
  if (candidate <= checkin) return false;
  const need = requiredNights(days, checkin, candidate);
  return need !== null && nightsBetween(checkin, candidate) >= need;
}
