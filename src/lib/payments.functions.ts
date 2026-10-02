import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { paymentEffect } from "@/lib/billing-math";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireClinicId } from "@/lib/clinic.server";

const configSchema = z.object({
  provider: z.enum(["razorpay", "cashfree"]),
  mode: z.enum(["test", "live"]),
  key_id: z.string().max(200).optional().nullable(),
  key_secret: z.string().max(400).optional().nullable(),
  webhook_secret: z.string().max(400).optional().nullable(),
  enabled: z.boolean(),
  allow_upi: z.boolean(),
  allow_emi: z.boolean(),
});

export const getGatewayConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(`Could not verify your role: ${roleError.message}`);
    if (!isAdmin) throw new Error("Only clinic admins can view payment settings");
    const clinicId = await requireClinicId(context.supabase);
    const { loadGateway, maskKey } = await import("@/lib/payments.server");
    const g = await loadGateway(clinicId);
    if (!g) return null;
    return {
      provider: g.provider,
      mode: g.mode,
      enabled: g.enabled,
      allow_upi: g.allow_upi,
      allow_emi: g.allow_emi,
      key_id: g.key_id,
      key_secret_masked: maskKey(g.key_secret),
      webhook_secret_masked: maskKey(g.webhook_secret),
    };
  });

export const saveGatewayConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(`Could not verify your role: ${roleError.message}`);
    if (!isAdmin) throw new Error("Only clinic admins can change payment settings");

    const clinicId = await requireClinicId(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadGateway } = await import("@/lib/payments.server");
    const existing = await loadGateway(clinicId);

    const values = {
      provider: data.provider,
      mode: data.mode,
      enabled: data.enabled,
      allow_upi: data.allow_upi,
      allow_emi: data.allow_emi,
      key_id: data.key_id || existing?.key_id || null,
      // blank input keeps the stored secret
      key_secret: data.key_secret || existing?.key_secret || null,
      webhook_secret: data.webhook_secret || existing?.webhook_secret || null,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("payment_gateway_settings")
        .update(values)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("payment_gateway_settings")
        .insert({ ...values, clinic_id: clinicId, singleton: true });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const createInvoicePaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: invoice, error } = await context.supabase
      .from("invoices")
      .select("id, number, total, patient_id, status")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error || !invoice) throw new Error("Invoice not found");
    if (invoice.status === "Paid" || invoice.status === "Void") {
      throw new Error("This invoice has no payable balance");
    }

    const { data: invoicePayments, error: paymentsError } = await context.supabase
      .from("payments")
      .select("amount, status")
      .eq("invoice_id", invoice.id);
    if (paymentsError) throw new Error("Could not calculate the invoice balance");
    const settled = (invoicePayments ?? []).reduce(
      (sum, payment) =>
        sum + paymentEffect({ ...payment, invoice_id: invoice.id }),
      0,
    );
    const balance = Math.round((Number(invoice.total) - settled) * 100) / 100;
    if (balance <= 0) throw new Error("This invoice is already paid");

    const { data: patient } = await context.supabase
      .from("patients")
      .select("first_name, last_name, email, phone")
      .eq("id", invoice.patient_id)
      .maybeSingle();

    const { loadGateway, createRazorpayLink, createCashfreeLink } = await import(
      "@/lib/payments.server"
    );
    const clinicId = await requireClinicId(context.supabase);
    const gateway = await loadGateway(clinicId);
    if (!gateway || !gateway.enabled || !gateway.key_id || !gateway.key_secret) {
      throw new Error("Connect a payment gateway in Clinic setup → Payments first");
    }

    const input = {
      amount: balance,
      reference: `${invoice.number}-${Date.now().toString().slice(-5)}`,
      purpose: `Treatment invoice ${invoice.number}`,
      customer: {
        name: patient ? `${patient.first_name} ${patient.last_name}` : "Patient",
        email: patient?.email ?? null,
        phone: patient?.phone ?? null,
      },
    };

    const link =
      gateway.provider === "cashfree"
        ? await createCashfreeLink(gateway, input)
        : await createRazorpayLink(gateway, input);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payment_links").insert({
      clinic_id: clinicId,
      invoice_id: invoice.id,
      provider: gateway.provider,
      provider_ref: link.ref,
      short_url: link.url,
      amount: balance,
      status: "created",
    });

    return { url: link.url, provider: gateway.provider };
  });

const manualPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["Cash", "UPI", "Card", "Bank transfer", "Cheque"]),
  paidAt: z.string().datetime(),
  reference: z.string().trim().max(200).optional().nullable(),
});

/** Records a payment through the database's locked balance check. */
export const recordManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualPaymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("record_invoice_payment", {
      _invoice_id: data.invoiceId,
      _amount: Math.round(data.amount * 100) / 100,
      _method: data.method,
      _paid_at: data.paidAt,
      ...(data.reference ? { _reference: data.reference } : {}),
    });
    if (error) {
      if (/remaining invoice balance/i.test(error.message)) {
        throw new Error("Payment exceeds the remaining invoice balance");
      }
      throw new Error(error.message);
    }
    const payment = result?.[0];
    if (!payment) throw new Error("Payment could not be recorded");
    return {
      remainingBalance: Number(payment.remaining_balance),
      invoiceStatus: payment.invoice_status,
    };
  });
