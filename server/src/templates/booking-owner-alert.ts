/**
 * Owner notification for a new direct booking. Always Slovak — Martin is the
 * only reader.
 *
 * It exists for one reason: Airbnb and Booking pull the outbound iCal feed only
 * every few hours, so until they do, they can still sell the same dates. The
 * call to close the dates manually therefore sits at the very top, above the
 * reservation detail.
 */

import { config } from "../config.js";
import type { PaymentInstructions, Reservation } from "../pms.js";
import {
  PROPERTY,
  ACCENT,
  MUTED,
  button,
  esc,
  layout,
  longDate,
  money,
  row,
  section,
} from "./booking-layout.js";
import { guestsWord, nightsWord } from "./booking-strings.js";
import type { TemplateEntry } from "./registry.js";

export interface BookingOwnerAlertData {
  reservation: Reservation;
  payment: PaymentInstructions | null;
  /** Language the guest booked in — decides which language to write to them. */
  guestLang: string;
  guestEmail?: string;
  guestPhone?: string;
  guestNote?: string;
}

function renderHtml(data: BookingOwnerAlertData): string {
  const { reservation: r, payment: p } = data;
  const nocí = nightsWord(r.nights, "sk");

  const body = `
    <tr><td style="padding:8px 28px 18px;">
      <div style="font-size:21px;font-weight:700;">Nová priama rezervácia</div>
      <div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:.12em;padding-top:6px;">${esc(r.public_code)}</div>
    </td></tr>

    ${section(
      "Zavri termín v extranetoch",
      `<div style="font-size:14px;line-height:1.6;">
         Airbnb a Booking si stiahnu <span style="font-family:monospace;">/ical/direct.ics</span>
         až o pár hodín. Do tej doby môžu ten istý termín predať znovu —
         <strong>zavri ho ručne hneď teraz</strong>.
       </div>`,
    )}

    ${section(
      "Rezervácia",
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Termín", `${esc(longDate(r.checkin, "sk"))} → ${esc(longDate(r.checkout, "sk"))}`)}
        ${row("Dĺžka", `${esc(nocí)}, ${esc(guestsWord(r.guests, "sk"))}`)}
        ${row("Suma", money(r.total_czk ?? 0), { strong: true })}
        ${row("Z toho poplatok", money(r.city_tax_czk ?? 0))}
        ${r.coupon_code ? row("Kupón", esc(r.coupon_code)) : ""}
        ${row("Platba", `${esc(p?.method ?? "—")} · ${p?.paid ? "zaplatené" : "čaká"}`, { last: true })}
      </table>`,
    )}

    ${section(
      "Hosť",
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Meno", esc(r.guest_name))}
        ${
          data.guestEmail
            ? row(
                "E-mail",
                `<a href="mailto:${esc(data.guestEmail)}" style="color:${ACCENT};">${esc(data.guestEmail)}</a>`,
              )
            : ""
        }
        ${data.guestPhone ? row("Telefón", esc(data.guestPhone)) : ""}
        ${row("Jazyk", esc(String(data.guestLang).toUpperCase()), { last: true })}
      </table>
      ${
        data.guestNote
          ? `<div style="font-size:13px;color:${MUTED};padding-top:10px;">„${esc(data.guestNote)}"</div>`
          : ""
      }`,
    )}

    ${section("", `<div>${button(`${config.PMS_BASE_URL ?? ""}/direct`, "Otvoriť v PMS")}</div>`)}`;

  return layout({
    lang: "sk",
    preheader: `${r.guest_name} · ${nocí} · ${Math.round(r.total_czk ?? 0)} Kč. Zavri termín v extranetoch.`,
    body,
    footer: esc(PROPERTY.name),
  });
}

function renderText(data: BookingOwnerAlertData): string {
  const { reservation: r, payment: p } = data;
  return [
    `Nová priama rezervácia ${r.public_code}`,
    "",
    "ZAVRI TERMÍN V EXTRANETOCH — OTA si feed stiahnu až o pár hodín.",
    "",
    `Termín: ${r.checkin} → ${r.checkout} (${nightsWord(r.nights, "sk")}, ${guestsWord(r.guests, "sk")})`,
    `Suma: ${Math.round(r.total_czk ?? 0)} Kč, z toho poplatok ${Math.round(r.city_tax_czk ?? 0)} Kč`,
    `Platba: ${p?.method ?? "—"} · ${p?.paid ? "zaplatené" : "čaká"}`,
    r.coupon_code ? `Kupón: ${r.coupon_code}` : "",
    "",
    `Hosť: ${r.guest_name}${data.guestEmail ? " · " + data.guestEmail : ""}${data.guestPhone ? " · " + data.guestPhone : ""}`,
    `Jazyk: ${String(data.guestLang).toUpperCase()}`,
    data.guestNote ? `Poznámka: ${data.guestNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const template: TemplateEntry<BookingOwnerAlertData> = {
  renderHtml,
  renderText,
  subject: (data) =>
    `Nová rezervácia ${data.reservation.public_code} · ${data.reservation.checkin} → ${data.reservation.checkout} · ${Math.round(data.reservation.total_czk ?? 0)} Kč`,
  /** Always the owner, never an address supplied by the caller. */
  get to() {
    return config.NOTIFY_EMAIL;
  },
  displayName: `${PROPERTY.name} — new direct booking`,
};
