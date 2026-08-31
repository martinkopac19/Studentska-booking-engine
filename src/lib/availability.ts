export interface BlockedRange {
  start: string
  end: string
}

export interface AvailabilityData {
  blockedRanges: BlockedRange[]
  lastUpdated: string
}

const MIN_NIGHTS = 2

/** Check if a single date (YYYY-MM-DD) falls within any blocked range,
 *  OR if the free gap it belongs to is shorter than MIN_NIGHTS (unusable). */
export function isDateBlocked(dateStr: string, blockedRanges: BlockedRange[]): boolean {
  for (const range of blockedRanges) {
    if (dateStr >= range.start && dateStr < range.end) {
      return true
    }
  }
  // Check if this date sits in a gap too small for a valid stay
  // Find the previous blocked range ending at or before this date
  let gapStart: string | null = null
  let gapEnd: string | null = null
  for (const range of blockedRanges) {
    // range.end is the first free day after a reservation
    if (range.end <= dateStr) {
      if (!gapStart || range.end > gapStart) gapStart = range.end
    }
    // range.start is the first blocked day of the next reservation
    if (range.start > dateStr) {
      if (!gapEnd || range.start < gapEnd) gapEnd = range.start
    }
  }
  // If bounded on both sides, check if gap is too short
  if (gapStart && gapEnd) {
    const gapDays = daysBetween(gapStart, gapEnd)
    if (gapDays < MIN_NIGHTS) return true
  }
  return false
}

/** Count days between two YYYY-MM-DD strings */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
}

/** Check if the entire stay interval [checkIn, checkOut) is free of blocked dates.
 *  We check every night from checkIn to the day before checkOut. */
export function isRangeAvailable(checkIn: string, checkOut: string, blockedRanges: BlockedRange[]): boolean {
  if (checkIn >= checkOut) return false
  for (const range of blockedRanges) {
    // Overlap: checkIn < range.end && checkOut > range.start
    if (checkIn < range.end && checkOut > range.start) {
      return false
    }
  }
  return true
}

/** Get the maximum allowed checkout date given a check-in date.
 *  Returns the start of the next blocked range after checkIn, or null if no limit. */
export function getMaxCheckout(checkIn: string, blockedRanges: BlockedRange[]): string | null {
  let earliest: string | null = null
  for (const range of blockedRanges) {
    if (range.start > checkIn) {
      if (!earliest || range.start < earliest) {
        earliest = range.start
      }
    }
  }
  return earliest
}

/** Format date string to locale-friendly format */
export function formatDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d}.${m}.${y}`
}

/** Add days to a YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/** Convert YYYY-MM-DD to Date object (noon to avoid timezone issues) */
export function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

/** Convert Date to YYYY-MM-DD string */
export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
