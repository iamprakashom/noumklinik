import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Sparkles } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, StatCard, inputClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, invoiceTone, money, patientName } from "@/data/clinic";
import {
  useAddonDiscountRules,
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
      { title: "Billing — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Create treatment invoices with add-on upsells, apply bundle discounts and tax, collect UPI or EMI payments and track balances.",
      },
      { property: "og:title", content: "Billing — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Invoices, add-on upsells, payment links and outstanding balances for the clinic.",
      },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [discount, setDiscount] = useState(0);

  const invoices = useInvoices();
  const items = useInvoiceItems();
  const payments = usePayments();
  const patients = usePatients();
  const services = useServices();
  const addons = useServiceAddons();
  const rules = useAddonDiscountRules();
  const createInvoice = useCreateInvoice();
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

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
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
        r.discount_type === "percent" ? (subtotal * Number(r.discount_value)) / 100 : Number(r.discount_value);
      if (!best || value > best.value) best = { name: r.name, value: Math.round(value) };
    }
    return best;
  }, [rules.data, addonCount, mainService?.id, subtotal]);

  return (
    <AppShell
      title="Billing"
      subtitle="Invoices, payments and balances"
      actions={
        <button className={primaryButton} onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> New invoice
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={money(outstanding)} hint={`${all.filter((i) => i.status === "Open").length} open invoices`} />
        <StatCard label="Collected" value={money(collected)} hint={`${payments.data?.length ?? 0} payments`} />
        <StatCard label="Invoices" value={all.length} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {all.length === 0 ? (
          <div className="p-6">
            <EmptyState>No invoices yet.</EmptyState>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Issued</th>
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
                    <td className="px-5 py-3 tabular-nums">{inv.number}</td>
                    <td className="px-5 py-3">{patientOf(inv.patient_id)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {lineItems.map((i) => i.description).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(inv.total)}</td>
                    <td className="px-5 py-3">
                      <Chip tone={invoiceTone(inv.status)}>{inv.status}</Chip>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.status === "Open" ? (
                        <div className="flex justify-end gap-1">
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
                        </div>
                      ) : null}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <form
            id="new-invoice"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createInvoice.mutate(
                {
                  patient_id: String(fd.get("patient_id")),
                  items: lines.filter((l) => l.description),
                  discount: Number(fd.get("discount")) || 0,
                  taxRate: Number(fd.get("tax_rate")) || 0,
                },
                {
                  onSuccess: () => {
                    toast.success("Invoice created");
                    setLines([{ description: "", quantity: 1, unit_price: 0 }]);
                    setOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Patient">
              <select name="patient_id" required className={inputClass}>
                {patients.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {patientName(p)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Line items</span>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_100px] gap-2">
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
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, quantity: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, unit_price: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                type="button"
                className={`${ghostButton} w-fit`}
                onClick={() =>
                  setLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])
                }
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
                          { description: s.name, quantity: 1, unit_price: Number(s.price) },
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

            <div className="grid grid-cols-2 gap-4">
              <Field label="Discount">
                <input
                  name="discount"
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Tax rate (%)">
                <input name="tax_rate" type="number" step="0.1" defaultValue={8.25} className={inputClass} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Subtotal {money(subtotal)} · {addonCount} add-on{addonCount === 1 ? "" : "s"}
            </p>

          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="new-invoice" className={primaryButton} disabled={createInvoice.isPending}>
              Create invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
