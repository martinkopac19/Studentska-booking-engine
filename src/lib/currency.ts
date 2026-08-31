/**
 * Showing the price in the guest's currency.
 *
 * The charge is always in CZK — this is display only, exactly as Previo does
 * it. Rates come from the ČNB daily fixing via the API; a currency without a
 * rate is simply not offered, because a guessed rate is worse than none.
 */

import { apiGet } from "./api";
import type { Lang } from "@/i18n/translations";

export type Currency = "CZK" | "EUR" | "USD";

interface CurrencyMeta {
  /** How many units of the currency one CZK buys. Null until rates load. */
  rate: number | null;
  locale: string;
  decimals: number;
}

/**
 * `cs-CZ` on purpose: `sk-SK` renders CZK as "4 040 CZK" where Czech gives
 * "4 040 Kč", and the guest should see the same form everywhere.
 */
export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  CZK: { rate: 1, locale: "cs-CZ", decimals: 0 },
  EUR: { rate: null, locale: "de-DE", decimals: 2 },
  USD: { rate: null, locale: "en-US", decimals: 2 },
};

export interface RatesInfo {
  date: string | null;
  stale: boolean;
  source: string;
}

let ratesInfo: RatesInfo | null = null;

export async function loadRates(): Promise<RatesInfo | null> {
  try {
    const data = await apiGet<{
      date: string | null;
      stale: boolean;
      source: string;
      czk_per_unit: Record<string, number>;
    }>("/api/booking/rates");

    for (const [code, czkPerUnit] of Object.entries(data.czk_per_unit ?? {})) {
      const meta = CURRENCIES[code as Currency];
      if (meta && czkPerUnit > 0) meta.rate = 1 / czkPerUnit;
    }
    ratesInfo = { date: data.date, stale: data.stale, source: data.source };
    return ratesInfo;
  } catch {
    return null;
  }
}

export const getRatesInfo = () => ratesInfo;

/** Currencies we can actually convert into right now. */
export function availableCurrencies(): Currency[] {
  return (Object.keys(CURRENCIES) as Currency[]).filter(
    (c) => CURRENCIES[c].rate !== null,
  );
}

export function formatMoney(czk: number, currency: Currency): string {
  const meta = CURRENCIES[currency];
  const rate = meta.rate ?? 1;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(czk * rate);
}

/**
 * The same amount without its currency mark, for the calendar grid alone.
 *
 * A day cell is around 36px wide at most of the sizes this page has to work at
 * and "1 530 Kč" needs 41, so the mark was the part that spilled out. On a
 * selected day that spill is white text landing on the cream page behind it, so
 * it disappeared and 1 530 Kč read as "530". The currency is named in the
 * header picker and repeated on every line of the price summary, so the grid
 * can carry the number alone.
 */
export function formatMoneyBare(czk: number, currency: Currency): string {
  const meta = CURRENCIES[currency];
  const rate = meta.rate ?? 1;
  return new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(czk * rate);
}

/* --- dates -------------------------------------------------------------- */

const LOCALES: Record<Lang, string> = {
  en: "en-GB",
  cs: "cs-CZ",
  de: "de-DE",
  sk: "sk-SK",
  uk: "uk-UA",
};

export function formatLongDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export function formatShortDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00`));
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function monthLabel(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Weekday initials, Monday first — Intl gives Sunday-first arrays. */
export function weekdayLabels(lang: Lang): string[] {
  const fmt = new Intl.DateTimeFormat(LOCALES[lang], { weekday: "short" });
  // 2026-01-05 is a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2026, 0, 5 + i)),
  );
}

/* --- plurals ------------------------------------------------------------ */

export function nightsWord(n: number, lang: Lang): string {
  switch (lang) {
    case "de":
      return n === 1 ? "1 Nacht" : `${n} Nächte`;
    case "cs":
    case "sk":
      return n === 1 ? "1 noc" : n < 5 ? `${n} noci` : `${n} nocí`;
    case "uk": {
      const a = n % 10;
      const b = n % 100;
      if (a === 1 && b !== 11) return `${n} ніч`;
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} ночі`;
      return `${n} ночей`;
    }
    default:
      return n === 1 ? "1 night" : `${n} nights`;
  }
}

export function guestsWord(n: number, lang: Lang): string {
  switch (lang) {
    case "de":
      return n === 1 ? "1 Gast" : `${n} Gäste`;
    case "cs":
      return n === 1 ? "1 host" : n < 5 ? `${n} hosté` : `${n} hostů`;
    case "sk":
      return n === 1 ? "1 hosť" : n < 5 ? `${n} hostia` : `${n} hostí`;
    case "uk": {
      const a = n % 10;
      const b = n % 100;
      if (a === 1 && b !== 11) return `${n} гість`;
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} гості`;
      return `${n} гостей`;
    }
    default:
      return n === 1 ? "1 guest" : `${n} guests`;
  }
}
