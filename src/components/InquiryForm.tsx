import { useState, useEffect, useMemo } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { CalendarDays, Send, Users, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type BlockedRange,
  type AvailabilityData,
  isDateBlocked,
  isRangeAvailable,
  getMaxCheckout,
  toDateStr,
} from "@/lib/availability";

interface InquiryFormProps {
  t: (key: string) => string;
  onClose: () => void;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function useAvailability() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result = await apiGet<AvailabilityData>("/api/availability");
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export default function InquiryForm({ t, onClose }: InquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const { data: availability, loading: availLoading, error: availError } = useAvailability();
  const blockedRanges = availability?.blockedRanges ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInStr = checkInDate ? toDateStr(checkInDate) : "";
  const checkOutStr = checkOutDate ? toDateStr(checkOutDate) : "";

  // Compute disabled dates for check-in picker
  const disabledCheckInDays = useMemo(() => {
    const matchers: Array<Date | { from: Date; to: Date } | ((date: Date) => boolean)> = [];
    matchers.push((date: Date) => {
      const str = toDateStr(date);
      return isDateBlocked(str, blockedRanges);
    });
    return matchers;
  }, [blockedRanges]);

  // Compute max checkout and disabled dates for check-out picker
  const maxCheckoutStr = checkInStr ? getMaxCheckout(checkInStr, blockedRanges) : null;

  const disabledCheckOutDays = useMemo(() => {
    const matchers: Array<((date: Date) => boolean)> = [];
    matchers.push((date: Date) => {
      if (!checkInDate) return true;
      const str = toDateStr(date);
      // Must be at least 2 nights after check-in
      const minCheckout = new Date(checkInDate);
      minCheckout.setDate(minCheckout.getDate() + 2);
      if (date < minCheckout) return true;
      // Cannot be past the next blocked range start
      if (maxCheckoutStr && str > maxCheckoutStr) return true;
      return false;
    });
    return matchers;
  }, [checkInDate, maxCheckoutStr, blockedRanges]);

  // Reset checkout when check-in changes
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const ciStr = toDateStr(checkInDate);
      const coStr = toDateStr(checkOutDate);
      if (coStr <= ciStr || !isRangeAvailable(ciStr, coStr, blockedRanges)) {
        setCheckOutDate(undefined);
      }
    }
  }, [checkInDate]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("inquiry_required");
    if (!email.trim()) errs.email = t("inquiry_required");
    else if (!isValidEmail(email)) errs.email = t("inquiry_invalid_email");
    if (!checkInStr) errs.checkIn = t("inquiry_required");
    if (!checkOutStr) errs.checkOut = t("inquiry_required");
    if (checkInStr && checkOutStr) {
      const nights = Math.round(
        (new Date(checkOutStr).getTime() - new Date(checkInStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (nights < 2) errs.checkOut = t("inquiry_min_nights");
      if (!isRangeAvailable(checkInStr, checkOutStr, blockedRanges)) {
        errs.checkOut = t("inquiry_dates_conflict");
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (availError || availLoading) return;
    if (!validate()) return;
    setStatus("sending");

    try {
      await apiPost("/api/inquiry", {
        guestName: name.trim(),
        guestEmail: email.trim(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        notes: notes.trim() || undefined,
      });

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-8 px-4">
        <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
        <p className="text-sm text-foreground leading-relaxed">{t("inquiry_success")}</p>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          OK
        </button>
      </div>
    );
  }

  const formDisabled = availError || availLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
        <Users size={14} className="shrink-0" />
        <span>{t("inquiry_max_guests")}</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{t("inquiry_desc")}</p>

      {/* Availability status */}
      {availLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Loader2 size={14} className="animate-spin" />
          <span>{t("inquiry_availability_loading")}</span>
        </div>
      )}
      {availError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />
          <span>{t("inquiry_availability_error")}</span>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">{t("inquiry_name")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={255}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">{t("inquiry_email")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={255}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        {/* Check-in */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            <CalendarDays size={12} className="inline mr-1" />
            {t("inquiry_checkin")}
          </label>
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={formDisabled}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-left focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
                  !checkInDate && "text-muted-foreground"
                )}
              >
                {checkInDate ? format(checkInDate, "d.M.yyyy") : t("inquiry_select_checkin")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={(date) => {
                  setCheckInDate(date);
                  setCheckInOpen(false);
                }}
                disabled={[
                  { before: today },
                  ...disabledCheckInDays,
                ]}
                modifiers={{ blocked: (date: Date) => isDateBlocked(toDateStr(date), blockedRanges) }}
                modifiersClassNames={{ blocked: "!bg-destructive/20 !text-destructive line-through" }}
                className="p-3 pointer-events-auto"
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.checkIn && <p className="text-xs text-destructive mt-1">{errors.checkIn}</p>}
        </div>

        {/* Check-out */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            <CalendarDays size={12} className="inline mr-1" />
            {t("inquiry_checkout")}
          </label>
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={formDisabled || !checkInDate}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-left focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
                  !checkOutDate && "text-muted-foreground"
                )}
              >
                {checkOutDate ? format(checkOutDate, "d.M.yyyy") : t("inquiry_select_checkout")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={(date) => {
                  setCheckOutDate(date);
                  setCheckOutOpen(false);
                }}
                disabled={disabledCheckOutDays}
                defaultMonth={checkInDate}
                modifiers={{ blocked: (date: Date) => isDateBlocked(toDateStr(date), blockedRanges) }}
                modifiersClassNames={{ blocked: "!bg-destructive/20 !text-destructive line-through" }}
                className="p-3 pointer-events-auto"
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.checkOut && <p className="text-xs text-destructive mt-1">{errors.checkOut}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">{t("inquiry_notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("inquiry_notes_placeholder")}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />
          <span>{t("inquiry_error")}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending" || formDisabled}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Send size={14} />
        {status === "sending" ? t("inquiry_sending") : t("inquiry_submit")}
      </button>
    </form>
  );
}
