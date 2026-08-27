import { useEffect, useState } from "react";
import { toast } from "sonner";
import { primaryButton } from "@/components/clinic/AppShell";
import { Field, Panel, inputClass, textareaClass } from "@/components/clinic/bits";
import { INDIAN_STATES, isValidGstin, stateCode } from "@/lib/gst";
import { useClinicProfile, useUpdateClinicProfile } from "@/lib/clinic-data";

const FIELDS = [
  "legal_name",
  "trade_name",
  "gstin",
  "pan",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "pincode",
  "phone",
  "email",
  "invoice_prefix",
  "declaration",
] as const;

type FormState = Record<(typeof FIELDS)[number], string>;

const blank = Object.fromEntries(FIELDS.map((f) => [f, ""])) as FormState;

/** Legal and tax identity printed on every GST invoice. */
export function ClinicProfileTab() {
  const profile = useClinicProfile();
  const update = useUpdateClinicProfile();
  const [form, setForm] = useState<FormState>(blank);

  useEffect(() => {
    if (!profile.data) return;
    const next = { ...blank };
    for (const f of FIELDS) next[f] = (profile.data[f] as string | null) ?? "";
    setForm(next);
  }, [profile.data]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const gstinBad = form.gstin.length > 0 && !isValidGstin(form.gstin);

  return (
    <Panel title="Clinic profile" description="Appears on tax invoices and credit notes.">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const id = profile.data?.id;
          if (!id) return;
          if (gstinBad) {
            toast.error("That GSTIN doesn't look valid");
            return;
          }
          update.mutate(
            {
              id,
              values: {
                ...form,
                gstin: form.gstin.toUpperCase() || null,
                pan: form.pan.toUpperCase() || null,
                state_code: stateCode(form.state) ?? "",
              },
            },
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
          <Field label="GSTIN" hint={gstinBad ? "15 characters, e.g. 29ABCDE1234F1Z5" : undefined}>
            <input
              className={`${inputClass} uppercase ${gstinBad ? "border-status-overdue" : ""}`}
              value={form.gstin}
              maxLength={15}
              onChange={(e) => set("gstin")(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="PAN">
            <input
              className={`${inputClass} uppercase`}
              value={form.pan}
              maxLength={10}
              onChange={(e) => set("pan")(e.target.value.toUpperCase())}
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
          <Field label="State" hint="Sets the default place of supply">
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
          <Field label="Invoice prefix" hint="Numbering stays gapless per financial year">
            <input
              className={inputClass}
              value={form.invoice_prefix}
              onChange={(e) => set("invoice_prefix")(e.target.value.toUpperCase())}
            />
          </Field>
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
    </Panel>
  );
}
