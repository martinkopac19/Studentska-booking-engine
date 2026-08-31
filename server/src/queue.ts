import { randomUUID } from "node:crypto";
import { db, nowIso } from "./db.js";

export const TRANSACTIONAL_QUEUE = "transactional_emails";

export interface EmailPayload {
  message_id: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  label: string;
  purpose: string;
  idempotency_key: string;
  unsubscribe_token: string;
  queued_at: string;
}

export interface QueueMessage {
  msg_id: number;
  read_ct: number;
  payload: EmailPayload;
}

const insertStmt = db.prepare(
  `INSERT INTO email_queue (queue_name, payload, visible_at) VALUES (?, ?, ?)`,
);

export function enqueue(queueName: string, payload: EmailPayload): number {
  const info = insertStmt.run(queueName, JSON.stringify(payload), nowIso());
  return Number(info.lastInsertRowid);
}

/**
 * Claim up to `batchSize` visible messages and hide them for `vtSeconds`.
 *
 * The UPDATE ... RETURNING runs as a single statement, so two overlapping
 * worker ticks can never claim the same row.
 */
export function readBatch(
  queueName: string,
  batchSize: number,
  vtSeconds: number,
): QueueMessage[] {
  const now = nowIso();
  const newVisibleAt = new Date(Date.now() + vtSeconds * 1000).toISOString();

  const rows = db
    .prepare(
      `UPDATE email_queue
          SET visible_at = ?, read_ct = read_ct + 1
        WHERE msg_id IN (
              SELECT msg_id FROM email_queue
               WHERE queue_name = ? AND visible_at <= ?
               ORDER BY msg_id
               LIMIT ?)
    RETURNING msg_id, read_ct, payload`,
    )
    .all(newVisibleAt, queueName, now, batchSize) as Array<{
    msg_id: number;
    read_ct: number;
    payload: string;
  }>;

  return rows.map((row) => ({
    msg_id: row.msg_id,
    read_ct: row.read_ct,
    payload: JSON.parse(row.payload) as EmailPayload,
  }));
}

const deleteStmt = db.prepare(`DELETE FROM email_queue WHERE msg_id = ?`);

export function deleteMessage(msgId: number): void {
  deleteStmt.run(msgId);
}

const dlqInsertStmt = db.prepare(
  `INSERT INTO email_queue_dlq (queue_name, payload, reason) VALUES (?, ?, ?)`,
);

const logInsertStmt = db.prepare(
  `INSERT INTO email_send_log (id, message_id, template_name, recipient_email, status, error_message)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

/** Move a message to the DLQ and record why, in one transaction. */
export const moveToDlq = db.transaction(
  (queueName: string, msg: QueueMessage, reason: string): void => {
    dlqInsertStmt.run(queueName, JSON.stringify(msg.payload), reason);
    deleteStmt.run(msg.msg_id);
    logInsertStmt.run(
      randomUUID(),
      msg.payload.message_id,
      msg.payload.label || queueName,
      msg.payload.to,
      "dlq",
      reason.slice(0, 1000),
    );
  },
);

export function queueDepth(queueName: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM email_queue WHERE queue_name = ?`)
    .get(queueName) as { n: number };
  return row.n;
}
