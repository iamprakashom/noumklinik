import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, Panel, StatCard, inputClass } from "@/components/clinic/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, money, patientName } from "@/data/clinic";
import {
  useAppointments,
  useInvoices,
  usePackageRedemptions,
  usePatientFeedback,
  usePatients,
  usePayments,
  useProviders,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Day-close cash reconciliation, collection by payment mode, outstanding dues and doctor incentive reporting for the clinic.",
      },
      { property: "og:title", content: "Reports — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Daily collections by mode, dues ageing and revenue by doctor and service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function Row({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "overdue" | "progress" | "completed" | "idle";
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{label}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {tone ? <Chip tone={tone}>{value}</Chip> : <span className="text-sm tabular-nums">{value}</span>}
    </li>
  );
}

function ReportsPage() {
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today);

  const invoices = useInvoices();
  const payments = usePayments();
  const patients = usePatients();
  const providers = useProviders();
  const services = useServices();
  const appointments = useAppointments();
  const redemptions = usePackageRedemptions();
  const feedback = usePatientFeedback();
  const updateFeedback = useUpdate("patient_feedback");


  const patientOf = (id: string) => patients.data?.find((p) => p.id === id);
  const providerName = (id: string | null) =>
    providers.data?.find((p) => p.id === id)?.name ?? "Unassigned";

  /* ------------------------------ Day close ------------------------------ */
  const dayClose = useMemo(() => {
    const rows = (payments.data ?? []).filter((p) => p.paid_at.slice(0, 10) === day);
    const byMode = new Map<string, { count: number; amount: number }>();
    let collected = 0;
    let refunded = 0;
    for (const p of rows) {
      const amount = Number(p.amount);
      if (amount < 0 || p.status === "Refunded") refunded += Math.abs(amount);
      else collected += amount;
      const cur = byMode.get(p.method) ?? { count: 0, amount: 0 };
      byMode.set(p.method, { count: cur.count + 1, amount: cur.amount + amount });
    }
    const invoicesRaised = (invoices.data ?? []).filter(
      (i) => i.issued_at === day && i.doc_type !== "credit_note",
    );
    const creditNotes = (invoices.data ?? []).filter(
      (i) => i.issued_at === day && i.doc_type === "credit_note",
    );
    return {
      rows,
      byMode: [...byMode.entries()].sort((a, b) => b[1].amount - a[1].amount),
      collected,
      refunded,
      cash: byMode.get("Cash")?.amount ?? 0,
      billed: invoicesRaised.reduce((s, i) => s + Number(i.total), 0),
      invoiceCount: invoicesRaised.length,
      creditTotal: creditNotes.reduce((s, i) => s + Math.abs(Number(i.total)), 0),
      creditCount: creditNotes.length,
    };
  }, [payments.data, invoices.data, day]);

  /* -------------------------------- Dues -------------------------------- */
  const dues = useMemo(() => {
    const paidByInvoice = new Map<string, number>();
    for (const p of payments.data ?? []) {
      paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount));
    }
    const list = (invoices.data ?? [])
      .filter((i) => i.doc_type !== "credit_note")
      .map((i) => {
        const paid = paidByInvoice.get(i.id) ?? 0;
        const balance = Math.round((Number(i.total) - paid) * 100) / 100;
        const ageDays = Math.floor(
          (Date.now() - new Date(`${i.issued_at}T12:00:00`).getTime()) / 86_400_000,
        );
        return { invoice: i, paid, balance, ageDays };
      })
      .filter((r) => r.balance > 0.5)
      .sort((a, b) => b.ageDays - a.ageDays);

    const bucket = (d: number) => (d <= 7 ? "0–7 days" : d <= 30 ? "8–30 days" : d <= 60 ? "31–60 days" : "60+ days");
    const buckets = new Map<string, number>();
    for (const r of list) buckets.set(bucket(r.ageDays), (buckets.get(bucket(r.ageDays)) ?? 0) + r.balance);
    return {
      list,
      total: list.reduce((s, r) => s + r.balance, 0),
      buckets: ["0–7 days", "8–30 days", "31–60 days", "60+ days"].map(
        (k) => [k, buckets.get(k) ?? 0] as const,
      ),
    };
  }, [invoices.data, payments.data]);

  /* ----------------------------- Incentives ----------------------------- */
  const incentives = useMemo(() => {
    const inRange = (d: string) => d >= from && d <= to;
    const apptById = new Map((appointments.data ?? []).map((a) => [a.id, a]));
    const serviceName = (id: string | null) =>
      services.data?.find((s) => s.id === id)?.name ?? "Other";

    const byProvider = new Map<string, { revenue: number; visits: number }>();
    const byService = new Map<string, { revenue: number; count: number }>();
    let unattributed = 0;

    for (const inv of invoices.data ?? []) {
      if (inv.doc_type === "credit_note" || !inRange(inv.issued_at)) continue;
      const value = Number(inv.taxable_value) || Number(inv.subtotal) - Number(inv.discount);
      const appt = inv.appointment_id ? apptById.get(inv.appointment_id) : undefined;
      const key = appt?.provider_id ?? null;
      if (!key) unattributed += value;
      else {
        const cur = byProvider.get(key) ?? { revenue: 0, visits: 0 };
        byProvider.set(key, { revenue: cur.revenue + value, visits: cur.visits + 1 });
      }
      const sName = serviceName(appt?.service_id ?? null);
      const s = byService.get(sName) ?? { revenue: 0, count: 0 };
      byService.set(sName, { revenue: s.revenue + value, count: s.count + 1 });
    }

    for (const r of redemptions.data ?? []) {
      const d = r.redeemed_at.slice(0, 10);
      if (!inRange(d)) continue;
      const value = Number(r.value_recognised);
      if (!r.provider_id) unattributed += value;
      else {
        const cur = byProvider.get(r.provider_id) ?? { revenue: 0, visits: 0 };
        byProvider.set(r.provider_id, { revenue: cur.revenue + value, visits: cur.visits + 1 });
      }
      const s = byService.get(r.service_name) ?? { revenue: 0, count: 0 };
      byService.set(r.service_name, { revenue: s.revenue + value, count: s.count + 1 });
    }

    return {
      providers: [...byProvider.entries()].sort((a, b) => b[1].revenue - a[1].revenue),
      services: [...byService.entries()].sort((a, b) => b[1].revenue - a[1].revenue),
      unattributed,
      total:
        [...byProvider.values()].reduce((s, v) => s + v.revenue, 0) + unattributed,
    };
  }, [invoices.data, appointments.data, redemptions.data, services.data, from, to]);

  /* ----------------------------- Feedback ------------------------------ */
  const reviews = useMemo(() => {
    const rows = (feedback.data ?? []).filter((f) => {
      const d = f.created_at.slice(0, 10);
      return d >= from && d <= to;
    });
    const total = rows.length;
    const avg = total ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
    const promoters = rows.filter((r) => r.rating >= 4).length;
    const complaints = rows.filter((r) => r.is_complaint);
    return {
      rows,
      total,
      avg,
      promoters,
      clicked: rows.filter((r) => r.review_link_clicked).length,
      openComplaints: complaints.filter((c) => !c.resolved_at),
      complaints,
    };
  }, [feedback.data, from, to]);

  return (
    <AppShell title="Reports" subtitle="Day close, outstanding dues and revenue attribution">
      <Tabs defaultValue="day-close">
        <TabsList>
          <TabsTrigger value="day-close">Day close</TabsTrigger>
          <TabsTrigger value="dues">Outstanding dues</TabsTrigger>
          <TabsTrigger value="incentives">Doctor & service revenue</TabsTrigger>
          <TabsTrigger value="feedback">Feedback & reviews</TabsTrigger>
        </TabsList>


        {/* --------------------------- Day close --------------------------- */}
        <TabsContent value="day-close" className="mt-4 space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Business date" className="w-48">
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={inputClass}
              />
            </Field>
            <button
              className="h-9 rounded-md border border-border px-3 text-xs hover:bg-secondary print:hidden"
              onClick={() => window.print()}
            >
              Print day close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Collected"
              value={money(dayClose.collected)}
              hint={`${dayClose.rows.length} payment${dayClose.rows.length === 1 ? "" : "s"}`}
            />
            <StatCard label="Cash in drawer" value={money(dayClose.cash)} hint="Cash payments only" />
            <StatCard
              label="Billed"
              value={money(dayClose.billed)}
              hint={`${dayClose.invoiceCount} invoice${dayClose.invoiceCount === 1 ? "" : "s"} raised`}
            />
            <StatCard
              label="Refunds & credit notes"
              value={money(dayClose.refunded + dayClose.creditTotal)}
              hint={`${dayClose.creditCount} credit note${dayClose.creditCount === 1 ? "" : "s"}`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Collection by payment mode">
              {dayClose.byMode.length === 0 ? (
                <EmptyState>No payments recorded on {formatDate(`${day}T12:00:00`)}.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {dayClose.byMode.map(([mode, v]) => (
                    <Row
                      key={mode}
                      label={mode}
                      hint={`${v.count} transaction${v.count === 1 ? "" : "s"}`}
                      value={money(v.amount)}
                    />
                  ))}
                  <li className="flex items-center justify-between pt-2.5 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{money(dayClose.collected - dayClose.refunded)}</span>
                  </li>
                </ul>
              )}
            </Panel>

            <Panel title="Payments logged">
              {dayClose.rows.length === 0 ? (
                <EmptyState>Nothing collected on this date.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {dayClose.rows.map((p) => {
                    const inv = invoices.data?.find((i) => i.id === p.invoice_id);
                    const pt = inv ? patientOf(inv.patient_id) : undefined;
                    return (
                      <Row
                        key={p.id}
                        label={pt ? patientName(pt) : (inv?.number ?? "Payment")}
                        hint={`${inv?.number ?? "—"} · ${p.method} · ${p.status}`}
                        value={money(Number(p.amount))}
                      />
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* ----------------------------- Dues ----------------------------- */}
        <TabsContent value="dues" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total outstanding"
              value={money(dues.total)}
              hint={`${dues.list.length} invoice${dues.list.length === 1 ? "" : "s"} unpaid`}
            />
            {dues.buckets.slice(1).map(([label, amount]) => (
              <StatCard key={label} label={`Ageing ${label}`} value={money(amount)} />
            ))}
          </div>

          <Panel title="Unpaid and part-paid invoices">
            {dues.list.length === 0 ? (
              <EmptyState>No outstanding dues. Everything is collected.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Invoice</th>
                      <th className="py-2 pr-3 font-medium">Patient</th>
                      <th className="py-2 pr-3 font-medium">Issued</th>
                      <th className="py-2 pr-3 font-medium">Ageing</th>
                      <th className="py-2 pr-3 text-right font-medium">Total</th>
                      <th className="py-2 pr-3 text-right font-medium">Paid</th>
                      <th className="py-2 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.list.map(({ invoice, paid, balance, ageDays }) => {
                      const pt = patientOf(invoice.patient_id);
                      return (
                        <tr key={invoice.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2.5 pr-3 font-medium">{invoice.number}</td>
                          <td className="py-2.5 pr-3">{pt ? patientName(pt) : "—"}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">
                            {formatDate(`${invoice.issued_at}T12:00:00`)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Chip tone={ageDays > 30 ? "overdue" : ageDays > 7 ? "progress" : "idle"}>
                              {ageDays}d
                            </Chip>
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{money(Number(invoice.total))}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                            {money(paid)}
                          </td>
                          <td className="py-2.5 text-right font-semibold tabular-nums">{money(balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* -------------------------- Incentives -------------------------- */}
        <TabsContent value="incentives" className="mt-4 space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From" className="w-44">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </Field>
            <Field label="To" className="w-44">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Net revenue (pre-GST)" value={money(incentives.total)} hint="Invoices plus package sessions used" />
            <StatCard label="Attributed to a doctor" value={money(incentives.total - incentives.unattributed)} />
            <StatCard label="Unattributed" value={money(incentives.unattributed)} hint="No provider on the visit" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Revenue by doctor / therapist">
              {incentives.providers.length === 0 ? (
                <EmptyState>No attributed revenue in this range.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {incentives.providers.map(([id, v]) => (
                    <Row
                      key={id}
                      label={providerName(id)}
                      hint={`${v.visits} billed item${v.visits === 1 ? "" : "s"}`}
                      value={money(v.revenue)}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Revenue by service">
              {incentives.services.length === 0 ? (
                <EmptyState>Nothing billed in this range.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {incentives.services.map(([name, v]) => (
                    <Row
                      key={name}
                      label={name}
                      hint={`${v.count} time${v.count === 1 ? "" : "s"}`}
                      value={money(v.revenue)}
                    />
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* --------------------------- Feedback --------------------------- */}
        <TabsContent value="feedback" className="mt-4 space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From" className="w-44">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </Field>
            <Field label="To" className="w-44">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Average rating"
              value={reviews.total ? reviews.avg.toFixed(1) : "—"}
              hint={`${reviews.total} response${reviews.total === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Happy (4–5★)"
              value={String(reviews.promoters)}
              hint={`${reviews.total ? Math.round((reviews.promoters / reviews.total) * 100) : 0}% of responses`}
            />
            <StatCard
              label="Review link opened"
              value={String(reviews.clicked)}
              hint="Patients sent to Google"
            />
            <StatCard
              label="Open complaints"
              value={String(reviews.openComplaints.length)}
              hint="1–3★ awaiting a call back"
            />
          </div>

          <Panel title="Complaints to handle">
            {reviews.complaints.length === 0 ? (
              <EmptyState>No low ratings in this range.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {reviews.complaints.map((f) => {
                  const pt = f.patient_id ? patientOf(f.patient_id) : undefined;
                  return (
                    <li key={f.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Chip tone={f.rating <= 2 ? "overdue" : "progress"}>{f.rating}★</Chip>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{pt ? patientName(pt) : "Patient"}</p>
                        {f.comment ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{f.comment}</p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(f.created_at)}
                          {pt?.phone ? ` · ${pt.phone}` : ""}
                        </p>
                      </div>
                      {f.resolved_at ? (
                        <Chip tone="completed">Resolved</Chip>
                      ) : (
                        <button
                          className="h-8 shrink-0 rounded-md border border-border px-3 text-xs hover:bg-secondary"
                          onClick={() =>
                            updateFeedback.mutate(
                              { id: f.id, values: { resolved_at: new Date().toISOString() } },
                              { onSuccess: () => toast.success("Marked resolved") },
                            )
                          }
                        >
                          Mark resolved
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="All responses">
            {reviews.rows.length === 0 ? (
              <EmptyState>No feedback collected yet. Add {"{{feedback_link}}"} to a post-treatment automation.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {reviews.rows.map((f) => {
                  const pt = f.patient_id ? patientOf(f.patient_id) : undefined;
                  return (
                    <Row
                      key={f.id}
                      label={pt ? patientName(pt) : "Patient"}
                      hint={`${formatDate(f.created_at)}${f.comment ? ` · ${f.comment}` : ""}`}
                      value={`${f.rating}★`}
                      tone={f.rating >= 4 ? "completed" : f.rating === 3 ? "progress" : "overdue"}
                    />
                  );
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

      </Tabs>
    </AppShell>
  );
}
