import { config } from "./config.js";
import { db } from "./db.js";
import { logSend } from "./email.js";
import {
  EmailApiError,
  getRetryAfterSeconds,
  isForbidden,
  isRateLimited,
  sendEmail,
} from "./mailer.js";
import {
  TRANSACTIONAL_QUEUE,
  deleteMessage,
  moveToDlq,
  readBatch,
  type QueueMessage,
} from "./queue.js";

const MAX_RETRIES = 5;
/** How long a claimed message stays invisible while we try to send it. */
const VISIBILITY_TIMEOUT_SECONDS = 30;

interface SendState {
  retry_after_until: string | null;
  batch_size: number;
  send_delay_ms: number;
  transactional_email_ttl_minutes: number;
}

function readState(): SendState {
  return db
    .prepare(
      `SELECT retry_after_until, batch_size, send_delay_ms, transactional_email_ttl_minutes
         FROM email_send_state WHERE id = 1`,
    )
    .get() as SendState;
}

function setRetryAfter(seconds: number): void {
  db.prepare(
    `UPDATE email_send_state
        SET retry_after_until = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = 1`,
  ).run(new Date(Date.now() + seconds * 1000).toISOString());
}

/**
 * Retry budget counts real send failures, not queue reads: a message that was
 * claimed but never attempted (because a 429 stopped the batch early) must not
 * burn a retry.
 */
function failedAttempts(messageId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM email_send_log WHERE message_id = ? AND status = 'failed'`,
    )
    .get(messageId) as { n: number };
  return row.n;
}

function alreadySent(messageId: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS hit FROM email_send_log WHERE message_id = ? AND status = 'sent'`,
    )
    .get(messageId);
  return Boolean(row);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TickResult = {
  processed: number;
  stopped?: "rate_limited" | "emails_disabled";
  skipped?: "rate_limited";
};

async function processQueue(
  queueName: string,
  state: SendState,
  ttlMinutes: number,
): Promise<TickResult> {
  const messages = readBatch(queueName, state.batch_size, VISIBILITY_TIMEOUT_SECONDS);
  if (messages.length === 0) return { processed: 0 };

  let processed = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as QueueMessage;
    const payload = msg.payload;

    // Drop messages that sat in the queue past their useful life.
    const ageMs = Date.now() - new Date(payload.queued_at).getTime();
    if (Number.isFinite(ageMs) && ageMs > ttlMinutes * 60 * 1000) {
      console.warn("Email expired (TTL exceeded)", {
        queueName,
        msg_id: msg.msg_id,
        queued_at: payload.queued_at,
      });
      moveToDlq(queueName, msg, `TTL exceeded (${ttlMinutes} minutes)`);
      continue;
    }

    const attempts = failedAttempts(payload.message_id);
    if (attempts >= MAX_RETRIES) {
      moveToDlq(
        queueName,
        msg,
        `Max retries (${MAX_RETRIES}) exceeded (attempted ${attempts} times)`,
      );
      continue;
    }

    // Guard against a duplicate delivery if a previous tick sent this message
    // but crashed before deleting it from the queue.
    if (alreadySent(payload.message_id)) {
      console.warn("Skipping duplicate send (already sent)", {
        queueName,
        msg_id: msg.msg_id,
        message_id: payload.message_id,
      });
      deleteMessage(msg.msg_id);
      continue;
    }

    try {
      const { id: providerId } = await sendEmail(payload);

      logSend({
        messageId: payload.message_id,
        templateName: payload.label || queueName,
        recipientEmail: payload.to,
        status: "sent",
        metadata: providerId ? { provider_message_id: providerId } : undefined,
      });
      deleteMessage(msg.msg_id);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Email send failed", {
        queueName,
        msg_id: msg.msg_id,
        read_ct: msg.read_ct,
        failed_attempts: attempts,
        error: message,
      });

      if (isRateLimited(error)) {
        logSend({
          messageId: payload.message_id,
          templateName: payload.label || queueName,
          recipientEmail: payload.to,
          status: "rate_limited",
          errorMessage: message,
        });
        setRetryAfter(getRetryAfterSeconds(error));
        // Leave the rest of the batch queued; it becomes visible again when the
        // visibility timeout lapses.
        return { processed, stopped: "rate_limited" };
      }

      if (isForbidden(error)) {
        moveToDlq(queueName, msg, "Sending is forbidden for this account or domain");
        return { processed, stopped: "emails_disabled" };
      }

      // A missing API key is a configuration problem, not a bad message: keep it
      // queued without burning the retry budget so it flushes once configured.
      if (error instanceof EmailApiError && error.status === 503) {
        return { processed };
      }

      logSend({
        messageId: payload.message_id,
        templateName: payload.label || queueName,
        recipientEmail: payload.to,
        status: "failed",
        errorMessage: message,
      });
    }

    if (i < messages.length - 1) await sleep(state.send_delay_ms);
  }

  return { processed };
}

export async function runOnce(): Promise<TickResult> {
  const state = readState();

  if (state.retry_after_until && new Date(state.retry_after_until) > new Date()) {
    return { processed: 0, skipped: "rate_limited" };
  }

  return processQueue(
    TRANSACTIONAL_QUEUE,
    state,
    state.transactional_email_ttl_minutes,
  );
}

let running = false;
let timer: NodeJS.Timeout | null = null;

/**
 * Replaces the pg_cron job that used to poke the edge function every 5 seconds.
 * `running` keeps a slow tick from overlapping the next one.
 */
export function startWorker(): void {
  if (!config.WORKER_ENABLED) {
    console.warn("Queue worker disabled (WORKER_ENABLED=0)");
    return;
  }

  timer = setInterval(() => {
    if (running) return;
    running = true;
    runOnce()
      .catch((error) => console.error("Queue worker tick failed", error))
      .finally(() => {
        running = false;
      });
  }, config.WORKER_INTERVAL_MS);

  timer.unref();
  console.log(`Queue worker started (every ${config.WORKER_INTERVAL_MS}ms)`);
}

export function stopWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
