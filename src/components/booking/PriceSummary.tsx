/**
 * The price, broken down the way Previo does it: nights listed one by one,
 * cleaning and city tax on their own lines.
 *
 * Showing the city tax separately is not a trick to make the price look
 * smaller — it is money that goes to the municipality, not to the host, and
 * naming it is the honest way to present it.
 */

import type { Lang } from "@/i18n/translations";
import type { Quote } from "@/lib/booking";
import {
  type Currency,
  formatMoney,
  formatShortDate,
  getRatesInfo,
  nightsWord,
} from "@/lib/currency";

/** The direct price is anchored at this share of the OTA price (see PMS). */
const DIRECT_RATIO = 0.9225;

interface Props {
  quote: Quote;
  currency: Currency;
  lang: Lang;
  t: (key: string, ...args: string[]) => string;
}

export function PriceSummary({ quote, currency, lang, t }: Props) {
  const errorKeys: Record<string, string> = {
    occupied: "errOccupied",
    min_stay: "errMinStay",
    past: "errPast",
    no_plan: "errNoPlan",
    bad_range: "errRange",
  };
  const couponReasons: Record<string, string> = {
    unknown: "cUnknown",
    expired: "cExpired",
    not_yet_valid: "cNotYet",
    exhausted: "cUsed",
    too_short: "cShort",
    inactive: "cInactive",
    below_floor: "cFloor",
  };

  if (quote.errors.length > 0) {
    return (
      <div className="small-round tertiary-container padding">
        {quote.errors
          .map((e) =>
            e === "min_stay"
              ? t("errMinStay", nightsWord(quote.min_stay, lang))
              : t(errorKeys[e] ?? e),
          )
          .join(" ")}
      </div>
    );
  }

  const ota = quote.total_czk / DIRECT_RATIO;
  const rates = getRatesInfo();

  return (
    <div>
      <div className="bk-nightly">
        {quote.nightly.map((n) => (
          <div className="bk-row" key={n.date}>
            <span className="bk-label">{formatShortDate(n.date, lang)}</span>
            <span className="bk-value">{formatMoney(n.price_czk, currency)}</span>
          </div>
        ))}
      </div>

      <div className="bk-row">
        <span className="bk-label">
          {t("accommodation")} · {nightsWord(quote.nights, lang)}
        </span>
        <span className="bk-value">{formatMoney(quote.accommodation_czk, currency)}</span>
      </div>

      <div className="bk-row">
        <span className="bk-label">{t("cleaning")}</span>
        <span className="bk-value">{formatMoney(quote.cleaning_fee_czk, currency)}</span>
      </div>

      {quote.discount_czk > 0 && quote.coupon && (
        <div className="bk-row bk-discount">
          <span className="bk-label bk-discount">
            {t("discount")} {Math.round(quote.coupon.discount_pct * 100)} %
          </span>
          <span className="bk-value">−{formatMoney(quote.discount_czk, currency)}</span>
        </div>
      )}

      <div className="bk-row">
        <span className="bk-label">{t("cityTax")}</span>
        <span className="bk-value">{formatMoney(quote.city_tax_czk, currency)}</span>
      </div>

      <div className="bk-row">
        <span className="bk-label bk-total">{t("total")}</span>
        <span className="bk-value bk-total">{formatMoney(quote.total_czk, currency)}</span>
      </div>

      <div
        className="small-round primary-container padding margin top"
        style={{ fontSize: "0.8rem" }}
        // The comparison is the whole argument for booking direct, and it is
        // arithmetic from the commission — not a marketing claim.
        dangerouslySetInnerHTML={{
          __html: t(
            "compare",
            formatMoney(ota, currency),
            formatMoney(ota - quote.total_czk, currency),
          ),
        }}
      />

      {currency !== "CZK" && (
        <div className="small-text margin top" style={{ opacity: 0.7 }}>
          {t("fxNote")}
          {rates?.date ? ` ${rates.source} ${rates.date}` : ""}
        </div>
      )}

      {quote.coupon && !quote.coupon.valid && (
        <div className="small-round tertiary-container padding margin top">
          {t(couponReasons[quote.coupon.reason ?? ""] ?? "cUnknown")}
        </div>
      )}
    </div>
  );
}
