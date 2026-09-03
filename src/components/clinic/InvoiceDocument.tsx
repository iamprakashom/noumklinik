import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { formatDate, money, patientName } from "@/data/clinic";
import type { ClinicProfile, Invoice, InvoiceItem, Patient } from "@/data/clinic";
import { amountInWords } from "@/lib/gst";
import { Printer } from "lucide-react";

const cell = "px-2 py-1.5 align-top";

/** A4 GST tax invoice / credit note, print-ready. */
export function InvoiceDocument({
  invoice,
  items,
  patient,
  clinic,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  items: InvoiceItem[];
  patient: Patient | null;
  clinic: ClinicProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!invoice) return null;
  const isCredit = invoice.doc_type === "credit_note";
  const interState = Number(invoice.igst) !== 0;
  const abs = (v: number | string) => Math.abs(Number(v ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="invoice-print-shell print-scope max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <h2 className="text-sm font-semibold">
            {isCredit ? "Credit note" : "Tax invoice"} {invoice.number}
          </h2>
          <div className="flex gap-2">
            <button className={ghostButton} onClick={() => onOpenChange(false)}>
              Close
            </button>
            <button className={primaryButton} onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>

        <article id="invoice-print" className="rounded-lg border border-border bg-card p-6 text-[12px] text-foreground">
          <header className="flex items-start justify-between gap-6 border-b border-border pb-4">
            <div>
              <h1 className="text-base font-semibold">{clinic?.legal_name ?? "Clinic"}</h1>
              {clinic?.trade_name ? (
                <p className="text-muted-foreground">{clinic.trade_name}</p>
              ) : null}
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {[clinic?.address_line1, clinic?.address_line2, clinic?.city, clinic?.state, clinic?.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-muted-foreground">
                {[clinic?.phone, clinic?.email].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 font-medium">GSTIN: {invoice.supplier_gstin ?? clinic?.gstin ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wide">
                {isCredit ? "Credit Note" : "Tax Invoice"}
              </p>
              <p className="mt-1 tabular-nums">No: {invoice.number}</p>
              <p className="tabular-nums">Date: {formatDate(invoice.issued_at)}</p>
              <p>
                Place of supply: {invoice.place_of_supply ?? "—"}
                {invoice.place_of_supply_code ? ` (${invoice.place_of_supply_code})` : ""}
              </p>
            </div>
          </header>

          <section className="grid gap-1 border-b border-border py-3">
            <p className="font-medium">Billed to</p>
            <p>{patient ? patientName(patient) : "—"}</p>
            <p className="text-muted-foreground">
              {[patient?.phone, patient?.email, patient?.state].filter(Boolean).join(" · ") || "—"}
            </p>
          </section>

          <table className="mt-3 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className={cell}>#</th>
                <th className={cell}>Description</th>
                <th className={cell}>SAC</th>
                <th className={`${cell} text-right`}>Qty</th>
                <th className={`${cell} text-right`}>Rate</th>
                <th className={`${cell} text-right`}>Taxable</th>
                {interState ? (
                  <th className={`${cell} text-right`}>IGST</th>
                ) : (
                  <>
                    <th className={`${cell} text-right`}>CGST</th>
                    <th className={`${cell} text-right`}>SGST</th>
                  </>
                )}
                <th className={`${cell} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i, idx) => {
                const rate = Number(i.gst_rate);
                const lineTotal =
                  abs(i.taxable_amount) + abs(i.cgst) + abs(i.sgst) + abs(i.igst);
                return (
                  <tr key={i.id}>
                    <td className={cell}>{idx + 1}</td>
                    <td className={cell}>{i.description}</td>
                    <td className={cell}>{i.sac_code}</td>
                    <td className={`${cell} text-right tabular-nums`}>{Number(i.quantity)}</td>
                    <td className={`${cell} text-right tabular-nums`}>{money(i.unit_price)}</td>
                    <td className={`${cell} text-right tabular-nums`}>{money(abs(i.taxable_amount))}</td>
                    {interState ? (
                      <td className={`${cell} text-right tabular-nums`}>
                        {money(abs(i.igst))} <span className="text-muted-foreground">({rate}%)</span>
                      </td>
                    ) : (
                      <>
                        <td className={`${cell} text-right tabular-nums`}>
                          {money(abs(i.cgst))}{" "}
                          <span className="text-muted-foreground">({rate / 2}%)</span>
                        </td>
                        <td className={`${cell} text-right tabular-nums`}>
                          {money(abs(i.sgst))}{" "}
                          <span className="text-muted-foreground">({rate / 2}%)</span>
                        </td>
                      </>
                    )}
                    <td className={`${cell} text-right tabular-nums`}>{money(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1">
              <Row label="Subtotal" value={money(abs(invoice.subtotal))} />
              {abs(invoice.discount) > 0 ? (
                <Row label="Discount" value={`- ${money(abs(invoice.discount))}`} />
              ) : null}
              <Row label="Taxable value" value={money(abs(invoice.taxable_value))} />
              {interState ? (
                <Row label="IGST" value={money(abs(invoice.igst))} />
              ) : (
                <>
                  <Row label="CGST" value={money(abs(invoice.cgst))} />
                  <Row label="SGST" value={money(abs(invoice.sgst))} />
                </>
              )}
              {Number(invoice.round_off) !== 0 ? (
                <Row label="Round off" value={money(invoice.round_off)} />
              ) : null}
              <div className="flex justify-between border-t border-border pt-1 text-sm font-semibold">
                <dt>{isCredit ? "Credit total" : "Total"}</dt>
                <dd className="tabular-nums">{money(abs(invoice.total))}</dd>
              </div>
            </dl>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Amount in words: {amountInWords(abs(invoice.total))}
          </p>

          {invoice.notes ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Note: {invoice.notes}</p>
          ) : null}

          <footer className="mt-6 flex items-end justify-between gap-6 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <p className="max-w-sm">{clinic?.declaration}</p>
            <div className="text-center">
              <div className="h-10" />
              <p className="border-t border-border pt-1">Authorised signatory</p>
            </div>
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
