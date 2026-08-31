/**
 * What replaces the form once a booking goes through.
 *
 * Its one job beyond saying thank you is getting the guest to pay inside the
 * 48-hour window, so the amount, reference and QR are all here and nothing
 * sends the guest looking elsewhere.
 *
 * Both payment routes are always shown, with no country detection: a Czech
 * guest scans the QR, a foreign one copies the IBAN, and guessing wrong is
 * worse than showing both.
 */

import { useEffect, useState } from "react";
import type { Lang } from "@/i18n/translations";
import {
  fetchPayment,
  fetchReservation,
  qrSrc,
  type PaymentInstructions,
  type Reservation,
} from "@/lib/booking";
import {
  type Currency,
  formatDateTime,
  formatLongDate,
  formatMoney,
  guestsWord,
  nightsWord,
} from "@/lib/currency";

interface Props {
  code: string;
  currency: Currency;
  lang: Lang;
  t: (key: string, ...args: string[]) => string;
}

function Field({
  label,
  value,
  copy,
  mono,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copy?: boolean;
  mono?: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* Without clipboard permission the value is still readable on screen. */
    }
  }

  return (
    <div className="bk-row">
      <span className="bk-label">{label}</span>
      <span className={`bk-value ${mono ? "bk-mono" : ""}`}>
        {value}
        {copy && (
          <button
            className="circle transparent small"
            onClick={onCopy}
            title={done ? copiedLabel : copyLabel}
            aria-label={done ? copiedLabel : copyLabel}
          >
            <i className={done ? "primary-text" : ""}>{done ? "check" : "content_copy"}</i>
          </button>
        )}
      </span>
    </div>
  );
}

export function Confirmation({ code, currency, lang, t }: Props) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payment, setPayment] = useState<PaymentInstructions | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchReservation(code), fetchPayment(code).catch(() => null)])
      .then(([r, p]) => {
        if (!alive) return;
        setReservation(r);
        setPayment(p);
      })
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [code]);

  if (missing) {
    return <article className="round">{t("cUnknown")}</article>;
  }
  if (!reservation) {
    return <progress className="circle large" />;
  }

  const due = payment?.due_at ? new Date(payment.due_at) : null;
  const overdue = due !== null && due < new Date();

  return (
    <div className="bk-done">
      <div className="center-align margin bottom">
        <i className="extra primary-text">check_circle</i>
      </div>

      <h4 className="center-align">{t("thanksTitle")}</h4>
      <p
        className="center-align"
        dangerouslySetInnerHTML={{ __html: t("thanksLead", reservation.public_code) }}
      />

      <article className="round">
        <h6>{t("yourStay")}</h6>
        <Field
          label={t("arrival")}
          value={`${formatLongDate(reservation.checkin, lang)}, ${t("from")} 15:00`}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
        />
        <Field
          label={t("departure")}
          value={`${formatLongDate(reservation.checkout, lang)}, ${t("until")} 11:00`}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
        />
        <Field
          label={t("guests")}
          value={guestsWord(reservation.guests, lang)}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
        />
        <Field
          label={t("stayLength")}
          value={nightsWord(reservation.nights, lang)}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
        />
      </article>

      <article className="round">
        <h6>{t("payTitle")}</h6>

        {payment?.paid ? (
          <div className="small-round primary-container padding">{t("paidAlready")}</div>
        ) : !payment?.payable ? (
          // An invented account number would be worse than admitting the
          // details are coming by e-mail.
          <div className="small-round tertiary-container padding">{t("noDetails")}</div>
        ) : (
          <>
            {overdue ? (
              <div className="small-round tertiary-container padding margin bottom">
                {t("payLate")}
              </div>
            ) : (
              <p className="no-margin small-text">
                {t("payBy", formatDateTime(payment.due_at as string, lang))}
              </p>
            )}

            <div className="grid margin top">
              {payment.qr_url && (
                <div className="s12 m4 center-align">
                  <img className="bk-qr" src={qrSrc(code)} alt="QR" />
                  <div className="small-text margin top">{t("qrHint")}</div>
                </div>
              )}
              <div className={payment.qr_url ? "s12 m8" : "s12"}>
                <div className="bk-row">
                  <span className="bk-label">{t("fAmount")}</span>
                  <span className="bk-value bk-total">
                    {formatMoney(payment.amount_czk, currency)}
                  </span>
                </div>
                <Field
                  label={t("fVs")}
                  value={payment.variable_symbol}
                  mono
                  copy
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
                {payment.bank?.account && (
                  <Field
                    label={t("fAccount")}
                    value={payment.bank.account}
                    mono
                    copy
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                  />
                )}
                {payment.bank?.iban && (
                  <Field
                    label={t("fIban")}
                    value={payment.bank.iban}
                    mono
                    copy
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                  />
                )}
                {payment.bank?.holder && (
                  <Field
                    label={t("fHolder")}
                    value={payment.bank.holder}
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                  />
                )}
                <Field
                  label={t("fMessage")}
                  value={payment.message}
                  mono
                  copy
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
                {payment.revolut_url && (
                  <div className="bk-row">
                    <span className="bk-label">Revolut</span>
                    <span className="bk-value">
                      <a href={payment.revolut_url} target="_blank" rel="noreferrer">
                        {payment.revolut_url.replace(/^https?:\/\//, "")}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </article>

      <article className="round">
        <h6>{t("nextTitle")}</h6>
        <ol className="bk-steps">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
          <li>{t("step4")}</li>
        </ol>
      </article>

      <article className="round">
        <h6>{t("contactTitle")}</h6>
        <p className="no-margin">{t("contactLead")}</p>
        <p className="small-text">{t("keepCode")}</p>
      </article>
    </div>
  );
}
