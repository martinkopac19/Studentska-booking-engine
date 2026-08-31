import { config } from "./config.js";

export interface DateRange {
  start: string;
  end: string;
}

export interface CalendarEvent extends DateRange {
  summary: string;
  source: string;
}

/**
 * Minimal iCal reader: Airbnb and Booking.com both emit all-day VEVENTs with
 * DATE-valued DTSTART/DTEND, which is all the availability check needs.
 */
export function parseICalEvents(icalText: string): Array<DateRange & { summary: string }> {
  const events: Array<DateRange & { summary: string }> = [];

  for (const block of icalText.split("BEGIN:VEVENT").slice(1)) {
    const dtstart = block.match(/DTSTART[^:]*:(\d{8})/)?.[1];
    const dtend = block.match(/DTEND[^:]*:(\d{8})/)?.[1];
    const summary = block.match(/SUMMARY:(.*)/)?.[1]?.trim() || "Reserved";

    if (!dtstart || !dtend) continue;

    const start = `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`;
    const end = `${dtend.slice(0, 4)}-${dtend.slice(4, 6)}-${dtend.slice(6, 8)}`;
    events.push({ start, end, summary });
  }

  return events;
}

export function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const merged: DateRange[] = [{ ...sorted[0]! }];

  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range.start <= last.end) {
      if (range.end > last.end) last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

export function datesOverlap(
  checkIn: string,
  checkOut: string,
  bookedStart: string,
  bookedEnd: string,
): boolean {
  return checkIn < bookedEnd && checkOut > bookedStart;
}

const SOURCES: Array<{ name: string; url: string | undefined }> = [
  { name: "Airbnb", url: config.AIRBNB_ICAL_URL },
  { name: "Booking.com", url: config.BOOKING_ICAL_URL },
];

/**
 * Fetch every configured calendar. A feed that fails is logged and skipped
 * rather than failing the whole request — the same behaviour the edge function
 * had. Callers get `partial: true` so they can tell a real "no bookings" apart
 * from "we could not reach the calendars".
 */
export async function fetchCalendarEvents(): Promise<{
  events: CalendarEvent[];
  partial: boolean;
}> {
  const events: CalendarEvent[] = [];
  let partial = false;

  await Promise.all(
    SOURCES.map(async ({ name, url }) => {
      // A calendar that was never configured is a deliberate choice, not an
      // outage — only a configured feed that fails counts as partial data.
      if (!url) return;

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
          console.error(`Calendar fetch failed: ${name} returned ${res.status}`);
          partial = true;
          return;
        }
        const parsed = parseICalEvents(await res.text());
        events.push(...parsed.map((e) => ({ ...e, source: name })));
      } catch (error) {
        console.error(`Failed to fetch ${name} calendar:`, error);
        partial = true;
      }
    }),
  );

  return { events, partial };
}
