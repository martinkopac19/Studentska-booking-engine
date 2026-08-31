import { config, isMailEnabled } from "./config.js";
import type { EmailPayload } from "./queue.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class EmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "EmailApiError";
  }
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof EmailApiError && error.status === 429;
}

/** 403 means the account or domain is not allowed to send — retrying cannot help. */
export function isForbidden(error: unknown): boolean {
  return error instanceof EmailApiError && error.status === 403;
}

export function getRetryAfterSeconds(error: unknown): number {
  if (error instanceof EmailApiError && error.retryAfterSeconds !== null) {
    return error.retryAfterSeconds;
  }
  return 60;
}

function parseRetryAfter(res: Response): number | null {
  const header = res.headers.get("retry-after") ?? res.headers.get("ratelimit-reset");
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/**
 * Send one message through Resend.
 *
 * `Idempotency-Key` carries the queue's idempotency key, so a message that is
 * retried after an ambiguous failure (timeout, VT expiry) is not delivered
 * twice on Resend's side either.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ id: string | null }> {
  if (!isMailEnabled) {
    throw new EmailApiError("RESEND_API_KEY is not configured", 503);
  }

  const unsubscribeUrl = `${config.PUBLIC_BASE_URL}/unsubscribe?token=${payload.unsubscribe_token}`;

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.idempotency_key,
      },
      body: JSON.stringify({
        from: payload.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    // Network error or timeout — treat as retryable.
    throw new EmailApiError(
      `Request to Resend failed: ${error instanceof Error ? error.message : String(error)}`,
      0,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailApiError(
      `Resend returned ${res.status}: ${body.slice(0, 500)}`,
      res.status,
      parseRetryAfter(res),
    );
  }

  // Resend's id is the only handle its bounce/complaint webhooks send back, so
  // it is worth recording alongside the send.
  const result = (await res.json().catch(() => null)) as { id?: string } | null;
  return { id: result?.id ?? null };
}
