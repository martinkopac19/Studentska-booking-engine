import type { FastifyInstance } from "fastify";
import { db, nowIso } from "../db.js";
import { suppress } from "../email.js";

interface TokenRecord {
  token: string;
  email: string;
  used_at: string | null;
}

function lookupToken(token: string): TokenRecord | undefined {
  return db
    .prepare(
      `SELECT token, email, used_at FROM email_unsubscribe_tokens WHERE token = ?`,
    )
    .get(token) as TokenRecord | undefined;
}

/**
 * Marks the token spent and suppresses the address in one transaction, so a
 * crash cannot leave a token consumed without the suppression taking effect.
 * Returns false when another request got there first.
 */
const processUnsubscribe = db.transaction((token: string, email: string): boolean => {
  const result = db
    .prepare(
      `UPDATE email_unsubscribe_tokens SET used_at = ? WHERE token = ? AND used_at IS NULL`,
    )
    .run(nowIso(), token);

  if (result.changes === 0) return false;

  suppress(email, "unsubscribe");
  return true;
});

export function registerUnsubscribeRoutes(app: FastifyInstance): void {
  app.register(async (instance) => {
    // RFC 8058 one-click unsubscribe arrives as a form-encoded POST from the
    // mail client, with the token in the query string.
    instance.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string" },
      (_req, body, done) => {
        try {
          done(null, Object.fromEntries(new URLSearchParams(body as string)));
        } catch (error) {
          done(error as Error, undefined);
        }
      },
    );

    function extractToken(request: {
      query: unknown;
      body: unknown;
    }): string | null {
      const fromQuery = (request.query as { token?: string })?.token;
      if (fromQuery) return fromQuery;

      const body = request.body as Record<string, string> | undefined;
      if (body && typeof body.token === "string" && body.token) return body.token;

      return null;
    }

    instance.get("/api/unsubscribe", async (request, reply) => {
      const token = extractToken(request);
      if (!token) return reply.code(400).send({ error: "Token is required" });

      const record = lookupToken(token);
      if (!record) return reply.code(404).send({ error: "Invalid or expired token" });

      if (record.used_at) {
        return reply.send({ valid: false, reason: "already_unsubscribed" });
      }

      return reply.send({ valid: true });
    });

    instance.post("/api/unsubscribe", async (request, reply) => {
      const token = extractToken(request);
      if (!token) return reply.code(400).send({ error: "Token is required" });

      const record = lookupToken(token);
      if (!record) return reply.code(404).send({ error: "Invalid or expired token" });

      if (record.used_at) {
        return reply.send({ success: false, reason: "already_unsubscribed" });
      }

      try {
        const done = processUnsubscribe(record.token, record.email);
        if (!done) {
          return reply.send({ success: false, reason: "already_unsubscribed" });
        }
      } catch (error) {
        request.log.error({ err: error }, "Failed to process unsubscribe");
        return reply.code(500).send({ error: "Failed to process unsubscribe" });
      }

      request.log.info({ email: record.email }, "Email unsubscribed");
      return reply.send({ success: true });
    });
  });
}
