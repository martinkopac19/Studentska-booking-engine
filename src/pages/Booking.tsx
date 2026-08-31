/**
 * The booking page — now the front door of the site.
 *
 * Built with Beer CSS (Material Design 3) in its scoped build, so everything
 * lives inside `<div class="beer">` and the Tailwind guide at /guide is
 * untouched.
 *
 * The whole flow is one page rather than Previo's four steps: with a single
 * apartment there is no room to pick and no meal plan, so all that remains is
 * dates, price and details. Once a booking goes through, the page is replaced
 * by the confirmation and `?booking=CODE` is written into the URL with
 * `replaceState`, so the back button cannot return to a submitted form.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { Confirmation } from "@/components/booking/Confirmation";
import { PriceSummary } from "@/components/booking/PriceSummary";
import "@/components/booking/booking.css";
import { useBeerCss } from "@/lib/useBeerCss";
import { BOOKING_COPY } from "@/i18n/booking";
import { translations, type Lang } from "@/i18n/translations";
import { ApiError } from "@/lib/api";
import {
  canCheckout,
  createBooking,
  fetchAvailability,
  fetchQuote,
  nightsBetween,
  toDateStr,
  type AvailabilityDay,
  type PaymentMethod,
  type Quote,
} from "@/lib/booking";
import {
  availableCurrencies,
  formatLongDate,
  guestsWord,
  loadRates,
  nightsWord,
  type Currency,
} from "@/lib/currency";

const LANGS: Array<{ id: Lang; flag: string; label: string }> = [
  { id: "en", flag: "🇬🇧", label: "EN" },
  { id: "cs", flag: "🇨🇿", label: "CZ" },
  { id: "de", flag: "🇩🇪", label: "DE" },
  { id: "sk", flag: "🇸🇰", label: "SK" },
  { id: "uk", flag: "🇺🇦", label: "UA" },
];

const isLang = (v: string): v is Lang => LANGS.some((l) => l.id === v);

function initialLang(params: URLSearchParams): Lang {
  const fromUrl = params.get("lang");
  if (fromUrl && isLang(fromUrl)) return fromUrl;
  const stored = localStorage.getItem("lang");
  if (stored && isLang(stored)) return stored;
  const browser = (navigator.languages ?? []).map((l) => l.slice(0, 2));
  return (browser.find(isLang) as Lang) ?? "en";
}

export default function Booking() {
  useBeerCss();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [lang, setLang] = useState<Lang>(() => initialLang(params));
  const [currency, setCurrency] = useState<Currency>(
    () => (params.get("currency") as Currency) || "CZK",
  );
  const [currencies, setCurrencies] = useState<Currency[]>(["CZK"]);

  const [days, setDays] = useState<Map<string, AvailabilityDay>>(new Map());
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [checkin, setCheckin] = useState<Date | null>(null);
  const [checkout, setCheckout] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [terms, setTerms] = useState(false);

  const [confirmed, setConfirmed] = useState<string | null>(() =>
    params.get("booking"),
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  /* --- copy ------------------------------------------------------------- */

  const t = useCallback(
    (key: string, ...args: string[]): string => {
      const entry = (BOOKING_COPY[lang] ?? BOOKING_COPY.en)[key];
      if (typeof entry === "function") {
        return (entry as (...a: string[]) => string)(...args);
      }
      if (typeof entry === "string") return entry;
      // Fall back to the guide's dictionary so shared words are not duplicated.
      const guide = translations[lang]?.[key] ?? translations.en?.[key];
      return typeof guide === "string" ? guide : key;
    },
    [lang],
  );

  /* --- url -------------------------------------------------------------- */

  const syncUrl = useCallback(
    (code?: string | null) => {
      const q = new URLSearchParams(window.location.search);
      q.set("lang", lang);
      if (currency === "CZK") q.delete("currency");
      else q.set("currency", currency);
      if (code) q.set("booking", code);
      window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
      document.documentElement.lang = lang;
    },
    [lang, currency],
  );

  useEffect(() => {
    syncUrl(confirmed);
    localStorage.setItem("lang", lang);
  }, [syncUrl, confirmed, lang]);

  /* --- data ------------------------------------------------------------- */

  const loadDays = useCallback(async () => {
    try {
      const data = await fetchAvailability();
      setBookingEnabled(Boolean(data.booking && data.days?.length));
      setDays(new Map((data.days ?? []).map((d) => [d.date, d])));
    } catch {
      setBookingEnabled(false);
    }
  }, []);

  useEffect(() => {
    void loadDays();
    void loadRates().then(() => {
      const list = availableCurrencies();
      setCurrencies(list);
      setCurrency((c) => (list.includes(c) ? c : "CZK"));
    });
  }, [loadDays]);

  // Re-price whenever anything that changes the price changes.
  useEffect(() => {
    if (!checkin || !checkout) {
      setQuote(null);
      return;
    }
    let alive = true;
    fetchQuote({
      checkin: toDateStr(checkin),
      checkout: toDateStr(checkout),
      guests,
      coupon: coupon.trim() || null,
    })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [checkin, checkout, guests, coupon]);

  /* --- interaction ------------------------------------------------------ */

  function pick(date: Date) {
    if (!checkin || checkout || date <= checkin) {
      setCheckin(date);
      setCheckout(null);
      return;
    }
    if (canCheckout(days, checkin, date)) setCheckout(date);
  }

  function clearDates() {
    setCheckin(null);
    setCheckout(null);
    setQuote(null);
  }

  const canSubmit =
    Boolean(quote?.bookable) &&
    terms &&
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !busy;

  async function submit() {
    if (!checkin || !checkout || !canSubmit) return;
    setBusy(true);
    setFailure(null);
    try {
      const reservation = await createBooking({
        checkin: toDateStr(checkin),
        checkout: toDateStr(checkout),
        guests,
        coupon: coupon.trim() || null,
        guest: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
        },
        payment_method: method,
        acceptedTerms: true,
        lang,
      });
      setConfirmed(reservation.public_code);
      clearDates();
      window.scrollTo({ top: 0 });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Someone took the dates while the form was open; the calendar is
        // stale, so refresh it rather than showing a form error.
        setFailure(t("taken"));
        clearDates();
        void loadDays();
      } else {
        setFailure(t("failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  /* --- render ----------------------------------------------------------- */

  const header = (
    <nav className="wrap top-padding bottom-padding bk-bar">
      <h6 className="max bk-brand">Backyard Dejvice</h6>
      <div className="field suffix border small no-margin" style={{ width: "6.5rem" }}>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          aria-label={t("currency")}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <i>arrow_drop_down</i>
      </div>
      <div className="field suffix border small no-margin" style={{ width: "7.5rem" }}>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label={t("language")}
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
        <i>arrow_drop_down</i>
      </div>
      <a className="button transparent" href="/guide">
        <i>menu_book</i>
        <span>{t("nav_welcome")}</span>
      </a>
    </nav>
  );

  if (confirmed) {
    return (
      <div className="beer bk-root">
        <main className="responsive bk-page">
          {header}
          <Confirmation code={confirmed} currency={currency} lang={lang} t={t} />
        </main>
      </div>
    );
  }

  return (
    <div className="beer bk-root">
      <main className="responsive bk-page">
        {header}

        <div className="grid">
          {/* Side by side only on a real desktop. Beer's `m` starts at 601px,
              where a 7/5 split leaves the form too narrow to hold a labelled
              field — the coupon label and the terms line were both cut off. */}
          <div className="s12 m12 l7">
            <article className="round">
              {/* A plain div, not Beer's `nav`: `nav` is chrome — it is sticky
                  and keeps a fixed bar height, so once these three wrapped on a
                  phone they floated free and sat on top of the calendar. */}
              <div className="bk-badges">
                <span className="chip round primary-container">
                  <i>bolt</i>
                  <span>{t("b1")}</span>
                </span>
                <span className="chip round primary-container">
                  <i>handshake</i>
                  <span>{t("b2")}</span>
                </span>
                <span className="chip round primary-container">
                  <i>sell</i>
                  <span>{t("b3")}</span>
                </span>
              </div>

              {bookingEnabled ? (
                <>
                  <BookingCalendar
                    month={month}
                    days={days}
                    checkin={checkin}
                    checkout={checkout}
                    currency={currency}
                    lang={lang}
                    onPick={pick}
                    onMonthChange={(delta) =>
                      setMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1),
                      )
                    }
                  />
                  {checkin && !checkout && (
                    <p className="small-text">
                      {t(
                        "minStayHint",
                        nightsWord(days.get(toDateStr(checkin))?.min_stay ?? 1, lang),
                      )}
                    </p>
                  )}
                </>
              ) : (
                <div className="small-round tertiary-container padding">
                  {t("errNoPlan")}
                </div>
              )}
            </article>
          </div>

          <div className="s12 m12 l5">
            <article className="round">
              <h6>{t("booking")}</h6>

              {checkin ? (
                <p className="no-margin">
                  <strong>
                    {formatLongDate(toDateStr(checkin), lang)}
                    {checkout ? ` – ${formatLongDate(toDateStr(checkout), lang)}` : ""}
                  </strong>{" "}
                  <button className="chip small transparent" onClick={clearDates}>
                    {t("clear")}
                  </button>
                  <br />
                  <span className="small-text">
                    {checkout
                      ? `${nightsWord(nightsBetween(checkin, checkout), lang)} · ${guestsWord(guests, lang)}`
                      : t("pickCheckout")}
                  </span>
                </p>
              ) : (
                <p className="no-margin small-text">{t("pickDates")}</p>
              )}

              <div className="grid margin top">
                <div className="s6 field label suffix border">
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                  <label>{t("guests")}</label>
                  <i>arrow_drop_down</i>
                </div>
                <div className="s6 field label border">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  />
                  <label>{t("coupon")}</label>
                </div>
              </div>

              {quote && (
                <div className="margin top bottom">
                  <PriceSummary quote={quote} currency={currency} lang={lang} t={t} />
                </div>
              )}

              <div className="field label border">
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <label>{t("name")}</label>
              </div>
              <div className="field label border">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label>{t("email")}</label>
              </div>
              <div className="field label border">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                <label>{t("phone")}</label>
              </div>
              <div className="field label border textarea">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} />
                <label>{t("noteLabel")}</label>
              </div>

              <div className="small-text margin top">{t("payment")}</div>
              <div className="bk-pays margin top">
                <div
                  className={`bk-pay ${method === "transfer" ? "bk-on" : ""}`}
                  onClick={() => setMethod("transfer")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setMethod("transfer")}
                >
                  <i className="primary-text">account_balance</i>
                  <div className="bk-pay-name">{t("transfer")}</div>
                  <div className="bk-pay-sub">{t("transferSub")}</div>
                </div>
                <div
                  className={`bk-pay ${method === "revolut" ? "bk-on" : ""}`}
                  onClick={() => setMethod("revolut")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setMethod("revolut")}
                >
                  <i className="primary-text">smartphone</i>
                  <div className="bk-pay-name">{t("revolut")}</div>
                  <div className="bk-pay-sub">{t("revolutSub")}</div>
                </div>
              </div>

              <label className="checkbox bk-terms margin top">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                <span>
                  {t("agree")}{" "}
                  <a data-ui="#terms-dialog" href="#terms-dialog">
                    {t("termsLink")}
                  </a>
                  .
                </span>
              </label>

              <button
                className="responsive margin top"
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                {busy ? <progress className="circle small" /> : <i>lock</i>}
                <span>{t("book")}</span>
              </button>

              {failure && (
                <div className="small-round tertiary-container padding margin top">
                  {failure}
                </div>
              )}
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
