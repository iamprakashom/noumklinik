import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { countsTowardTurnover, creditedInvoiceIds, paymentEffect, refundAmount } from "@/lib/billing-math";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BranchPerformance = {
  clinicId: string;
  name: string;
  branchCode: string | null;
  collected: number;
  refunded: number;
  invoiced: number;
  outstanding: number;
  appointments: number;
};

/**
 * Group-wide comparison across every branch, readable only by an organization
 * owner. Each branch keeps its own books; this simply adds them up side by side.
 */
export const getGroupPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ from: z.string().min(10).max(10), to: z.string().min(10).max(10) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("No active branch found");
    const { data: current } = await context.supabase
      .from("clinics")
      .select("organization_id")
      .eq("id", clinicId)
      .single();
    if (!current) throw new Error("Clinic group not found");

    const { data: owner } = await context.supabase.rpc("is_organization_owner", {
      _organization_id: current.organization_id,
    });
    if (!owner) throw new Error("Only an organization owner can see group reports");

    const { data: branches } = await context.supabase
      .from("clinics")
      .select("id, name, branch_code")
      .eq("organization_id", current.organization_id)
      .order("name");

    const ids = (branches ?? []).map((b) => b.id);
    if (!ids.length) return { branches: [] as BranchPerformance[] };

    const toEnd = `${data.to}T23:59:59.999Z`;
    const [paymentsRes, invoicesRes, appointmentsRes, creditNotesRes] = await Promise.all([
      context.supabase
        .from("payments")
        .select("clinic_id, invoice_id, amount, method, status, paid_at")
        .in("clinic_id", ids)
        .gte("paid_at", `${data.from}T00:00:00.000Z`)
        .lte("paid_at", toEnd),
      context.supabase
        .from("invoices")
        .select("id, clinic_id, total, status, doc_type, original_invoice_id, issued_at")
        .in("clinic_id", ids)
        .gte("issued_at", data.from)
        .lte("issued_at", data.to),
      context.supabase
        .from("appointments")
        .select("clinic_id, starts_at, status")
        .in("clinic_id", ids)
        .gte("starts_at", `${data.from}T00:00:00.000Z`)
        .lte("starts_at", toEnd),
      context.supabase
        .from("invoices")
        .select("doc_type, original_invoice_id")
        .in("clinic_id", ids)
        .eq("doc_type", "credit_note"),
    ]);
    const credited = creditedInvoiceIds(creditNotesRes.data ?? []);

    const rows: BranchPerformance[] = (branches ?? []).map((branch) => {
      const payments = (paymentsRes.data ?? []).filter((p) => p.clinic_id === branch.id);
      const collected = payments.reduce(
        (sum, p) => (refundAmount(p) ? sum : sum + paymentEffect(p)),
        0,
      );
      const refunded = payments.reduce((sum, p) => sum + refundAmount(p), 0);
      const invoices = (invoicesRes.data ?? []).filter(
        (i) => i.clinic_id === branch.id && countsTowardTurnover(i, credited),
      );
      // Credit notes are stored with negative totals, so a plain sum nets them off.
      const invoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0);
      return {
        clinicId: branch.id,
        name: branch.name,
        branchCode: branch.branch_code,
        collected,
        refunded,
        invoiced,
        outstanding: Math.max(invoiced - (collected - refunded), 0),
        appointments: (appointmentsRes.data ?? []).filter(
          (a) => a.clinic_id === branch.id && a.status !== "Cancelled",
        ).length,
      };
    });

    return { branches: rows };
  });
