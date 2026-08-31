import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { logSend, suppress } from "../email.js";

/** Reject webhooks whose timestamp is further than this from now. */
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Svix-signed webhook (the scheme Resend uses).
 *
 * The signed content is `${id}.${timestamp}.${body}`, HMAC-SHA256 with the
 * base64-decoded portion of the `whsec_` secret. The header may carry several
 * space-separated versioned signatures during a secret rotation, so any valid
 * `v1` entry is accepted.
 */
function verifySignature(args: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
}): boolean {
  const timestampSeconds = Number(args.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const driftSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (driftSeconds > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(
    args.secret.startsWith("whsec_") ? args.secret.slice("whsec_".length) : args.secret,
    "base64",
  );

  const expected = createHmac("sha256", secretBytes)
    .update(`${args.id}.${args.timestamp}.${args.body}`)
    .digest();

  for (const part of args.signatureHeader.split(" ")) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) continue;

    const provided = Buffer.from(signature, "base64");
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true;
    }
  }

  return false;
}

interface ResendWebhookEvent {
  type?: string;
  data?: { to?: string[] | string; email_id?: string };
}

const REASON_BY_EVENT: Record<string, "bounce" | "complaint"> = {
  "email.bounced": "bounce",
  "email.complained": "complaint",
};

const LOG_STATUS_BY_REASON = {
  bounce: "bounced",
  complaint: "complained",
} as const;

export function registerSuppressionRoute(app: FastifyInstance): void {
  app.register(async (instance) => {
    // The raw body is needed byte-for-byte to check the HMAC, so this scope
    // keeps the string instead of letting Fastify parse it into an object.
    instance.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_req, body, done) => done(null, { raw: body as string }),
    );

    instance.post("/api/webhooks/resend", async (request, reply) => {
      if (!config.RESEND_WEBHOOK_SECRET) {
        request.log.error("Received webhook but RESEND_WEBHOOK_SECRET is not set");
        return reply.code(500).send({ error: "Server configuration error" });
      }

      const headers = request.headers;
      const id = headers["svix-id"];
      const timestamp = headers["svix-timestamp"];
      const signature = headers["svix-signature"];

      if (
        typeof id !== "string" ||
        typeof timestamp !== "string" ||
        typeof signature !== "string"
      ) {
        return reply.code(401).send({ error: "Missing signature headers" });
      }

      const raw = (request.body as { raw?: string } | undefined)?.raw ?? "";

      if (
        !verifySignature({
          secret: config.RESEND_WEBHOOK_SECRET,
          id,
          timestamp,
          body: raw,
          signatureHeader: signature,
        })
      ) {
        request.log.error("Invalid webhook signature");
        return reply.code(401).send({ error: "Invalid signature" });
      }

      let event: ResendWebhookEvent;
      try {
        event = JSON.parse(raw) as ResendWebhookEvent;
      } catch {
        return reply.code(400).send({ error: "Invalid JSON" });
      }

      const reason = event.type ? REASON_BY_EVENT[event.type] : undefined;
      if (!reason) {
        // Delivered, opened, clicked and friends need no action.
        return reply.send({ ok: true, ignored: event.type ?? null });
      }

      const recipients = Array.isArray(event.data?.to)
        ? event.data.to
        : event.data?.to
          ? [event.data.to]
          : [];

      if (recipients.length === 0) {
        return reply.code(400).send({ error: "Missing recipient in payload" });
      }

      for (const recipient of recipients) {
        suppress(recipient, reason, { event: event.type, email_id: event.data?.email_id });
        logSend({
          messageId: event.data?.email_id ?? null,
          templateName: event.type ?? "unknown",
          recipientEmail: recipient,
          status: LOG_STATUS_BY_REASON[reason],
        });
        request.log.warn({ recipient, reason }, "Address suppressed via webhook");
      }

      return reply.send({ ok: true, suppressed: recipients.length });
    });
  });
}
