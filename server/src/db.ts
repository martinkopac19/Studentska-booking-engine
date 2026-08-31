import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

mkdirSync(config.DATA_DIR, { recursive: true });

export const db = new Database(join(config.DATA_DIR, "app.db"));

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

/**
 * Schema mirrors the former Supabase tables. Row-level security policies are
 * gone: the database is only reachable from this process, and every write goes
 * through the handlers in `routes/`.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS reservation_inquiries (
    id          TEXT PRIMARY KEY,
    guest_name  TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    check_in    TEXT NOT NULL,
    check_out   TEXT NOT NULL,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_inquiries_created
    ON reservation_inquiries(created_at DESC);

  -- Audit trail for every send attempt. 'rate_limited' is included here; the
  -- original Postgres CHECK constraint omitted it even though the queue worker
  -- wrote that status, so those inserts always failed.
  CREATE TABLE IF NOT EXISTS email_send_log (
    id            TEXT PRIMARY KEY,
    message_id    TEXT,
    template_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN (
                    'pending', 'sent', 'suppressed', 'failed',
                    'rate_limited', 'bounced', 'complained', 'dlq')),
    error_message TEXT,
    metadata      TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_email_send_log_created
    ON email_send_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient
    ON email_send_log(recipient_email);
  CREATE INDEX IF NOT EXISTS idx_email_send_log_message
    ON email_send_log(message_id);

  -- Safety net against double sends when two worker ticks overlap.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
    ON email_send_log(message_id) WHERE status = 'sent';

  CREATE TABLE IF NOT EXISTS email_send_state (
    id                              INTEGER PRIMARY KEY CHECK (id = 1),
    retry_after_until               TEXT,
    batch_size                      INTEGER NOT NULL DEFAULT 10,
    send_delay_ms                   INTEGER NOT NULL DEFAULT 200,
    transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
    updated_at                      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  INSERT OR IGNORE INTO email_send_state (id) VALUES (1);

  -- Append-only: nothing in the app deletes from this table, so a bounce or a
  -- complaint can never be silently undone.
  CREATE TABLE IF NOT EXISTS suppressed_emails (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    reason     TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
    metadata   TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email
    ON suppressed_emails(email);

  CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
    id         TEXT PRIMARY KEY,
    token      TEXT NOT NULL UNIQUE,
    email      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    used_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token
    ON email_unsubscribe_tokens(token);

  -- Replaces pgmq. One row per queued message; visible_at is the visibility
  -- timeout that lets a crashed send be retried on a later tick.
  -- Which direct bookings already had a payment reminder. Without it every
  -- hourly scan would queue another copy for the same guest.
  CREATE TABLE IF NOT EXISTS booking_reminders (
    public_code TEXT PRIMARY KEY,
    sent_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS email_queue (
    msg_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_name  TEXT NOT NULL,
    payload     TEXT NOT NULL,
    visible_at  TEXT NOT NULL,
    read_ct     INTEGER NOT NULL DEFAULT 0,
    enqueued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_email_queue_poll
    ON email_queue(queue_name, visible_at);

  -- Dead letter queue: messages that exhausted retries or expired.
  CREATE TABLE IF NOT EXISTS email_queue_dlq (
    msg_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_name   TEXT NOT NULL,
    payload      TEXT NOT NULL,
    reason       TEXT,
    dead_lettered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

export function nowIso(): string {
  return new Date().toISOString();
}
