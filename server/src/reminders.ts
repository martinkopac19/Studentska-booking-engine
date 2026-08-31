/**
 * Payment reminders for direct bookings.
 *
 * A booking holds the dates for 48 hours and is then cancelled automatically.
 * Without a nudge that happens in silence and both sides lose: the guest
 * because they simply forgot, and the apartment because it sat blocked for two
 * days and earned nothing.
 *
 * This is a scan, not a queue: the PMS knows which bookings are still unpaid,
 * so it is asked periodically rather than something being scheduled up front.
 * A reminder scheduled at booking time would have to be cancelled when the
 * guest pays, and a missed cancellation means nagging someone who already paid.
 */

import { config } from "./config.js";
import { db } from "./db.js";
import { sendTransactionalEmail } from "./email.js";
import { toLang } from "./i18n.js";
import { fetchPayment, fetchPendingPayments, fetchReservation } from "./pms.js";

/** Send the reminder once the deadline is within this many hours. */
const WINDOW_HOURS = 24;
/** The PMS is asked this often. Hourly is plenty for a 48-hour deadline. */
const INTERVAL_MS = 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Remembers which bookings were already reminded.
 *
 * The queue's idempotency key only protects against a duplicate reaching the
 * provider; without this table every hourly tick would enqueue another copy.
 */
function alreadySent(code: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM booking_reminders WHERE public_code = ?`)
    .get(code);
  return Boolean(row);
}

function markSent(code: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO booking_reminders (public_code) VALUES (?)`,
  ).run(code);
}

export async function runRemindersOnce(): Promise<number> {
  const pending = await fetchPendingPayments(WINDOW_HOURS);
  if (!pending) return 0;

  let sent = 0;
  for (const item of pending) {
    if (!item.guest_email || alreadySent(item.public_code)) continue;

    const [reservation, payment] = await Promise.all([
      fetchReservation(item.public_code),
      fetchPayment(item.public_code),
    ]);
    // A booking that got paid or cancelled between the two calls must not be
    // nagged; the PMS is the authority on both.
    if (!reservation || !payment || payment.paid || reservation.status !== "reserved") {
      continue;
    }

    try {
      sendTransactionalEmail({
        templateName: "booking-payment-reminder",
        recipientEmail: item.guest_email,
        idempotencyKey: `booking-reminder-${item.public_code}`,
        templateData: {
          reservation,
          payment,
          lang: toLang(item.lang),
        },
      });
      markSent(item.public_code);
      sent += 1;
    } catch (error) {
      // Leaving it unmarked means the next tick tries again, which is the
      // behaviour we want for a transient failure.
      console.error(`Failed to queue reminder for ${item.public_code}`, error);
    }
  }
  return sent;
}

export function startReminders(): void {
  if (!config.WORKER_ENABLED) return;
  if (!config.PMS_BASE_URL || !config.PMS_API_KEY) return;

  timer = setInterval(() => {
    if (running) return;
    running = true;
    runRemindersOnce()
      .then((n) => {
        if (n > 0) console.log(`Queued ${n} payment reminder(s)`);
      })
      .catch((error) => console.error("Reminder tick failed", error))
      .finally(() => {
        running = false;
      });
  }, INTERVAL_MS);

  timer.unref();
  console.log(`Payment reminders started (every ${INTERVAL_MS / 60000} min)`);
}

export function stopReminders(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
