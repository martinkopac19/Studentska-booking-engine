import { config } from "../config.js";
import type { TemplateEntry } from "./registry.js";

const SITE_NAME = "Backyard Dejvice";

export interface InquiryNotificationData {
  guestName?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  notes?: string;
  availabilityNote?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function field(label: string, value: unknown): string {
  return `
    <p style="font-size:11px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 2px">${escapeHtml(label)}</p>
    <p style="font-size:15px;color:#1a1a1a;margin:0 0 4px">${escapeHtml(value)}</p>`;
}

function renderHtml(data: InquiryNotificationData): string {
  const {
    guestName = "Guest",
    guestEmail = "",
    checkIn = "",
    checkOut = "",
    nights = 0,
    notes,
    availabilityNote,
  } = data;

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
  <body style="background-color:#ffffff;font-family:Arial, sans-serif;margin:0">
    <div style="display:none;max-height:0;overflow:hidden">New inquiry from ${escapeHtml(guestName)} (${escapeHtml(checkIn)} &rarr; ${escapeHtml(checkOut)})</div>
    <div style="padding:24px 28px;max-width:520px">
      <h1 style="font-size:22px;font-weight:bold;color:#1a3a5c;margin:0 0 16px">&#127968; New Reservation Inquiry</h1>
      <hr style="border:none;border-top:1px solid #e8e0d4;margin:16px 0" />
      ${field("Guest", guestName)}
      ${field("Email", guestEmail)}
      ${field("Check-in", checkIn)}
      ${field("Check-out", checkOut)}
      ${field("Nights", nights)}
      ${notes ? field("Notes", notes) : ""}
      ${
        availabilityNote
          ? `<div style="background-color:#f4f9f4;border-radius:8px;padding:12px 16px;margin:8px 0">
               <p style="font-size:13px;color:#2d6a2d;margin:0">${escapeHtml(availabilityNote)}</p>
             </div>`
          : ""
      }
      <hr style="border:none;border-top:1px solid #e8e0d4;margin:16px 0" />
      <p style="font-size:11px;color:#999999;margin:16px 0 0">Submitted: ${escapeHtml(new Date().toISOString())}</p>
    </div>
  </body>
</html>`;
}

function renderText(data: InquiryNotificationData): string {
  const lines = [
    "NEW RESERVATION INQUIRY",
    "",
    `Guest:      ${data.guestName ?? "Guest"}`,
    `Email:      ${data.guestEmail ?? ""}`,
    `Check-in:   ${data.checkIn ?? ""}`,
    `Check-out:  ${data.checkOut ?? ""}`,
    `Nights:     ${data.nights ?? 0}`,
  ];

  if (data.notes) lines.push(`Notes:      ${data.notes}`);
  if (data.availabilityNote) lines.push("", data.availabilityNote);
  lines.push("", `Submitted: ${new Date().toISOString()}`);

  return lines.join("\n");
}

export const template: TemplateEntry<InquiryNotificationData> = {
  renderHtml,
  renderText,
  subject: (data) =>
    `\u{1F3E0} New Inquiry: ${data.guestName || "Guest"} (${data.checkIn || ""} → ${data.checkOut || ""})`,
  /**
   * Fixed recipient: this notification always goes to the owner, never to an
   * address supplied by the caller. Configurable via NOTIFY_EMAIL.
   */
  get to() {
    return config.NOTIFY_EMAIL;
  },
  displayName: `${SITE_NAME} — reservation inquiry notification`,
  previewData: {
    guestName: "Jan Novák",
    guestEmail: "jan@example.com",
    checkIn: "2026-05-01",
    checkOut: "2026-05-05",
    nights: 4,
    notes: "Arriving late, around 9 PM.",
    availabilityNote: "✅ No conflicts found in Airbnb/Booking calendars.",
  },
};
