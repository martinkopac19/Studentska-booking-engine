export interface TemplateEntry<TData = Record<string, unknown>> {
  renderHtml: (data: TData) => string;
  renderText: (data: TData) => string;
  subject: string | ((data: TData) => string);
  /** When set, this address always wins over a caller-supplied recipient. */
  to?: string;
  displayName?: string;
  previewData?: TData;
}

import { template as bookingConfirmation } from "./booking-confirmation.js";
import { template as bookingOwnerAlert } from "./booking-owner-alert.js";
import { template as bookingPaymentReminder } from "./booking-payment-reminder.js";
import { template as inquiryNotification } from "./inquiry-notification.js";

export const TEMPLATES: Record<string, TemplateEntry<any>> = {
  "inquiry-notification": inquiryNotification,
  "booking-confirmation": bookingConfirmation,
  "booking-owner-alert": bookingOwnerAlert,
  "booking-payment-reminder": bookingPaymentReminder,
};

export function resolveSubject<TData>(
  template: TemplateEntry<TData>,
  data: TData,
): string {
  return typeof template.subject === "function"
    ? template.subject(data)
    : template.subject;
}
