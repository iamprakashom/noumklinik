import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireClinicId } from "@/lib/clinic.server";

const channel = z.enum(["all", "whatsapp", "messenger", "instagram"]);

export const listInboxConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ channel: channel.default("all"), unreadOnly: z.boolean().default(false), search: z.string().max(100).default(""), cursor: z.string().datetime().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const clinicId = await requireClinicId(context.supabase);
    let query = context.supabase
      .from("inbox_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false })
      .limit(40);
    if (data.channel !== "all") query = query.eq("channel", data.channel);
    if (data.unreadOnly) query = query.gt("unread_count", 0);
    if (data.search.trim()) {
      const safe = data.search.trim().replace(/[,%()]/g, "");
      query = query.or(`customer_name.ilike.%${safe}%,customer_username.ilike.%${safe}%,provider_customer_id.ilike.%${safe}%`);
    }
    if (data.cursor) query = query.lt("last_message_at", data.cursor);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], nextCursor: rows?.length === 40 ? rows[39]?.last_message_at ?? null : null };
  });

export const listInboxThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid(), before: z.string().datetime().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await requireClinicId(context.supabase);
    let query = context.supabase
      .from("inbox_messages")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("conversation_id", data.conversationId)
      .order("provider_sent_at", { ascending: false })
      .limit(100);
    if (data.before) query = query.lt("provider_sent_at", data.before);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    await context.supabase
      .from("inbox_conversations")
      .update({ unread_count: 0 })
      .eq("clinic_id", clinicId)
      .eq("id", data.conversationId);
    await context.supabase
      .from("inbox_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
      .eq("conversation_id", data.conversationId)
      .eq("direction", "incoming")
      .is("read_at", null);
    return (rows ?? []).reverse();
  });

export const sendInboxReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await requireClinicId(context.supabase);
    const { data: conversation, error } = await context.supabase
      .from("inbox_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("id", data.conversationId)
      .single();
    if (error || !conversation) throw new Error("Conversation not found");
    const expiry = conversation.reply_window_expires_at ? new Date(conversation.reply_window_expires_at).getTime() : 0;
    if (Date.now() > expiry) throw new Error("The 24-hour reply window has closed for this conversation");

    let result: { ok: boolean; providerId?: string; error?: string };
    if (conversation.channel === "whatsapp") {
      const { sendText } = await import("@/lib/whatsapp.server");
      result = await sendText(clinicId, conversation.provider_customer_id, data.body);
    } else if (conversation.channel === "messenger" || conversation.channel === "instagram") {
      const { sendMetaText } = await import("@/lib/inbox.server");
      result = await sendMetaText({ clinicId, channel: conversation.channel, recipientId: conversation.provider_customer_id, body: data.body });
    } else {
      throw new Error("Unsupported messaging channel");
    }

    const { storeMessage } = await import("@/lib/inbox.server");
    await storeMessage({
      clinicId,
      channel: conversation.channel as "whatsapp" | "messenger" | "instagram",
      providerConversationId: conversation.provider_conversation_id,
      providerCustomerId: conversation.provider_customer_id,
      providerMessageId: result.providerId ?? null,
      customerName: conversation.customer_name,
      customerUsername: conversation.customer_username,
      patientId: conversation.patient_id,
      leadId: conversation.lead_id,
      direction: "outgoing",
      body: data.body,
      status: result.ok ? "Sent" : "Failed",
      error: result.ok ? null : result.error,
    });
    if (!result.ok) throw new Error(result.error ?? "Message could not be sent");
    return { ok: true };
  });

export const linkInboxConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid(), patientId: z.string().uuid().nullable(), leadId: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await requireClinicId(context.supabase);
    const { error } = await context.supabase
      .from("inbox_conversations")
      .update({ patient_id: data.patientId, lead_id: data.patientId ? null : data.leadId })
      .eq("clinic_id", clinicId)
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });