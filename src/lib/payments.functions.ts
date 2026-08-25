import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { loadGateway, maskKey } = await import("@/lib/payments.server");
    const g = await loadGateway();
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadGateway } = await import("@/lib/payments.server");
    const existing = await loadGateway();

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
        .insert({ ...values, singleton: true });
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
    if (invoice.status === "Paid") throw new Error("This invoice is already paid");

    const { data: patient } = await context.supabase
      .from("patients")
      .select("first_name, last_name, email, phone")
      .eq("id", invoice.patient_id)
      .maybeSingle();

    const { loadGateway, createRazorpayLink, createCashfreeLink } = await import(
      "@/lib/payments.server"
    );
    const gateway = await loadGateway();
    if (!gateway || !gateway.enabled || !gateway.key_id || !gateway.key_secret) {
      throw new Error("Connect a payment gateway in Clinic setup → Payments first");
    }

    const input = {
      amount: Number(invoice.total),
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
      invoice_id: invoice.id,
      provider: gateway.provider,
      provider_ref: link.ref,
      short_url: link.url,
      amount: Number(invoice.total),
      status: "created",
    });

    return { url: link.url, provider: gateway.provider };
  });
