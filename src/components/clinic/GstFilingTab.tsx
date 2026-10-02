import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ghostButton } from "@/components/clinic/AppShell";
import { EmptyState, Field, Panel, StatCard, inputClass } from "@/components/clinic/bits";
import { formatDate, money } from "@/data/clinic";
import { stateCode } from "@/lib/gst";
import { countsTowardTurnover, creditedInvoiceIds } from "@/lib/billing-math";
import { useClinicProfile, useInvoiceItems, useInvoices } from "@/lib/clinic-data";

const monthNow = () => new Date().toISOString().slice(0, 7);

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function download(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const n2 = (v: number) => Number(v.toFixed(2));

/**
 * Monthly GST return working: B2C(S) summary by place of supply and rate,
 * HSN/SAC summary and a document series summary, all exportable as CSV
 * for the CA to key into GSTR-1.
 */
export function GstFilingTab() {
  const [month, setMonth] = useState(monthNow());
  const invoices = useInvoices();
  const items = useInvoiceItems();
  const clinic = useClinicProfile();

  const data = useMemo(() => {
    const inMonth = (invoices.data ?? []).filter(
      (i) => String(i.issued_at).slice(0, 7) === month,
    );
    const ids = new Set(inMonth.map((i) => i.id));
    const monthItems = (items.data ?? []).filter((i) => ids.has(i.invoice_id));
    const byInvoice = new Map(inMonth.map((i) => [i.id, i]));

    // Credit-note values are already stored negative; only quantity needs a sign.
    const credited = creditedInvoiceIds(invoices.data ?? []);
    const qtySign = (invoiceId: string) =>
      byInvoice.get(invoiceId)?.doc_type === "credit_note" ? -1 : 1;

    const b2c = new Map<
      string,
      { pos: string; code: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }
    >();
    const hsn = new Map<
      string,
      { sac: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number; igst: number }
    >();

    for (const it of monthItems) {
      const inv = byInvoice.get(it.invoice_id);
      if (!inv || !countsTowardTurnover(inv, credited)) continue;
      const rate = Number(it.gst_rate);
      const pos = inv.place_of_supply || clinic.data?.state || "—";
      const code = inv.place_of_supply_code || stateCode(pos) || "";

      const bKey = `${pos}|${rate}`;
      const b = b2c.get(bKey) ?? { pos, code, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      b.taxable += Number(it.taxable_amount);
      b.cgst += Number(it.cgst);
      b.sgst += Number(it.sgst);
      b.igst += Number(it.igst);
      b2c.set(bKey, b);

      const sac = it.sac_code || "999722";
      const hKey = `${sac}|${rate}`;
      const h = hsn.get(hKey) ?? { sac, rate, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      h.qty += qtySign(it.invoice_id) * Number(it.quantity);
      h.taxable += Number(it.taxable_amount);
      h.cgst += Number(it.cgst);
      h.sgst += Number(it.sgst);
      h.igst += Number(it.igst);
      hsn.set(hKey, h);
    }

    const docs = ["invoice", "credit_note"].map((kind) => {
      const list = inMonth
        .filter((i) => i.doc_type === kind)
        .sort((a, b) => (a.number > b.number ? 1 : -1));
      return {
        kind: kind === "invoice" ? "Tax invoices" : "Credit notes",
        from: list[0]?.number ?? "—",
        to: list[list.length - 1]?.number ?? "—",
        count: list.length,
        cancelled: list.filter((i) => i.status === "Void").length,
      };
    });

    const b2cRows = [...b2c.values()].sort((a, b) => a.pos.localeCompare(b.pos) || a.rate - b.rate);
    const hsnRows = [...hsn.values()].sort((a, b) => a.sac.localeCompare(b.sac) || a.rate - b.rate);
    const taxable = b2cRows.reduce((s, r) => s + r.taxable, 0);
    const tax = b2cRows.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);

    return { inMonth, b2cRows, hsnRows, docs, taxable, tax };
  }, [invoices.data, items.data, clinic.data, month]);

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const exportAll = () => {
    const rows: (string | number)[][] = [
      ["GSTR-1 working", label],
      ["Supplier", clinic.data?.legal_name ?? ""],
      ["GSTIN", clinic.data?.gstin ?? ""],
      [],
      ["B2C (Small) summary"],
      ["Place of supply", "State code", "Rate %", "Taxable value", "CGST", "SGST", "IGST"],
      ...data.b2cRows.map((r) => [
        r.pos,
        r.code,
        r.rate,
        n2(r.taxable),
        n2(r.cgst),
        n2(r.sgst),
        n2(r.igst),
      ]),
      [],
      ["HSN / SAC summary"],
      ["SAC", "Rate %", "Quantity", "Taxable value", "CGST", "SGST", "IGST"],
      ...data.hsnRows.map((r) => [
        r.sac,
        r.rate,
        n2(r.qty),
        n2(r.taxable),
        n2(r.cgst),
        n2(r.sgst),
        n2(r.igst),
      ]),
      [],
      ["Document series summary"],
      ["Type", "From", "To", "Total", "Cancelled"],
      ...data.docs.map((d) => [d.kind, d.from, d.to, d.count, d.cancelled]),
    ];
    download(`gstr1-${month}.csv`, rows);
  };

  const exportInvoiceList = () => {
    const rows: (string | number)[][] = [
      [
        "Invoice no",
        "Type",
        "Date",
        "Place of supply",
        "Taxable value",
        "CGST",
        "SGST",
        "IGST",
        "Round off",
        "Total",
        "Status",
      ],
      ...data.inMonth.map((i) => [
        i.number,
        i.doc_type === "credit_note" ? "Credit note" : "Tax invoice",
        formatDate(i.issued_at),
        i.place_of_supply ?? "",
        n2(Number(i.taxable_value)),
        n2(Number(i.cgst)),
        n2(Number(i.sgst)),
        n2(Number(i.igst)),
        n2(Number(i.round_off)),
        n2(Number(i.total)),
        i.status,
      ]),
    ];
    download(`invoice-register-${month}.csv`, rows);
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Return period">
          <input
            type="month"
            className={inputClass}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <button className={ghostButton} onClick={exportAll} disabled={!data.inMonth.length}>
          <Download className="size-3.5" /> GSTR-1 summary CSV
        </button>
        <button className={ghostButton} onClick={exportInvoiceList} disabled={!data.inMonth.length}>
          <Download className="size-3.5" /> Invoice register CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documents" value={String(data.inMonth.length)} hint={label} />
        <StatCard label="Taxable value" value={money(data.taxable)} />
        <StatCard label="Total GST" value={money(data.tax)} />
        <StatCard label="GSTIN" value={clinic.data?.gstin || "Not set"} />
      </div>

      {!data.inMonth.length ? (
        <EmptyState>No documents in this period — pick another month to see the working.</EmptyState>
      ) : (
        <>
          <Panel title="B2C (Small) — rate-wise summary · Table 7">
            <div className="no-scrollbar overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Place of supply</th>
                    <th className="py-2 pr-4">Rate</th>
                    <th className="py-2 pr-4 text-right">Taxable</th>
                    <th className="py-2 pr-4 text-right">CGST</th>
                    <th className="py-2 pr-4 text-right">SGST</th>
                    <th className="py-2 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.b2cRows.map((r) => (
                    <tr key={`${r.pos}-${r.rate}`}>
                      <td className="py-2 pr-4">
                        {r.pos}
                        {r.code ? (
                          <span className="ml-1 text-xs text-muted-foreground">({r.code})</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{r.rate}%</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.taxable)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.cgst)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.sgst)}</td>
                      <td className="py-2 text-right tabular-nums">{money(r.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="HSN / SAC summary · Table 12">
            <div className="no-scrollbar overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">SAC</th>
                    <th className="py-2 pr-4">Rate</th>
                    <th className="py-2 pr-4 text-right">Qty</th>
                    <th className="py-2 pr-4 text-right">Taxable</th>
                    <th className="py-2 pr-4 text-right">CGST</th>
                    <th className="py-2 pr-4 text-right">SGST</th>
                    <th className="py-2 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.hsnRows.map((r) => (
                    <tr key={`${r.sac}-${r.rate}`}>
                      <td className="py-2 pr-4 tabular-nums">{r.sac}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.rate}%</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.qty}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.taxable)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.cgst)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(r.sgst)}</td>
                      <td className="py-2 text-right tabular-nums">{money(r.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Document series · Table 13">
            <ul className="divide-y divide-border text-sm">
              {data.docs.map((d) => (
                <li key={d.kind} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-32 font-medium">{d.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.from} → {d.to}
                  </span>
                  <span className="ml-auto tabular-nums">{d.count} issued</span>
                  <span className="text-xs text-muted-foreground">{d.cancelled} cancelled</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
