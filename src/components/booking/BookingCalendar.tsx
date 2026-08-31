/**
 * Two-month calendar with a price on every free night.
 *
 * Previo does not show prices in its date picker; Airbnb does. Putting the
 * price on the day is the one thing that lets a small site beat an OTA
 * visually, so it is the centrepiece rather than a detail.
 *
 * Hover is an outline only, never a fill — the same restraint Airbnb uses, so
 * that hovering never looks like selecting.
 */

import { useMemo } from "react";
import type { Lang } from "@/i18n/translations";
import {
  canCheckout,
  toDateStr,
  type AvailabilityDay,
} from "@/lib/booking";
import {
  type Currency,
  formatMoneyBare,
  monthLabel,
  weekdayLabels,
} from "@/lib/currency";

interface Props {
  month: Date;
  days: Map<string, AvailabilityDay>;
  checkin: Date | null;
  checkout: Date | null;
  currency: Currency;
  lang: Lang;
  onPick: (date: Date) => void;
  onMonthChange: (delta: number) => void;
}

interface Cell {
  key: string;
  day: number;
  price: string | null;
  state: "blank" | "selectable" | "off" | "selected" | "between";
}

function buildCells(
  month: Date,
  days: Map<string, AvailabilityDay>,
  checkin: Date | null,
  checkout: Date | null,
  currency: Currency,
): Cell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = toDateStr(new Date());

  const cells: Cell[] = Array.from({ length: lead }, (_, i) => ({
    key: `blank-${i}`,
    day: 0,
    price: null,
    state: "blank" as const,
  }));

  for (let n = 1; n <= count; n += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), n);
    const key = toDateStr(date);
    const info = days.get(key);
    const free = Boolean(info?.free) && key >= today;

    // Once a check-in is picked, only valid check-out days stay clickable —
    // that is how the minimum stay becomes visible instead of being an error
    // message after the fact.
    let selectable = free;
    if (selectable && checkin && !checkout) selectable = canCheckout(days, checkin, date);

    let state: Cell["state"] = selectable ? "selectable" : "off";
    if ((checkin && key === toDateStr(checkin)) || (checkout && key === toDateStr(checkout))) {
      state = "selected";
    } else if (checkin && checkout && key > toDateStr(checkin) && key < toDateStr(checkout)) {
      state = "between";
    }

    cells.push({
      key,
      day: n,
      price:
        info?.free && info.price_czk ? formatMoneyBare(info.price_czk, currency) : null,
      state,
    });
  }
  return cells;
}

function MonthGrid({
  month,
  cells,
  weekdays,
  label,
  onPick,
}: {
  month: Date;
  cells: Cell[];
  weekdays: string[];
  label: string;
  onPick: (d: Date) => void;
}) {
  return (
    <div className="bk-month">
      <div className="bk-month-name">{label}</div>
      <div className="bk-grid">
        {weekdays.map((w) => (
          <div key={w} className="bk-dow">
            {w}
          </div>
        ))}
        {cells.map((cell) =>
          cell.state === "blank" ? (
            <div key={cell.key} />
          ) : (
            <button
              key={cell.key}
              type="button"
              className={`bk-day bk-${cell.state}`}
              disabled={cell.state === "off"}
              aria-label={cell.key}
              onClick={() => onPick(new Date(`${cell.key}T00:00:00`))}
            >
              <span className="bk-num">{cell.day}</span>
              {cell.price && <span className="bk-price">{cell.price}</span>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function BookingCalendar({
  month,
  days,
  checkin,
  checkout,
  currency,
  lang,
  onPick,
  onMonthChange,
}: Props) {
  const next = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    [month],
  );
  const weekdays = useMemo(() => weekdayLabels(lang), [lang]);
  const cellsA = useMemo(
    () => buildCells(month, days, checkin, checkout, currency),
    [month, days, checkin, checkout, currency],
  );
  const cellsB = useMemo(
    () => buildCells(next, days, checkin, checkout, currency),
    [next, days, checkin, checkout, currency],
  );

  const thisMonth = new Date();
  const atStart =
    month.getFullYear() === thisMonth.getFullYear() &&
    month.getMonth() === thisMonth.getMonth();

  return (
    <div className="bk-calendar">
      <nav className="bk-cal-head">
        <button
          className="circle transparent"
          disabled={atStart}
          onClick={() => onMonthChange(-1)}
          aria-label="←"
        >
          <i>arrow_back</i>
        </button>
        <div className="max" />
        <button
          className="circle transparent"
          onClick={() => onMonthChange(1)}
          aria-label="→"
        >
          <i>arrow_forward</i>
        </button>
      </nav>

      <div className="bk-months">
        <MonthGrid
          month={month}
          cells={cellsA}
          weekdays={weekdays}
          label={monthLabel(month, lang)}
          onPick={onPick}
        />
        <MonthGrid
          month={next}
          cells={cellsB}
          weekdays={weekdays}
          label={monthLabel(next, lang)}
          onPick={onPick}
        />
      </div>
    </div>
  );
}
