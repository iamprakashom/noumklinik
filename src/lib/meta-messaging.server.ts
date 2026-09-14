/** Server-only processing for Facebook Page Messenger and Instagram Direct. */

type MetaMessageEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
  delivery?: { mids?: string[] };
  read?: { watermark?: number };
};

export async function processMessagingEntry(entry: {
  id?: string;
  messaging?: MetaMessageEvent[];
}) {
  if (!entry.id) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: meta } = await supabaseAdmin
    .from("meta_connections")
    .select("clinic_id, page_id, instagram_account_id")
    .or(`page_id.eq.${entry.id},instagram_account_id.eq.${entry.id}`)
    .maybeSingle();
  if (!meta) return 0;
  const channel = meta.instagram_account_id === entry.id ? "instagram" : "messenger";
  const { storeMessage, updateMessageStatus } = await import("@/lib/inbox.server");
  let received = 0;
  for (const event of entry.messaging ?? []) {
    for (const id of event.delivery?.mids ?? []) await updateMessageStatus(meta.clinic_id, id, "Delivered");
    if (!event.message?.mid) continue;
    const incoming = !event.message.is_echo;
    const customerId = incoming ? event.sender?.id : event.recipient?.id;
    if (!customerId) continue;
    const attachment = event.message.attachments?.[0];
    await storeMessage({
      clinicId: meta.clinic_id,
      channel,
      providerConversationId: customerId,
      providerCustomerId: customerId,
      providerMessageId: event.message.mid,
      direction: incoming ? "incoming" : "outgoing",
      body: event.message.text ?? (attachment ? `[${attachment.type ?? "attachment"}]` : ""),
      messageType: attachment?.type ?? "text",
      attachment: attachment?.payload?.url ? { url: attachment.payload.url, type: attachment.type ?? "file" } : null,
      status: incoming ? "Received" : "Sent",
      sentAt: event.timestamp ? new Date(event.timestamp).toISOString() : undefined,
    });
    received += incoming ? 1 : 0;
  }
  return received;
}