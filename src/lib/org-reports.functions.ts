import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
    const [paymentsRes, invoicesRes, appointmentsRes] = await Promise.all([
      context.supabase
        .from("payments")
        .select("clinic_id, amount, method, paid_at")
        .in("clinic_id", ids)
        .gte("paid_at", `${data.from}T00:00:00.000Z`)
        .lte("paid_at", toEnd),
      context.supabase
        .from("invoices")
        .select("clinic_id, total, status, doc_type, issued_at")
        .in("clinic_id", ids)
        .gte("issued_at", data.from)
        .lte("issued_at", data.to),
      context.supabase
        .from("appointments")
        .select("clinic_id, starts_at, status")
        .in("clinic_id", ids)
        .gte("starts_at", `${data.from}T00:00:00.000Z`)
        .lte("starts_at", toEnd),
    ]);

    const rows: BranchPerformance[] = (branches ?? []).map((branch) => {
      const payments = (paymentsRes.data ?? []).filter((p) => p.clinic_id === branch.id);
      const collected = payments
        .filter((p) => Number(p.amount) > 0)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const refunded = payments
        .filter((p) => Number(p.amount) < 0)
        .reduce((sum, p) => sum + Math.abs(Number(p.amount)), 0);
      const invoices = (invoicesRes.data ?? []).filter(
        (i) => i.clinic_id === branch.id && i.status !== "Void",
      );
      const invoiced = invoices.reduce(
        (sum, i) => sum + (i.doc_type === "credit_note" ? -Number(i.total) : Number(i.total)),
        0,
      );
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
