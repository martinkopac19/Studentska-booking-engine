import { z } from "zod";

/**
 * All runtime configuration comes from the environment. Nothing that used to be
 * hardcoded in the Supabase edge functions (iCal tokens, notification address,
 * sender domain) is baked into the image any more.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),

  /** Directory holding the SQLite database. Mounted as a Docker volume. */
  DATA_DIR: z.string().default("/data"),
  /** Directory holding the built frontend (Vite `dist/`). */
  STATIC_DIR: z.string().default("/app/public"),

  /** Public origin, used to build unsubscribe links. No trailing slash. */
  PUBLIC_BASE_URL: z
    .string()
    .url()
    .default("https://studentskaprague.cz")
    .transform((v) => v.replace(/\/+$/, "")),

  /** Resend credentials. Sending is disabled (but still queued) when unset. */
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  /** From header, e.g. "Backyard Dejvice <noreply@studentskaprague.cz>". */
  MAIL_FROM: z.string().default("Backyard Dejvice <noreply@studentskaprague.cz>"),
  /** Where reservation inquiry notifications go. */
  NOTIFY_EMAIL: z.string().email().default("kopacmartin@email.cz"),

  /** Calendar feeds. These URLs contain secret tokens — never commit them. */
  AIRBNB_ICAL_URL: z.string().url().optional(),
  BOOKING_ICAL_URL: z.string().url().optional(),

  /**
   * Apartmán PMS — the source of truth for prices and direct bookings.
   *
   * Both containers sit on the same Docker network, so this is an internal
   * address and the traffic never leaves the host or passes through Caddy.
   * The key is defence in depth against other containers on that network.
   *
   * Without these the site keeps working exactly as before: availability
   * still comes from the iCal feeds and the form stays an inquiry form.
   */
  PMS_BASE_URL: z
    .string()
    .url()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, "") : v)),
  PMS_API_KEY: z.string().optional(),
  /** How long to wait for the PMS before falling back. */
  PMS_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),

  /** How often the queue worker wakes up, in milliseconds. */
  WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  /** Set to "0" to keep the worker from running (e.g. in tests). */
  WORKER_ENABLED: z
    .enum(["0", "1"])
    .default("1")
    .transform((v) => v === "1"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const config = parsed.data;

export const isMailEnabled = Boolean(config.RESEND_API_KEY);

/**
 * Direct booking needs both the address and the key. Half-configured is worse
 * than off: the site would take a booking it cannot price or record.
 */
export const isBookingEnabled = Boolean(config.PMS_BASE_URL && config.PMS_API_KEY);

if (config.PMS_BASE_URL && !config.PMS_API_KEY) {
  console.warn(
    "PMS_BASE_URL is set but PMS_API_KEY is not — direct booking stays disabled.",
  );
}

if (!isMailEnabled) {
  console.warn(
    "RESEND_API_KEY is not set — inquiries will be stored and queued, but no email will be sent until it is configured.",
  );
}

if (!config.AIRBNB_ICAL_URL && !config.BOOKING_ICAL_URL) {
  console.warn(
    "Neither AIRBNB_ICAL_URL nor BOOKING_ICAL_URL is set — availability will report no blocked dates.",
  );
}
