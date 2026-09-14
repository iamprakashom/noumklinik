/** Server-only unified messaging storage and provider adapters. */

const GRAPH = "https://graph.facebook.com/v20.0";

export type InboxChannel = "whatsapp" | "messenger" | "instagram";

type JsonObject = Record<string, unknown>;

export type StoreMessageInput = {
  clinicId: string;
  channel: InboxChannel;
  providerConversationId: string;
  providerCustomerId: string;
  providerMessageId?: string | null | undefined;
  customerName?: string | null | undefined;
  customerUsername?: string | null | undefined;
  customerAvatarUrl?: string | null | undefined;
  patientId?: string | null | undefined;
  leadId?: string | null | undefined;
  direction: "incoming" | "outgoing";
  body: string;
  messageType?: string | undefined;
  attachment?: JsonObject | null | undefined;
  status: string;
  error?: string | null | undefined;
  sentAt?: string | undefined;
  legacyWhatsAppMessageId?: string | null | undefined;
};

export async function getConnection(
  clinicId: string,
  channel: InboxChannel,
  providerAccountId?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("inbox_connections")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("channel", channel);
  if (providerAccountId) query = query.eq("provider_account_id", providerAccountId);
  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function upsertConnection(input: {
  clinicId: string;
  channel: InboxChannel;
  providerAccountId: string;
  providerParentId?: string | null;
  displayName?: string | null;
  username?: string | null;
  pictureUrl?: string | null;
  status?: string;
  enabled?: boolean;
  capabilities?: Record<string, unknown>;
  lastError?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("inbox_connections")
    .upsert(
      {
        clinic_id: input.clinicId,
        channel: input.channel,
        provider_account_id: input.providerAccountId,
        provider_parent_id: input.providerParentId ?? null,
        display_name: input.displayName ?? null,
        username: input.username ?? null,
        picture_url: input.pictureUrl ?? null,
        status: input.status ?? "connected",
        enabled: input.enabled ?? true,
        capabilities: (input.capabilities ?? { text: true, attachments: true }) as never,
        last_error: input.lastError ?? null,
        last_checked_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "clinic_id,channel,provider_account_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function storeMessage(input: StoreMessageInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sentAt = input.sentAt ?? new Date().toISOString();
  const connection = await getConnection(input.clinicId, input.channel);
  const { data: existing } = await supabaseAdmin
    .from("inbox_conversations")
    .select("id, unread_count, patient_id, lead_id")
    .eq("clinic_id", input.clinicId)
    .eq("channel", input.channel)
    .eq("provider_conversation_id", input.providerConversationId)
    .maybeSingle();

  const unread = (existing?.unread_count ?? 0) + (input.direction === "incoming" ? 1 : 0);
  const conversationValues = {
    clinic_id: input.clinicId,
    connection_id: connection?.id ?? null,
    channel: input.channel,
    provider_conversation_id: input.providerConversationId,
    provider_customer_id: input.providerCustomerId,
    customer_name: input.customerName ?? null,
    customer_username: input.customerUsername ?? null,
    customer_avatar_url: input.customerAvatarUrl ?? null,
    patient_id: input.patientId ?? existing?.patient_id ?? null,
    lead_id: input.leadId ?? existing?.lead_id ?? null,
    last_message: input.body,
    last_message_at: sentAt,
    last_direction: input.direction,
    unread_count: unread,
    reply_window_expires_at:
      input.direction === "incoming"
        ? new Date(new Date(sentAt).getTime() + 24 * 60 * 60_000).toISOString()
        : undefined,
  };
  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from("inbox_conversations")
    .upsert(conversationValues, { onConflict: "clinic_id,channel,provider_conversation_id" })
    .select("id")
    .single();
  if (conversationError) throw new Error(conversationError.message);

  const { error } = await supabaseAdmin.from("inbox_messages").upsert(
    {
      clinic_id: input.clinicId,
      conversation_id: conversation.id,
      legacy_whatsapp_message_id: input.legacyWhatsAppMessageId ?? null,
      provider_message_id: input.providerMessageId ?? null,
      direction: input.direction,
      body: input.body,
      message_type: input.messageType ?? "text",
      attachment: input.attachment ?? null,
      status: input.status,
      error: input.error ?? null,
      provider_sent_at: sentAt,
    },
    input.providerMessageId
      ? { onConflict: "clinic_id,provider_message_id", ignoreDuplicates: true }
      : undefined,
  );
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  return conversation.id;
}

export async function updateMessageStatus(
  clinicId: string,
  providerMessageId: string,
  status: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("inbox_messages")
    .update({ status, ...(status === "Read" ? { read_at: new Date().toISOString() } : {}) })
    .eq("clinic_id", clinicId)
    .eq("provider_message_id", providerMessageId);
}

export async function sendMetaText(input: {
  clinicId: string;
  channel: "messenger" | "instagram";
  recipientId: string;
  body: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: meta } = await supabaseAdmin
    .from("meta_connections")
    .select("page_id, page_access_token, instagram_account_id, messenger_enabled, instagram_enabled")
    .eq("clinic_id", input.clinicId)
    .maybeSingle();
  const enabled = input.channel === "messenger" ? meta?.messenger_enabled : meta?.instagram_enabled;
  if (!enabled || !meta?.page_access_token) return { ok: false as const, error: `${input.channel === "messenger" ? "Messenger" : "Instagram"} is not connected` };
  const accountId = input.channel === "instagram" ? meta.instagram_account_id : meta.page_id;
  if (!accountId) return { ok: false as const, error: "The connected account is unavailable" };
  const response = await fetch(`${GRAPH}/${accountId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${meta.page_access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: input.recipientId }, message: { text: input.body } }),
  });
  const json = (await response.json().catch(() => null)) as { message_id?: string; error?: { message?: string } } | null;
  if (!response.ok || json?.error) return { ok: false as const, error: json?.error?.message ?? "Message could not be sent" };
  return { ok: true as const, providerId: json?.message_id };
}