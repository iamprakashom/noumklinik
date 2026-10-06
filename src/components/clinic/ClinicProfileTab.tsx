import { useEffect, useState } from "react";
import { toast } from "sonner";
import { primaryButton } from "@/components/clinic/AppShell";
import { Field, Panel, inputClass, textareaClass } from "@/components/clinic/bits";
import { INDIAN_STATES, isValidGstin, stateCode } from "@/lib/gst";
import { useClinicProfile, useUpdateClinicProfile } from "@/lib/clinic-data";
import type { ClinicProfile } from "@/data/clinic";
import {
  DAYS_OF_WEEK,
  DEFAULT_WORKING_DAYS,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
} from "@/lib/clinic-hours";

const FIELDS = [
  "legal_name",
  "trade_name",
  "gstin",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "pincode",
  "phone",
  "email",
  "invoice_prefix",
  "google_review_link",
  "declaration",
  "open_time",
  "close_time",
] as const;

type FormState = Record<(typeof FIELDS)[number], string>;

const blank = Object.fromEntries(FIELDS.map((f) => [f, ""])) as FormState;

/** Legal and tax identity printed on every GST invoice. */
export function ClinicProfileTab() {
  const profile = useClinicProfile();
  const update = useUpdateClinicProfile();
  const [form, setForm] = useState<FormState>(blank);
  const [workingDays, setWorkingDays] = useState<string[]>(DEFAULT_WORKING_DAYS);

  useEffect(() => {
    if (!profile.data) return;
    const row: ClinicProfile = profile.data;
    const next = { ...blank };
    for (const f of FIELDS) next[f] = String(row[f as keyof ClinicProfile] ?? "");
    if (!next.open_time) next.open_time = DEFAULT_OPEN_TIME;
    if (!next.close_time) next.close_time = DEFAULT_CLOSE_TIME;
    setForm(next);

    const workingDaysVal = row.working_days;
    if (Array.isArray(workingDaysVal)) {
      setWorkingDays(workingDaysVal as string[]);
    } else {
      setWorkingDays(DEFAULT_WORKING_DAYS);
    }
  }, [profile.data]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const gstinBad = form.gstin.length > 0 && !isValidGstin(form.gstin);

  const clinicId = profile.data?.clinic_id;
  const bookingUrl =
    clinicId && typeof window !== "undefined"
      ? `${window.location.origin}/app/book?c=${clinicId}`
      : null;

  return (
    <Panel title="Clinic profile">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (gstinBad) {
            toast.error("That GSTIN doesn't look valid");
            return;
          }
          const openTime = form.open_time || DEFAULT_OPEN_TIME;
          const closeTime = form.close_time || DEFAULT_CLOSE_TIME;
          if (openTime >= closeTime) {
            toast.error("Opening time must be earlier than closing time");
            return;
          }
          const id = profile.data?.id ?? null;
          const values: Record<string, unknown> = {
            ...form,
            working_days: workingDays,
            open_time: openTime,
            close_time: closeTime,
            gstin: form.gstin.toUpperCase() || null,
            state: form.state || "Karnataka",
            state_code: stateCode(form.state) ?? "",
            invoice_prefix: form.invoice_prefix || "INV",
          };
          update.mutate(
            { id, values },
            {
              onSuccess: () => toast.success("Clinic profile saved"),
              onError: (err) => toast.error(err.message),
            },
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name">
            <input
              required
              className={inputClass}
              value={form.legal_name}
              onChange={(e) => set("legal_name")(e.target.value)}
            />
          </Field>
          <Field label="Trade name">
            <input
              className={inputClass}
              value={form.trade_name}
              onChange={(e) => set("trade_name")(e.target.value)}
            />
          </Field>
          <Field label={gstinBad ? "GSTIN — 15 characters, e.g. 29ABCDE1234F1Z5" : "GSTIN"}>
            <input
              className={`${inputClass} uppercase ${gstinBad ? "border-status-overdue" : ""}`}
              value={form.gstin}
              maxLength={15}
              onChange={(e) => set("gstin")(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Address line 1">
            <input
              className={inputClass}
              value={form.address_line1}
              onChange={(e) => set("address_line1")(e.target.value)}
            />
          </Field>
          <Field label="Address line 2">
            <input
              className={inputClass}
              value={form.address_line2}
              onChange={(e) => set("address_line2")(e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => set("city")(e.target.value)}
            />
          </Field>
          <Field label="State (default place of supply)">
            <select
              className={inputClass}
              value={form.state}
              onChange={(e) => set("state")(e.target.value)}
            >
              <option value="">Select state…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="PIN code">
            <input
              className={inputClass}
              value={form.pincode}
              maxLength={6}
              onChange={(e) => set("pincode")(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          </Field>
          <Field label="Invoice prefix">
            <input
              className={inputClass}
              value={form.invoice_prefix}
              onChange={(e) => set("invoice_prefix")(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Google review link">
            <input
              type="url"
              placeholder="https://g.page/r/…/review"
              className={inputClass}
              value={form.google_review_link}
              onChange={(e) => set("google_review_link")(e.target.value)}
            />
          </Field>
          <p className="-mt-1 text-xs text-muted-foreground sm:col-span-2">
            Patients who rate you 4–5 after a visit are sent straight to this link. Lower ratings
            stay in-house as a complaint for the front desk.
          </p>
          <Field label="Opening time">
            <input
              type="time"
              className={inputClass}
              value={form.open_time}
              onChange={(e) => set("open_time")(e.target.value)}
            />
          </Field>
          <Field label="Closing time">
            <input
              type="time"
              className={inputClass}
              value={form.close_time}
              onChange={(e) => set("close_time")(e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Working days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const active = workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  aria-pressed={active}
                  onClick={() => {
                    if (active) {
                      setWorkingDays(workingDays.filter((d) => d !== day));
                    } else {
                      setWorkingDays([...workingDays, day]);
                    }
                  }}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Declaration">
          <textarea
            rows={2}
            className={textareaClass}
            value={form.declaration}
            onChange={(e) => set("declaration")(e.target.value)}
          />
        </Field>

        <button type="submit" className={`${primaryButton} w-fit`} disabled={update.isPending}>
          Save clinic profile
        </button>
      </form>

      {bookingUrl ? (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm font-medium">Your booking link</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this with patients — requests land in Appointments → Booking requests for this
            clinic only.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly className={inputClass} value={bookingUrl} />
            <button
              type="button"
              className={primaryButton}
              onClick={() => {
                void navigator.clipboard.writeText(bookingUrl);
                toast.success("Booking link copied");
              }}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
