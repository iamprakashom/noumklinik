import type { Tables } from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;
export type Provider = Tables<"providers">;
export type Room = Tables<"rooms">;
export type Service = Tables<"services">;
export type Appointment = Tables<"appointments">;
export type TreatmentRecord = Tables<"treatment_records">;
export type PatientPhoto = Tables<"patient_photos">;
export type ConsentTemplate = Tables<"consent_templates">;
export type PatientConsent = Tables<"patient_consents">;
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
export type Payment = Tables<"payments">;
export type Lead = Tables<"leads">;
export type MessageTemplate = Tables<"message_templates">;
export type AutomationRule = Tables<"automation_rules">;
export type OutboxMessage = Tables<"messages_outbox">;

export const APPOINTMENT_STATUSES = [
  "Booked",
  "Confirmed",
  "Checked-in",
  "Completed",
  "No-show",
  "Cancelled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Consult booked",
  "Converted",
  "Lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const CHANNELS = ["Email", "SMS", "WhatsApp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const LEAD_SOURCES = [
  "Meta Lead Ads",
  "Website",
  "Referral",
  "Walk-in",
  "Google",
  "Instagram",
  "Manual",
] as const;

export const TRIGGER_TYPES = [
  { value: "before_appointment", label: "Before appointment" },
  { value: "after_treatment", label: "After treatment" },
  { value: "no_show", label: "After a no-show" },
  { value: "new_lead", label: "When a lead arrives" },
] as const;

export const INVOICE_STATUSES = ["Draft", "Open", "Paid", "Void"] as const;

export const TEMPERATURES = ["Hot", "Warm", "Cold"] as const;
export type Temperature = (typeof TEMPERATURES)[number];

export const TEMPERATURE_HINT: Record<string, string> = {
  Hot: "Highly interested",
  Warm: "Considering",
  Cold: "Just exploring",
};

export const LEAD_SOURCE_GROUPS = ["Meta Ads", "Google Ads", "Organic", "Referral", "Walk-in"] as const;

export const SOURCE_GROUP_BY_SOURCE: Record<string, string> = {
  "Meta Lead Ads": "Meta Ads",
  Instagram: "Meta Ads",
  Facebook: "Meta Ads",
  WhatsApp: "Meta Ads",
  Google: "Google Ads",
  "Google Ads": "Google Ads",
  Website: "Organic",
  Manual: "Organic",
  Referral: "Referral",
  "Walk-in": "Walk-in",
};

export const APPOINTMENT_SOURCES = [
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Walk-in",
  "Google",
  "Referral",
  "Phone",
] as const;

export function temperatureTone(t: string): StatusTone {
  if (t === "Hot") return "overdue";
  if (t === "Warm") return "progress";
  return "idle";
}

export function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}



export type StatusTone = "completed" | "progress" | "overdue" | "idle";

export function appointmentTone(status: string): StatusTone {
  if (status === "Completed") return "completed";
  if (status === "Checked-in" || status === "Confirmed") return "progress";
  if (status === "No-show" || status === "Cancelled") return "overdue";
  return "idle";
}

export function leadTone(stage: string): StatusTone {
  if (stage === "Converted") return "completed";
  if (stage === "Lost") return "overdue";
  if (stage === "New") return "idle";
  return "progress";
}

export function invoiceTone(status: string): StatusTone {
  if (status === "Paid") return "completed";
  if (status === "Open") return "progress";
  if (status === "Void") return "overdue";
  return "idle";
}

export function patientName(p: { first_name: string; last_name: string }) {
  return `${p.first_name} ${p.last_name}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function money(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = iso.length <= 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: iso.length <= 10 ? "UTC" : undefined,
  });
}

export function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00Z`);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 86_400_000));
}

export function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function addDays(day: Date, n: number) {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d;
}

export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function renderTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? `{{${key}}}`);
}
