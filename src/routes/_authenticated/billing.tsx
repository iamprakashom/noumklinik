import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Link2, Package as PackageIcon, Plus, Sparkles, Trash2, Undo2 } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, StatCard, inputClass } from "@/components/clinic/bits";
import { InvoiceDocument } from "@/components/clinic/InvoiceDocument";
import { SellPackageDialog } from "@/components/clinic/SellPackageDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, invoiceTone, money, patientName } from "@/data/clinic";
import type { Invoice } from "@/data/clinic";
import { INDIAN_STATES, computeGstTotals } from "@/lib/gst";
import {
  unusedValue,
  usePatientPackageItems,
  usePatientPackages,
  useAddonDiscountRules,
  useClinicProfile,
  useCreateCreditNote,
  useCreateInvoice,
  useInsert,
  useInvoiceItems,
  useInvoices,
  usePatients,
  usePayments,
  useServiceAddons,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";
import { createInvoicePaymentLink } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Noum Klinik" },
      {
        name: "description",
        content:
          "Raise GST tax invoices with CGST/SGST split, SAC codes and sequential numbering, collect UPI or EMI payments and track balances.",
      },
      { property: "og:title", content: "Billing — Noum Klinik" },
      {
        property: "og:description",
        content: "GST invoices, credit notes, payment links and outstanding balances for the clinic.",
      },
    ],
  }),
  component: BillingPage,
});

type Line = {
  description: string;
  quantity: number | "";
  unit_price: number | "";
  gst_rate: number | "";
  sac_code: string;
};

const emptyLine: Line = { description: "", quantity: 1, unit_price: 0, gst_rate: 18, sac_code: "999722" };

function BillingPage() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [discount, setDiscount] = useState<number | "">(0);
  const [patientId, setPatientId] = useState("");
  const [pos, setPos] = useState("");
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [sellOpen, setSellOpen] = useState(false);

  const invoices = useInvoices();
  const items = useInvoiceItems();
  const payments = usePayments();
  const patients = usePatients();
  const services = useServices();
  const addons = useServiceAddons();
  const rules = useAddonDiscountRules();
  const clinic = useClinicProfile();
  const patientPackages = usePatientPackages();
  const packageItems = usePatientPackageItems();
  const createInvoice = useCreateInvoice();
  const creditNote = useCreateCreditNote();
  const addPayment = useInsert("payments");
  const updateInvoice = useUpdate("invoices");
  const makeLink = useServerFn(createInvoicePaymentLink);

  const all = invoices.data ?? [];
  const outstanding = all
    .filter((i) => i.status === "Open")
    .reduce((s, i) => s + Number(i.total), 0);
  const collected = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const patientOf = (id: string) => {
    const p = patients.data?.find((x) => x.id === id);
    return p ? patientName(p) : "Unknown";
  };

  const selectedPatient = patients.data?.find((p) => p.id === patientId) ?? null;
  const clinicState = clinic.data?.state ?? "";
  const placeOfSupply = pos || selectedPatient?.state || clinicState;
  const interState = Boolean(placeOfSupply && clinicState && placeOfSupply !== clinicState);

  const mainService = services.data?.find((s) => s.name === lines[0]?.description);
  const suggestedAddons = useMemo(() => {
    if (!mainService) return [];
    const ids = (addons.data ?? [])
      .filter((a) => a.main_service_id === mainService.id)
      .map((a) => a.addon_service_id);
    return (services.data ?? []).filter(
      (s) => ids.includes(s.id) && !lines.some((l) => l.description === s.name),
    );
  }, [mainService, addons.data, services.data, lines]);

  const sanitizedLines = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        quantity: l.quantity === "" ? 1 : Number(l.quantity),
        unit_price: l.unit_price === "" ? 0 : Number(l.unit_price),
        gst_rate: l.gst_rate === "" ? 0 : Number(l.gst_rate),
      })),
    [lines],
  );

  const totals = useMemo(
    () => computeGstTotals(sanitizedLines, discount === "" ? 0 : discount, interState),
    [sanitizedLines, discount, interState],
  );
  const addonCount = Math.max(0, lines.filter((l) => l.description).length - 1);

  /** Best matching bundle discount for the current line-up. */
  const bundleRule = useMemo(() => {
    const eligible = (rules.data ?? []).filter(
      (r) =>
        r.active &&
        addonCount >= r.min_addons &&
        (!r.main_service_id || r.main_service_id === mainService?.id),
    );
    let best: { name: string; value: number } | null = null;
    for (const r of eligible) {
      const value =
        r.discount_type === "percent"
          ? (totals.subtotal * Number(r.discount_value)) / 100
          : Number(r.discount_value);
      if (!best || value > best.value) best = { name: r.name, value: Math.round(value) };
    }
    return best;
  }, [rules.data, addonCount, mainService?.id, totals.subtotal]);

  const gstinMissing = !clinic.data?.gstin;

  /** Unused prepaid balance per live package, grouped by expiry month. */
  const liability = useMemo(() => {
    const live = (patientPackages.data ?? []).filter((p) => p.status !== "Refunded");
    const rows = live
      .map((p) => {
        const items = (packageItems.data ?? []).filter((i) => i.patient_package_id === p.id);
        return { pkg: p, unused: unusedValue(items) };
      })
      .filter((r) => r.unused > 0);
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const key = r.pkg.expires_at.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + r.unused);
    }
    return {
      total: rows.reduce((s, r) => s + r.unused, 0),
      count: rows.length,
      months: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [patientPackages.data, packageItems.data]);

  return (
    <AppShell
      title="Billing"
      subtitle="GST invoices, payments and balances"
      actions={
        <div className="flex gap-2">
          <button className={ghostButton} onClick={() => setSellOpen(true)}>
            <PackageIcon className="size-3.5" /> Sell package
          </button>
          <button className={primaryButton} onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New invoice
          </button>
        </div>
      }
    >
      {gstinMissing ? (
        <div className="mb-4 rounded-lg border border-status-overdue/30 bg-status-overdue-soft px-4 py-3 text-xs text-status-overdue">
          No GSTIN saved yet — add the clinic's GSTIN and address in Settings → Clinic so invoices
          are GST-compliant.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={money(outstanding)}
          hint={`${all.filter((i) => i.status === "Open").length} open invoices`}
        />
        <StatCard label="Collected" value={money(collected)} hint={`${payments.data?.length ?? 0} payments`} />
        <StatCard label="Invoices" value={all.length} />
        <StatCard
          label="Prepaid liability"
          value={money(liability.total)}
          hint={`${liability.count} live packages`}
        />
      </div>

      {liability.months.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Unused prepaid balance by expiry month</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {liability.months.map(([month, value]) => (
              <li key={month} className="flex justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <span className="tabular-nums">{money(value)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        {all.length === 0 ? (
          <div className="p-6">
            <EmptyState>No invoices yet.</EmptyState>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Issued</th>
                <th className="px-5 py-3 text-right font-medium">Tax</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {all.map((inv) => {
                const lineItems = (items.data ?? []).filter((i) => i.invoice_id === inv.id);
                return (
                  <tr key={inv.id} className="transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3 tabular-nums">
                      {inv.number}
                      {inv.doc_type === "credit_note" ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">CN</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">{patientOf(inv.patient_id)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {lineItems.map((i) => i.description).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {money(inv.tax)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(inv.total)}</td>
                    <td className="px-5 py-3">
                      <Chip tone={invoiceTone(inv.status)}>{inv.status}</Chip>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          className={ghostButton}
                          onClick={() => setPreview(inv)}
                          aria-label={`View invoice ${inv.number}`}
                        >
                          <FileText className="size-3.5" /> View
                        </button>
                        {inv.status === "Open" ? (
                          <>
                            <button
                              className={ghostButton}
                              onClick={() =>
                                toast.promise(
                                  makeLink({ data: { invoiceId: inv.id } }).then((r) => {
                                    void navigator.clipboard?.writeText(r.url);
                                    return r;
                                  }),
                                  {
                                    loading: "Creating payment link…",
                                    success: (r: { provider: string }) =>
                                      `${r.provider} link copied — UPI & EMI enabled`,
                                    error: (e: Error) => e.message,
                                  },
                                )
                              }
                            >
                              <Link2 className="size-3.5" /> Payment link
                            </button>
                            <button
                              className={ghostButton}
                              onClick={() =>
                                addPayment.mutate(
                                  {
                                    invoice_id: inv.id,
                                    amount: Number(inv.total),
                                    method: "Cash",
                                    status: "Paid",
                                  },
                                  {
                                    onSuccess: () =>
                                      updateInvoice.mutate(
                                        { id: inv.id, values: { status: "Paid" } },
                                        { onSuccess: () => toast.success("Payment recorded") },
                                      ),
                                    onError: (e) => toast.error(e.message),
                                  },
                                )
                              }
                            >
                              Record payment
                            </button>
                          </>
                        ) : null}
                        {inv.doc_type === "invoice" && inv.status !== "Void" ? (
                          <button
                            className={ghostButton}
                            onClick={() => {
                              const reason = window.prompt("Reason for the credit note?");
                              if (!reason) return;
                              creditNote.mutate(
                                {
                                  invoice: inv,
                                  items: (items.data ?? []).filter((i) => i.invoice_id === inv.id),
                                  reason,
                                },
                                {
                                  onSuccess: () => toast.success("Credit note issued"),
                                  onError: (e) => toast.error(e.message),
                                },
                              );
                            }}
                          >
                            <Undo2 className="size-3.5" /> Credit note
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <SellPackageDialog open={sellOpen} onOpenChange={setSellOpen} />

      <InvoiceDocument
        invoice={preview}
        items={(items.data ?? []).filter((i) => i.invoice_id === preview?.id)}
        patient={patients.data?.find((p) => p.id === preview?.patient_id) ?? null}
        clinic={clinic.data ?? null}
        open={Boolean(preview)}
        onOpenChange={(v) => !v && setPreview(null)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New GST invoice</DialogTitle>
          </DialogHeader>
          <form
            id="new-invoice"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              createInvoice.mutate(
                {
                  patient_id: patientId,
                  items: sanitizedLines.filter((l) => l.description),
                  discount: discount === "" ? 0 : discount,
                  clinic: clinic.data ?? null,
                  placeOfSupply: placeOfSupply || null,
                },
                {
                  onSuccess: () => {
                    toast.success("Invoice created");
                    setLines([{ ...emptyLine }]);
                    setDiscount(0 as number | "");
                    setOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Patient">
                <select
                  required
                  className={inputClass}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="">Select patient…</option>
                  {patients.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {patientName(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Place of supply">
                <select
                  className={inputClass}
                  value={placeOfSupply}
                  onChange={(e) => setPos(e.target.value)}
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Line items</span>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_60px_90px_70px_auto] sm:items-center">
                  <select
                    value={line.description}
                    onChange={(e) => {
                      const service = services.data?.find((s) => s.name === e.target.value);
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx
                            ? {
                                ...l,
                                description: e.target.value,
                                unit_price: service ? Number(service.price) : l.unit_price,
                                gst_rate: service ? Number(service.gst_rate) : l.gst_rate,
                                sac_code: service?.sac_code ?? l.sac_code,
                              }
                            : l,
                        ),
                      );
                    }}
                    className={inputClass}
                  >
                    <option value="">Select service…</option>
                    {services.data?.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    value={line.quantity}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Math.max(1, Number(e.target.value));
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, quantity: val } : l)),
                      );
                    }}
                    onBlur={() => {
                      if (line.quantity === "" || line.quantity < 1) {
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, quantity: 1 } : l)),
                        );
                      }
                    }}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Rate"
                    value={line.unit_price}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, unit_price: val } : l)),
                      );
                    }}
                    onBlur={() => {
                      if (line.unit_price === "") {
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, unit_price: 0 } : l)),
                        );
                      }
                    }}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.1"
                    aria-label="GST %"
                    value={line.gst_rate}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, gst_rate: val } : l)),
                      );
                    }}
                    onBlur={() => {
                      if (line.gst_rate === "") {
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, gst_rate: 0 } : l)),
                        );
                      }
                    }}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    title="Remove line item"
                    aria-label="Remove line item"
                    className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setLines((prev) => {
                        const next = prev.filter((_, i) => i !== idx);
                        return next.length > 0 ? next : [{ ...emptyLine }];
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`${ghostButton} w-fit`}
                onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
              >
                <Plus className="size-3.5" /> Add line
              </button>
            </div>

            {suggestedAddons.length > 0 ? (
              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="size-3.5 text-primary" /> Suggested add-ons for{" "}
                  {mainService?.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedAddons.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary"
                      onClick={() =>
                        setLines((prev) => [
                          ...prev.filter((l) => l.description),
                          {
                            description: s.name,
                            quantity: 1,
                            unit_price: Number(s.price),
                            gst_rate: Number(s.gst_rate),
                            sac_code: s.sac_code,
                          },
                        ])
                      }
                    >
                      + {s.name} · {money(s.price)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {bundleRule ? (
              <button
                type="button"
                className={`${ghostButton} w-fit`}
                onClick={() => setDiscount(bundleRule.value)}
              >
                Apply “{bundleRule.name}” — {money(bundleRule.value)} off
              </button>
            ) : null}

            <Field label="Discount" className="max-w-40">
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                  setDiscount(value);
                }}
                onBlur={() => {
                  if (discount === "") setDiscount(0);
                }}
                className={inputClass}
              />
            </Field>

            <dl className="grid gap-1 rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <Summary label="Subtotal" value={money(totals.subtotal)} />
              {totals.discount > 0 ? (
                <Summary label="Discount" value={`- ${money(totals.discount)}`} />
              ) : null}
              <Summary label="Taxable value" value={money(totals.taxable_value)} />
              {interState ? (
                <Summary label="IGST" value={money(totals.igst)} />
              ) : (
                <>
                  <Summary label="CGST" value={money(totals.cgst)} />
                  <Summary label="SGST" value={money(totals.sgst)} />
                </>
              )}
              {totals.round_off !== 0 ? (
                <Summary label="Round off" value={money(totals.round_off)} />
              ) : null}
              <div className="flex justify-between border-t border-border pt-1 text-sm font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
            </dl>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-invoice"
              className={primaryButton}
              disabled={createInvoice.isPending}
            >
              Create invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
