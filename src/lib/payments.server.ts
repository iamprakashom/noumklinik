/** Server-only helpers for the clinic's single payment gateway connection. */

export type GatewaySettings = {
  id: string;
  clinic_id: string;
  provider: string;
  mode: string;
  key_id: string | null;
  key_secret: string | null;
  webhook_secret: string | null;
  enabled: boolean;
  allow_upi: boolean;
  allow_emi: boolean;
};

export async function loadGateway(clinicId: string): Promise<GatewaySettings | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_gateway_settings")
    .select("*")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  return (data as GatewaySettings | null) ?? null;
}

/** Webhooks only know the gateway reference, so the link row tells us whose clinic it is. */
export async function loadGatewayByProviderRef(
  providerRef: string,
): Promise<GatewaySettings | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: link } = await supabaseAdmin
    .from("payment_links")
    .select("clinic_id")
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (!link?.clinic_id) return null;
  return loadGateway(link.clinic_id);
}

export function maskKey(value: string | null | undefined) {
  if (!value) return null;
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

type LinkInput = {
  amount: number;
  reference: string;
  purpose: string;
  customer: { name: string; email: string | null; phone: string | null };
};

export type CreatedLink = { url: string; ref: string };

export async function createRazorpayLink(
  g: GatewaySettings,
  input: LinkInput,
): Promise<CreatedLink> {
  const auth = btoa(`${g.key_id}:${g.key_secret}`);
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      description: input.purpose,
      reference_id: input.reference,
      customer: {
        name: input.customer.name,
        email: input.customer.email ?? undefined,
        contact: input.customer.phone ?? undefined,
      },
      notify: { sms: false, email: false },
      reminder_enable: true,
    }),
  });
  const json = (await res.json()) as { short_url?: string; id?: string; error?: { description?: string } };
  if (!res.ok || !json.short_url) {
    throw new Error(json.error?.description ?? "Razorpay could not create the payment link");
  }
  return { url: json.short_url, ref: json.id ?? input.reference };
}

export async function createCashfreeLink(
  g: GatewaySettings,
  input: LinkInput,
): Promise<CreatedLink> {
  const base = g.mode === "live" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
  const res = await fetch(`${base}/pg/links`, {
    method: "POST",
    headers: {
      "x-client-id": g.key_id ?? "",
      "x-client-secret": g.key_secret ?? "",
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      link_id: input.reference,
      link_amount: Number(input.amount.toFixed(2)),
      link_currency: "INR",
      link_purpose: input.purpose,
      customer_details: {
        customer_name: input.customer.name,
        customer_email: input.customer.email ?? undefined,
        customer_phone: input.customer.phone ?? "9999999999",
      },
      link_notify: { send_sms: false, send_email: false },
    }),
  });
  const json = (await res.json()) as { link_url?: string; link_id?: string; message?: string };
  if (!res.ok || !json.link_url) {
    throw new Error(json.message ?? "Cashfree could not create the payment link");
  }
  return { url: json.link_url, ref: json.link_id ?? input.reference };
}

/** Atomically settles a gateway link once and derives invoice status from its real balance. */
export async function settleLink(providerRef: string, amount: number, method: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("settle_payment_link", {
    _provider_ref: providerRef,
    _amount: Math.round(amount * 100) / 100,
    _method: method,
  });
  if (error) throw new Error(error.message);
  return Boolean(data?.[0]?.processed);
}
