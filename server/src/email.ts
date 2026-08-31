import { randomBytes, randomUUID } from "node:crypto";
import { config } from "./config.js";
import { db } from "./db.js";
import { TRANSACTIONAL_QUEUE, enqueue } from "./queue.js";
import { TEMPLATES, resolveSubject } from "./templates/registry.js";

export type SendResult =
  | { success: true; queued: true; messageId: string }
  | { success: false; reason: "email_suppressed" };

export class TemplateNotFoundError extends Error {
  constructor(name: string) {
    super(`Template '${name}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`);
    this.name = "TemplateNotFoundError";
  }
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function logSend(entry: {
  messageId: string | null;
  templateName: string;
  recipientEmail: string;
  status:
    | "pending"
    | "sent"
    | "suppressed"
    | "failed"
    | "rate_limited"
    | "bounced"
    | "complained"
    | "dlq";
  errorMessage?: string;
  metadata?: unknown;
}): void {
  try {
    db.prepare(
      `INSERT INTO email_send_log (id, message_id, template_name, recipient_email, status, error_message, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      entry.messageId,
      entry.templateName,
      entry.recipientEmail,
      entry.status,
      entry.errorMessage?.slice(0, 1000) ?? null,
      entry.metadata === undefined ? null : JSON.stringify(entry.metadata),
    );
  } catch (error) {
    // The unique index on (message_id) WHERE status='sent' rejects a duplicate
    // success. That is the guard doing its job, not a reason to crash a send.
    console.error("Failed to write email_send_log entry", { entry, error });
  }
}

export function isSuppressed(email: string): boolean {
  const row = db
    .prepare(`SELECT 1 AS hit FROM suppressed_emails WHERE email = ?`)
    .get(email.toLowerCase());
  return Boolean(row);
}

export function suppress(
  email: string,
  reason: "unsubscribe" | "bounce" | "complaint",
  metadata?: unknown,
): void {
  db.prepare(
    `INSERT INTO suppressed_emails (id, email, reason, metadata)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`,
  ).run(
    randomUUID(),
    email.toLowerCase(),
    reason,
    metadata === undefined ? null : JSON.stringify(metadata),
  );
}

/**
 * One unsubscribe token per address, reused until it is spent. Wrapped in a
 * transaction so concurrent sends to the same address cannot mint two tokens.
 */
const getOrCreateToken = db.transaction((email: string): string | null => {
  const existing = db
    .prepare(`SELECT token, used_at FROM email_unsubscribe_tokens WHERE email = ?`)
    .get(email) as { token: string; used_at: string | null } | undefined;

  if (existing) {
    // A spent token means the address unsubscribed; the suppression check above
    // should already have caught it. Refuse to send rather than mint a new one.
    return existing.used_at ? null : existing.token;
  }

  const token = generateToken();
  db.prepare(
    `INSERT INTO email_unsubscribe_tokens (id, token, email) VALUES (?, ?, ?)`,
  ).run(randomUUID(), token, email);
  return token;
});

/**
 * Render a template and put it on the queue. Delivery itself is the worker's
 * job, so a slow or rate-limited provider never blocks the HTTP request that
 * triggered the mail.
 */
export function sendTransactionalEmail(args: {
  templateName: string;
  recipientEmail?: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}): SendResult {
  const template = TEMPLATES[args.templateName];
  if (!template) throw new TemplateNotFoundError(args.templateName);

  const recipient = template.to ?? args.recipientEmail;
  if (!recipient) {
    throw new Error(
      "recipientEmail is required (unless the template defines a fixed recipient)",
    );
  }

  const messageId = randomUUID();
  const normalizedEmail = recipient.toLowerCase();
  const templateData = args.templateData ?? {};

  if (isSuppressed(normalizedEmail)) {
    logSend({
      messageId,
      templateName: args.templateName,
      recipientEmail: recipient,
      status: "suppressed",
    });
    return { success: false, reason: "email_suppressed" };
  }

  const unsubscribeToken = getOrCreateToken(normalizedEmail);
  if (!unsubscribeToken) {
    logSend({
      messageId,
      templateName: args.templateName,
      recipientEmail: recipient,
      status: "suppressed",
      errorMessage: "Unsubscribe token already used but address not suppressed",
    });
    return { success: false, reason: "email_suppressed" };
  }

  logSend({
    messageId,
    templateName: args.templateName,
    recipientEmail: recipient,
    status: "pending",
  });

  enqueue(TRANSACTIONAL_QUEUE, {
    message_id: messageId,
    to: recipient,
    from: config.MAIL_FROM,
    subject: resolveSubject(template, templateData),
    html: template.renderHtml(templateData),
    text: template.renderText(templateData),
    label: args.templateName,
    purpose: "transactional",
    idempotency_key: args.idempotencyKey ?? messageId,
    unsubscribe_token: unsubscribeToken,
    queued_at: new Date().toISOString(),
  });

  return { success: true, queued: true, messageId };
}
