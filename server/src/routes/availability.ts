import type { FastifyInstance } from "fastify";
import { isBookingEnabled } from "../config.js";
import { fetchCalendarEvents, mergeRanges, type DateRange } from "../ical.js";
import { fetchAvailability, type AvailabilityDay } from "../pms.js";

interface AvailabilityData {
  blockedRanges: DateRange[];
  lastUpdated: string;
  /** Per-day price and minimum stay. Empty when the PMS is unavailable. */
  days?: AvailabilityDay[];
  /** Tells the frontend whether it may offer instant booking. */
  booking?: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
/** How far ahead the calendar offers dates. The PMS plans a year out. */
const HORIZON_DAYS = 365;

let cache: { data: AvailabilityData; expiresAt: number } | null = null;

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function loadAvailability(): Promise<AvailabilityData | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const { events, partial } = await fetchCalendarEvents();

  // Every configured feed failed. Returning an empty list here would advertise
  // the whole calendar as free and invite a double booking, so report the
  // failure instead and let the form disable itself.
  if (events.length === 0 && partial) {
    return null;
  }

  const data: AvailabilityData = {
    blockedRanges: mergeRanges(events.map(({ start, end }) => ({ start, end }))),
    lastUpdated: new Date().toISOString(),
  };

  // Prices are a bonus, not a requirement. When the PMS is down the site still
  // shows which dates are free — it just cannot quote them, and the frontend
  // falls back to the inquiry form.
  if (isBookingEnabled) {
    const days = await fetchAvailability(isoDate(0), isoDate(HORIZON_DAYS));
    if (days) {
      data.days = days;
      data.booking = true;
    }
  }

  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export function registerAvailabilityRoute(app: FastifyInstance): void {
  app.get("/api/availability", async (_request, reply) => {
    const data = await loadAvailability();

    if (!data) {
      return reply
        .code(502)
        .send({ error: "Failed to fetch availability from booking calendars" });
    }

    return reply.send(data);
  });
}
