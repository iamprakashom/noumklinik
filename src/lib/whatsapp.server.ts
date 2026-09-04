/** Server-only WhatsApp Business Cloud API access backed by clinic settings. */

const GRAPH = "https://graph.facebook.com/v20.0";

export type WhatsAppSettings = {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  phone_number_id: string | null;
  waba_id: string | null;
  access_token: string | null;
  verify_token: string;
  app_secret: string | null;
  enabled: boolean;
  status: string;
  error_message: string | null;
};

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  return `••••${value.slice(-4)}`;
}

/** Loads a clinic's WhatsApp connection row, creating it on first use. */
export async function loadSettings(clinicId: string): Promise<WhatsAppSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_settings")
    .select("*")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (data) return data as WhatsAppSettings;
  const { data: created, error } = await supabaseAdmin
    .from("whatsapp_settings")
    .insert({ clinic_id: clinicId, singleton: true })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created as WhatsAppSettings;
}

/** Resolves which clinic an inbound webhook belongs to, from the business phone number ID. */
export async function loadSettingsByPhoneId(
  phoneNumberId: string,
): Promise<(WhatsAppSettings & { clinic_id: string }) | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_settings")
    .select("*")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  return (data as (WhatsAppSettings & { clinic_id: string }) | null) ?? null;
}

function credentials(s: WhatsAppSettings) {
  const token = s.access_token ?? process.env["WHATSAPP_TOKEN"] ?? null;
  const phoneId = s.phone_number_id ?? process.env["WHATSAPP_PHONE_NUMBER_ID"] ?? null;
  return { token, phoneId };
}

export function normaliseNumber(input: string) {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits.replace(/^0+/, "");
}

type SendOk = { ok: true; providerId?: string | undefined };
type SendErr = { ok: false; error: string };

/** Sends a free-form session message to a WhatsApp contact. */
export async function sendText(
  clinicId: string,
  to: string,
  body: string,
): Promise<SendOk | SendErr> {
  const settings = await loadSettings(clinicId);
  if (!settings.enabled) return { ok: false, error: "WhatsApp is switched off in settings" };
  const { token, phoneId } = credentials(settings);
  if (!token || !phoneId) return { ok: false, error: "WhatsApp is not connected" };
  const wa = normaliseNumber(to);
  if (!wa) return { ok: false, error: "No WhatsApp number on file" };

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: wa,
      type: "text",
      text: { body },
    }),
  });
  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };
  if (!res.ok) return { ok: false, error: json.error?.message ?? "WhatsApp send failed" };
  return { ok: true, providerId: json.messages?.[0]?.id };
}

/** Sends an approved template message (required outside the 24h session window). */
export async function sendTemplate(
  clinicId: string,
  to: string,
  templateName: string,
  language: string,
  variables: string[],
): Promise<SendOk | SendErr> {
  const settings = await loadSettings(clinicId);
  if (!settings.enabled) return { ok: false, error: "WhatsApp is switched off in settings" };
  const { token, phoneId } = credentials(settings);
  if (!token || !phoneId) return { ok: false, error: "WhatsApp is not connected" };
  const wa = normaliseNumber(to);
  if (!wa) return { ok: false, error: "No WhatsApp number on file" };

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: wa,
      type: "template",
      template: {
        name: templateName,
        language: { code: language || "en" },
        ...(variables.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: variables.map((text) => ({ type: "text", text })),
                },
              ],
            }
          : {}),
      },
    }),
  });
  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };
  if (!res.ok) return { ok: false, error: json.error?.message ?? "Template send failed" };
  return { ok: true, providerId: json.messages?.[0]?.id };
}

/** Verifies the connection by reading the business phone number from Meta. */
export async function checkConnection(clinicId: string) {
  const settings = await loadSettings(clinicId);
  const { token, phoneId } = credentials(settings);
  if (!token || !phoneId) return { ok: false as const, error: "Add a token and phone number ID" };
  const res = await fetch(
    `${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = (await res.json()) as {
    display_phone_number?: string;
    verified_name?: string;
    error?: { message?: string };
  };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!res.ok) {
    await supabaseAdmin
      .from("whatsapp_settings")
      .update({ status: "Error", error_message: json.error?.message ?? "Connection failed" })
      .eq("id", settings.id);
    return { ok: false as const, error: json.error?.message ?? "Connection failed" };
  }
  await supabaseAdmin
    .from("whatsapp_settings")
    .update({
      status: "Connected",
      error_message: null,
      phone_number: json.display_phone_number ?? settings.phone_number,
      display_name: json.verified_name ?? settings.display_name,
    })
    .eq("id", settings.id);
  return {
    ok: true as const,
    phone_number: json.display_phone_number ?? null,
    display_name: json.verified_name ?? null,
  };
}

/** Pulls approved message templates from the WhatsApp Business Account. */
export async function fetchRemoteTemplates(clinicId: string) {
  const settings = await loadSettings(clinicId);
  const token = settings.access_token ?? process.env["WHATSAPP_TOKEN"];
  if (!token || !settings.waba_id) return [];
  const res = await fetch(
    `${GRAPH}/${settings.waba_id}/message_templates?fields=name,language,status,category&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: { name: string; language: string; status: string; category: string }[];
  };
  return json.data ?? [];
}

/** Validates the X-Hub-Signature-256 header on an inbound webhook body. */
export async function verifySignature(
  settings: Pick<WhatsAppSettings, "app_secret"> | null,
  header: string | null,
  raw: string,
) {
  const secret = settings?.app_secret ?? process.env["META_APP_SECRET"];
  if (!secret) return false; // fail closed — never trust unsigned webhook payloads
  if (!header?.startsWith("sha256=")) return false;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type InboundMessage = { from: string; text: string; type: string; id: string; name?: string };

/** Stores inbound messages and links them to a patient or lead by phone number. */
export async function recordInbound(clinicId: string, messages: InboundMessage[]) {
  if (!messages.length) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: patients }, { data: leads }] = await Promise.all([
    supabaseAdmin.from("patients").select("id, phone").eq("clinic_id", clinicId),
    supabaseAdmin.from("leads").select("id, phone").eq("clinic_id", clinicId),
  ]);
  const patientByPhone = new Map(
    (patients ?? []).filter((p) => p.phone).map((p) => [normaliseNumber(p.phone!), p.id]),
  );
  const leadByPhone = new Map(
    (leads ?? []).filter((l) => l.phone).map((l) => [normaliseNumber(l.phone!), l.id]),
  );

  const rows = messages.map((m) => {
    const wa = normaliseNumber(m.from);
    return {
      clinic_id: clinicId,
      contact_wa_id: wa,
      contact_name: m.name ?? null,
      patient_id: patientByPhone.get(wa) ?? null,
      lead_id: patientByPhone.get(wa) ? null : (leadByPhone.get(wa) ?? null),
      direction: "incoming",
      body: m.text,
      message_type: m.type,
      status: "Received",
      provider_message_id: m.id,
      sent_at: new Date().toISOString(),
    };
  });
  await supabaseAdmin.from("whatsapp_messages").insert(rows);
  return rows.length;
}

/** Applies delivery receipts from Meta to previously sent messages. */
export async function recordStatuses(clinicId: string, statuses: { id: string; status: string }[]) {
  if (!statuses.length) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const s of statuses) {
    const status =
      s.status === "read"
        ? "Read"
        : s.status === "delivered"
          ? "Delivered"
          : s.status === "failed"
            ? "Failed"
            : "Sent";
    await supabaseAdmin
      .from("whatsapp_messages")
      .update({ status })
      .eq("clinic_id", clinicId)
      .eq("provider_message_id", s.id);
    await supabaseAdmin
      .from("messages_outbox")
      .update({ status: status === "Failed" ? "Failed" : "Sent" })
      .eq("clinic_id", clinicId)
      .eq("provider_message_id", s.id);
  }
  return statuses.length;
}
