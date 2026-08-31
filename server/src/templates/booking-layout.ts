/**
 * Shared HTML for the direct-booking e-mails.
 *
 * Why tables and inline styles: e-mail clients are not browsers. Outlook
 * renders through Word, Gmail drops `<style>` in some modes and flexbox works
 * almost nowhere. A 600px table with the styling on each element is the only
 * thing that looks the same everywhere.
 *
 * Images are blocked by default in most clients, so a QR code is never the
 * only route to paying — the account details are always spelled out below it.
 */

import { config } from "../config.js";
import type { Lang } from "../i18n.js";
import { LOCALES } from "./booking-strings.js";

export const PROPERTY = {
  name: "Backyard Dejvice",
  address: "Studentská 697/4, 160 00 Praha 6 – Dejvice",
  owner: "Ing. Martin Kopáč, IČO 04495560",
};

export const INK = "#14171a";
export const MUTED = "#6b7480";
export const LINE = "#e3e6ea";
export const ACCENT = "#1a5fd0";
export const OK = "#0f7a45";
const BG = "#f6f7f9";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Always Czech formatting: the amount is always in CZK, and `sk-SK` would
 * render "4 040 CZK" where `cs-CZ` gives "4 040 Kč". The site shows the same
 * form, so the guest sees one consistent number.
 */
export function money(czk: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(czk);
}

export function longDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export function dateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function row(
  label: string,
  value: string,
  opts: { strong?: boolean; big?: boolean; last?: boolean } = {},
): string {
  const weight = opts.strong ? "700" : "400";
  const size = opts.big ? "17px" : "14px";
  const border = opts.last ? "none" : `1px solid ${LINE}`;
  return `<tr>
    <td style="padding:9px 0;border-bottom:${border};color:${MUTED};font-size:14px;">${esc(label)}</td>
    <td style="padding:9px 0;border-bottom:${border};text-align:right;font-size:${size};font-weight:${weight};color:${INK};">${value}</td>
  </tr>`;
}

export function mono(value: unknown): string {
  return `<span style="font-family:monospace;">${esc(value)}</span>`;
}

export function section(title: string, inner: string): string {
  return `<tr><td style="padding:0 28px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${LINE};border-radius:10px;background:#ffffff;">
      <tr><td style="padding:18px 20px;">
        ${title ? `<div style="font-size:13px;font-weight:700;color:${INK};margin-bottom:10px;">${esc(title)}</div>` : ""}
        ${inner}
      </td></tr>
    </table>
  </td></tr>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="border-radius:7px;background:${ACCENT};">
      <a href="${esc(href)}" style="display:inline-block;padding:11px 22px;font-family:${FONT};
         font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    </td></tr></table>`;
}

export function steps(items: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items
    .map(
      (text, i) => `<tr>
      <td width="28" valign="top" style="padding:0 0 12px;">
        <div style="width:21px;height:21px;border-radius:11px;background:#eef4ff;color:${ACCENT};
                    font-size:12px;font-weight:700;text-align:center;line-height:21px;">${i + 1}</div>
      </td>
      <td valign="top" style="padding:1px 0 12px;font-size:14px;line-height:1.55;">${esc(text)}</td>
    </tr>`,
    )
    .join("")}</table>`;
}

/** QR lives on the site, which proxies the PMS — the PMS itself is internal. */
export function qrUrl(code: string): string {
  return `${config.PUBLIC_BASE_URL}/api/booking/${encodeURIComponent(code)}/qr.png`;
}

export function bookingUrl(code: string, lang: Lang): string {
  return `${config.PUBLIC_BASE_URL}/?lang=${lang}&booking=${encodeURIComponent(code)}`;
}

export function layout(opts: {
  preheader: string;
  body: string;
  footer: string;
  lang?: Lang;
}): string {
  return `<!DOCTYPE html>
<html lang="${opts.lang ?? "en"}" dir="ltr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${BG};">
<!-- Inbox preview line. Must be present but invisible. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
           style="width:600px;max-width:100%;font-family:${FONT};color:${INK};">
      ${opts.body}
      <tr><td style="padding:6px 28px 28px;color:${MUTED};font-size:12px;line-height:1.6;">
        ${opts.footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
