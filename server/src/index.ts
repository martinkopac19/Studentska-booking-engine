import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { config } from "./config.js";
import { db } from "./db.js";
import { registerAvailabilityRoute } from "./routes/availability.js";
import { registerBookingRoutes } from "./routes/booking.js";
import { registerInquiryRoute } from "./routes/inquiry.js";
import { registerSuppressionRoute } from "./routes/suppression.js";
import { registerUnsubscribeRoutes } from "./routes/unsubscribe.js";
import { startReminders, stopReminders } from "./reminders.js";
import { startWorker, stopWorker } from "./worker.js";

const app = Fastify({
  logger: {
    level: config.NODE_ENV === "production" ? "info" : "debug",
  },
  // Caddy terminates TLS and sets X-Forwarded-*; trust it so logs and rate
  // limiting see the real client address.
  trustProxy: true,
  bodyLimit: 128 * 1024,
});

app.get("/api/health", async () => {
  const queued = db
    .prepare(`SELECT COUNT(*) AS n FROM email_queue`)
    .get() as { n: number };
  return { status: "ok", queued: queued.n };
});

registerAvailabilityRoute(app);
registerBookingRoutes(app);
registerInquiryRoute(app);
registerUnsubscribeRoutes(app);
registerSuppressionRoute(app);

// Serve the built frontend. The SPA uses client-side routing, so any unknown
// non-API path falls back to index.html.
if (existsSync(config.STATIC_DIR)) {
  await app.register(fastifyStatic, { root: config.STATIC_DIR });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
} else {
  app.log.warn(
    `STATIC_DIR ${config.STATIC_DIR} does not exist — serving API only.`,
  );
}

startWorker();
startReminders();

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down`);
  stopWorker();
  stopReminders();
  await app.close();
  db.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

export { app };
