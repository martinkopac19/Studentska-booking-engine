/**
 * Sent 24 hours before the 48-hour payment window closes.
 *
 * Without it, bookings get cancelled in silence and both sides lose: the guest
 * because they forgot, and the apartment because the dates sat blocked for two
 * days for nothing.
 */

import type { Lang } from "../i18n.js";
import type { PaymentInstructions, Reservation } from "../pms.js";
import {
  PROPERTY,
  ACCENT,
  LINE,
  MUTED,
  dateTime,
  esc,
  layout,
  money,
  mono,
  qrUrl,
  row,
  section,
} from "./booking-layout.js";
import { S } from "./booking-strings.js";
import type { TemplateEntry } from "./registry.js";

export interface BookingPaymentReminderData {
  reservation: Reservation;
  payment: PaymentInstructions;
  lang: Lang;
}

function renderHtml(data: BookingPaymentReminderData): string {
  const { reservation: r, payment: p, lang } = data;
  const s = S[lang] ?? S.en;
  const due = p.due_at ? dateTime(p.due_at, lang) : "";
  const b = p.bank;

  const body = `
    <tr><td style="padding:8px 28px 18px;">
      <div style="font-size:21px;font-weight:700;line-height:1.3;">${esc(s.hi(r.guest_name ?? ""))}</div>
      <div style="font-size:15px;line-height:1.6;padding-top:10px;">${s.reminderIntro(due)}</div>
    </td></tr>

    ${section(
      s.payTitle,
      `${
        p.qr_url
          ? `<div style="text-align:center;padding:2px 0 14px;">
               <img src="${esc(qrUrl(r.public_code))}" width="170" height="170" alt="QR"
                    style="border:1px solid ${LINE};border-radius:8px;"></div>`
          : ""
      }
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row(s.amount, money(p.amount_czk), { strong: true, big: true })}
        ${row(s.vs, mono(p.variable_symbol))}
        ${b?.account ? row(s.account, mono(b.account)) : ""}
        ${b?.iban ? row(s.iban, mono(b.iban), { last: !p.revolut_url }) : ""}
        ${
          p.revolut_url
            ? row(
                s.revolut,
                `<a href="${esc(p.revolut_url)}" style="color:${ACCENT};">${esc(p.revolut_url)}</a>`,
                { last: true },
              )
            : ""
        }
      </table>`,
    )}

    ${section("", `<div style="font-size:13px;color:${MUTED};line-height:1.6;">${esc(s.reminderIfPaid)}</div>`)}`;

  return layout({
    lang,
    preheader: s.preheaderReminder(due),
    body,
    footer: `${esc(s.questions)}<br><br>${esc(PROPERTY.owner)} · ${esc(PROPERTY.address)}`,
  });
}

function renderText(data: BookingPaymentReminderData): string {
  const { reservation: r, payment: p, lang } = data;
  const s = S[lang] ?? S.en;
  const due = p.due_at ? dateTime(p.due_at, lang) : "";
  return [
    s.hi(r.guest_name ?? ""),
    "",
    String(s.reminderIntro(due)).replace(/<[^>]+>/g, ""),
    "",
    `${s.amount}: ${money(p.amount_czk)}`,
    `${s.vs}: ${p.variable_symbol}`,
    p.bank?.account ? `${s.account}: ${p.bank.account}` : "",
    p.bank?.iban ? `${s.iban}: ${p.bank.iban}` : "",
    "",
    s.reminderIfPaid,
    "",
    s.questions,
  ]
    .filter(Boolean)
    .join("\n");
}

export const template: TemplateEntry<BookingPaymentReminderData> = {
  renderHtml,
  renderText,
  subject: (data) => (S[data.lang] ?? S.en).subjectReminder(data.reservation.public_code),
  displayName: `${PROPERTY.name} — payment reminder`,
};
