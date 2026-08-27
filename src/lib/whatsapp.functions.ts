import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RoleCtx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "provider" | "front_desk" },
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
};

async function assertStaff(context: RoleCtx) {
  const roles = ["admin", "provider", "front_desk"] as const;
  for (const role of roles) {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: role,
    });
    if (data) return role;
  }
  throw new Error("Only clinic staff can use WhatsApp");
}

async function assertAdmin(context: RoleCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(`Could not verify your role: ${error.message}`);
  if (!data) throw new Error("Only clinic admins can change the WhatsApp connection");
}

/** Connection status and masked credentials for the settings screen. */
export const getWhatsAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { loadSettings, maskSecret } = await import("@/lib/whatsapp.server");
    const s = await loadSettings();
    return {
      display_name: s.display_name,
      phone_number: s.phone_number,
      phone_number_id: s.phone_number_id,
      waba_id: s.waba_id,
      verify_token: s.verify_token,
      enabled: s.enabled,
      status: s.status,
      error_message: s.error_message,
      access_token_masked: maskSecret(s.access_token),
      app_secret_masked: maskSecret(s.app_secret),
    };
  });

export const saveWhatsAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phone_number_id: z.string().max(120).optional().nullable(),
        waba_id: z.string().max(120).optional().nullable(),
        access_token: z.string().max(1000).optional().nullable(),
        app_secret: z.string().max(400).optional().nullable(),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { loadSettings } = await import("@/lib/whatsapp.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await loadSettings();
    await supabaseAdmin
      .from("whatsapp_settings")
      .update({
        phone_number_id: data.phone_number_id || existing.phone_number_id,
        waba_id: data.waba_id || existing.waba_id,
        access_token: data.access_token || existing.access_token,
        app_secret: data.app_secret || existing.app_secret,
        enabled: data.enabled,
      })
      .eq("id", existing.id);
    return { ok: true };
  });

export const testWhatsAppConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { checkConnection } = await import("@/lib/whatsapp.server");
    const result = await checkConnection();
    if (!result.ok) throw new Error(result.error);
    return result;
  });

/** Approved templates as reported by Meta, for the templates list. */
export const listWhatsAppTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { fetchRemoteTemplates } = await import("@/lib/whatsapp.server");
    return await fetchRemoteTemplates();
  });

/** Inbox conversation list: newest message per contact with unread counts. */
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("whatsapp_messages")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const byContact = new Map<
      string,
      {
        contact_wa_id: string;
        contact_name: string | null;
        patient_id: string | null;
        lead_id: string | null;
        last_body: string;
        last_at: string;
        last_direction: string;
        unread: number;
      }
    >();
    for (const m of data ?? []) {
      const current = byContact.get(m.contact_wa_id);
      if (!current) {
        byContact.set(m.contact_wa_id, {
          contact_wa_id: m.contact_wa_id,
          contact_name: m.contact_name,
          patient_id: m.patient_id,
          lead_id: m.lead_id,
          last_body: m.body,
          last_at: m.sent_at,
          last_direction: m.direction,
          unread: m.direction === "incoming" && !m.read_at ? 1 : 0,
        });
      } else {
        if (m.direction === "incoming" && !m.read_at) current.unread += 1;
        if (!current.contact_name && m.contact_name) current.contact_name = m.contact_name;
        if (!current.patient_id && m.patient_id) current.patient_id = m.patient_id;
      }
    }
    return [...byContact.values()];
  });

/** Full thread for one contact, marking incoming messages as read. */
export const listThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ waId: z.string().min(5) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_wa_id", data.waId)
      .order("sent_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("whatsapp_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("contact_wa_id", data.waId)
      .eq("direction", "incoming")
      .is("read_at", null);

    return rows ?? [];
  });

/** Sends a reply in an open conversation and logs it in the thread. */
export const sendWhatsAppReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        waId: z.string().min(5),
        body: z.string().min(1).max(4000),
        patientId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { sendText, normaliseNumber } = await import("@/lib/whatsapp.server");
    const result = await sendText(data.waId, data.body);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("whatsapp_messages").insert({
      contact_wa_id: normaliseNumber(data.waId),
      patient_id: data.patientId ?? null,
      lead_id: data.leadId ?? null,
      direction: "outgoing",
      body: data.body,
      status: result.ok ? "Sent" : "Failed",
      error: result.ok ? null : result.error,
      provider_message_id: result.ok ? (result.providerId ?? null) : null,
      sent_at: new Date().toISOString(),
    });

    if (!result.ok) throw new Error(result.error);
    return { ok: true };
  });

/** Starts a new conversation with a patient or lead using an approved template. */
export const startWhatsAppConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phone: z.string().min(5),
        templateName: z.string().min(1),
        language: z.string().min(2).max(10).default("en"),
        variables: z.array(z.string()).default([]),
        patientId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { sendTemplate, normaliseNumber } = await import("@/lib/whatsapp.server");
    const result = await sendTemplate(data.phone, data.templateName, data.language, data.variables);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("whatsapp_messages").insert({
      contact_wa_id: normaliseNumber(data.phone),
      patient_id: data.patientId ?? null,
      direction: "outgoing",
      body: `[template] ${data.templateName}${data.variables.length ? ` — ${data.variables.join(", ")}` : ""}`,
      message_type: "template",
      status: result.ok ? "Sent" : "Failed",
      error: result.ok ? null : result.error,
      provider_message_id: result.ok ? (result.providerId ?? null) : null,
      sent_at: new Date().toISOString(),
    });

    if (!result.ok) throw new Error(result.error);
    return { ok: true };
  });
