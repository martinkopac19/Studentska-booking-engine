/**
 * The e-mail a guest gets the moment a direct booking is confirmed.
 *
 * It has one job beyond saying thank you: get the guest to pay within 48 hours.
 * Everything needed for that — amount, reference, account, QR — is in the
 * message itself, so nobody has to come back to the site to find it.
 */

import type { Lang } from "../i18n.js";
import type { PaymentInstructions, Reservation } from "../pms.js";
import {
  PROPERTY,
  MUTED,
  OK,
  ACCENT,
  LINE,
  bookingUrl,
  button,
  dateTime,
  esc,
  layout,
  longDate,
  money,
  mono,
  qrUrl,
  row,
  section,
  steps,
} from "./booking-layout.js";
import { S, guestsWord, nightsWord } from "./booking-strings.js";
import type { TemplateEntry } from "./registry.js";

export interface BookingConfirmationData {
  reservation: Reservation;
  payment: PaymentInstructions | null;
  lang: Lang;
}

function paymentBlock(
  s: Record<string, any>,
  p: PaymentInstructions | null,
  code: string,
  lang: Lang,
): string {
  if (!p || !p.payable) {
    // An invented account number would be far worse than admitting we will
    // send the details separately.
    return `<div style="font-size:14px;color:${MUTED};">${esc(s.noDetails)}</div>`;
  }
  if (p.paid) {
    return `<div style="font-size:14px;color:${OK};">${esc(s.paidNote)}</div>`;
  }

  const b = p.bank;
  const qr = p.qr_url
    ? `<div style="text-align:center;padding:4px 0 14px;">
         <img src="${esc(qrUrl(code))}" width="170" height="170" alt="QR"
              style="border:1px solid ${LINE};border-radius:8px;">
         <div style="font-size:12px;color:${MUTED};padding-top:6px;">${esc(s.qrHint)}</div>
       </div>`
    : "";

  return `
    <div style="font-size:14px;line-height:1.6;margin-bottom:12px;">${
      p.due_at ? s.payLead(dateTime(p.due_at, lang)) : ""
    }</div>
    ${qr}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row(s.amount, money(p.amount_czk), { strong: true, big: true })}
      ${row(s.vs, mono(p.variable_symbol))}
      ${b?.account ? row(s.account, mono(b.account)) : ""}
      ${b?.iban ? row(s.iban, mono(b.iban)) : ""}
      ${b?.bic ? row(s.bic, mono(b.bic)) : ""}
      ${b?.holder ? row(s.holder, esc(b.holder)) : ""}
      ${
        p.revolut_url
          ? row(
              s.revolut,
              `<a href="${esc(p.revolut_url)}" style="color:${ACCENT};">${esc(p.revolut_url)}</a>`,
            )
          : ""
      }
      ${row(s.message, mono(p.message), { last: true })}
    </table>`;
}

function renderHtml(data: BookingConfirmationData): string {
  const { reservation: r, payment: p, lang } = data;
  const s = S[lang] ?? S.en;
  const code = r.public_code;
  const total = r.total_czk ?? 0;
  const accommodation = total - (r.cleaning_fee_czk ?? 0) - (r.city_tax_czk ?? 0);

  const body = `
    <tr><td style="padding:8px 28px 20px;">
      <div style="font-size:22px;font-weight:700;line-height:1.3;">${esc(s.hi(r.guest_name ?? ""))}</div>
      <div style="font-size:15px;line-height:1.6;color:${MUTED};padding-top:8px;">${esc(s.confirmIntro)}</div>
      <div style="padding-top:16px;font-size:13px;color:${MUTED};">${esc(s.codeLabel)}</div>
      <div style="font-family:monospace;font-size:26px;font-weight:700;letter-spacing:.14em;padding-top:2px;">${esc(code)}</div>
    </td></tr>

    ${section(
      s.stayTitle,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row(s.checkin, esc(longDate(r.checkin, lang)))}
        ${row(s.checkout, esc(longDate(r.checkout, lang)))}
        ${row(s.guests, esc(guestsWord(r.guests, lang)))}
        ${row(s.length, esc(nightsWord(r.nights, lang)), { last: true })}
      </table>
      <div style="font-size:13px;color:${MUTED};padding-top:10px;">${esc(s.checkinTime)}</div>`,
    )}

    ${section(
      s.priceTitle,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row(s.accommodation, money(accommodation))}
        ${r.cleaning_fee_czk ? row(s.cleaning, money(r.cleaning_fee_czk)) : ""}
        ${r.city_tax_czk ? row(s.cityTax, money(r.city_tax_czk)) : ""}
        ${row(s.total, money(total), { strong: true, big: true, last: true })}
      </table>`,
    )}

    ${section(s.payTitle, paymentBlock(s, p, code, lang))}
    ${section(s.nextTitle, steps([s.n1, s.n2, s.n3, s.n4]))}
    ${section(
      s.addressTitle,
      `<div style="font-size:14px;line-height:1.6;">${esc(PROPERTY.address)}</div>
       <div style="padding-top:12px;">${button(bookingUrl(code, lang), `${s.codeLabel} · ${code}`)}</div>`,
    )}`;

  return layout({
    lang,
    preheader: s.preheaderConfirm(money(total)),
    body,
    footer: `${esc(s.questions)}<br>${esc(s.thanks)}<br><br>${esc(PROPERTY.owner)} · ${esc(PROPERTY.address)}`,
  });
}

function renderText(data: BookingConfirmationData): string {
  const { reservation: r, payment: p, lang } = data;
  const s = S[lang] ?? S.en;
  const lines = [
    s.hi(r.guest_name ?? ""),
    "",
    s.confirmIntro,
    "",
    `${s.codeLabel}: ${r.public_code}`,
    "",
    `${s.checkin}: ${longDate(r.checkin, lang)}`,
    `${s.checkout}: ${longDate(r.checkout, lang)}`,
    `${s.guests}: ${guestsWord(r.guests, lang)} · ${nightsWord(r.nights, lang)}`,
    `${s.total}: ${money(r.total_czk ?? 0)}`,
    "",
  ];

  if (!p || !p.payable) lines.push(s.noDetails);
  else if (p.paid) lines.push(s.paidNote);
  else {
    lines.push(
      String(s.payTitle).toUpperCase(),
      `${s.amount}: ${money(p.amount_czk)}`,
      `${s.vs}: ${p.variable_symbol}`,
      p.bank?.account ? `${s.account}: ${p.bank.account}` : "",
      p.bank?.iban ? `${s.iban}: ${p.bank.iban}` : "",
      `${s.message}: ${p.message}`,
    );
  }

  lines.push(
    "",
    String(s.nextTitle).toUpperCase(),
    `1. ${s.n1}`,
    `2. ${s.n2}`,
    `3. ${s.n3}`,
    `4. ${s.n4}`,
    "",
    PROPERTY.address,
    bookingUrl(r.public_code, lang),
    "",
    s.questions,
    s.thanks,
  );

  return lines.filter((l) => l !== "").join("\n");
}

export const template: TemplateEntry<BookingConfirmationData> = {
  renderHtml,
  renderText,
  subject: (data) => (S[data.lang] ?? S.en).subjectConfirm(data.reservation.public_code),
  displayName: `${PROPERTY.name} — booking confirmation`,
  previewData: {
    lang: "sk",
    reservation: {
      public_code: "LPXCZX",
      status: "reserved",
      checkin: "2026-10-04",
      checkout: "2026-10-06",
      nights: 2,
      guests: 2,
      guest_name: "Jana Nováková",
      total_czk: 4040,
      city_tax_czk: 200,
      cleaning_fee_czk: 700,
      coupon_code: null,
      payment: {
        method: "transfer",
        status: "pending",
        due_at: "2026-08-18T11:48:00",
        variable_symbol: "LPXCZX",
      },
    },
    payment: {
      payable: true,
      paid: false,
      method: "transfer",
      amount_czk: 4040,
      variable_symbol: "LPXCZX",
      message: "Studentska LPXCZX",
      due_at: "2026-08-18T11:48:00",
      bank: {
        account: "291069269/0300",
        iban: "CZ4203000000000291069269",
        bic: null,
        holder: "Martin Kopac",
      },
      qr_url: "/api/v1/reservations/LPXCZX/qr.png",
      revolut_url: null,
      revolut_iban: null,
    },
  },
};
