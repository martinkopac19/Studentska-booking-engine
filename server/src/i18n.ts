/**
 * The languages the site offers. Kept in sync with `src/i18n/translations.ts`
 * on the frontend — the guest's choice travels with the booking so the
 * confirmation e-mail arrives in the language they were reading.
 */
export const LANGS = ["en", "cs", "de", "sk", "uk"] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

export function toLang(value: unknown): Lang {
  return LANGS.includes(value as Lang) ? (value as Lang) : DEFAULT_LANG;
}
