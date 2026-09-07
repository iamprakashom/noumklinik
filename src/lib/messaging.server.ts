/** Server-only message delivery over WhatsApp, SMS and email. */

export type SendInput = {
  clinicId: string;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
};

export type SendResult = {
  ok: boolean;
  providerId?: string | undefined;
  error?: string | undefined;
};

async function sendWhatsApp(input: SendInput): Promise<SendResult> {
  const { sendText } = await import("@/lib/whatsapp.server");
  const result = await sendText(input.clinicId, input.recipient, input.body);
  return result.ok
    ? { ok: true, providerId: result.providerId }
    : { ok: false, error: result.error };
}

async function sendSms(input: SendInput): Promise<SendResult> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!sid || !token || !from) return { ok: false, error: "SMS is not connected" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: input.recipient, From: from, Body: input.body }),
  });
  const json = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok) return { ok: false, error: json.message ?? "SMS send failed" };
  return { ok: true, providerId: json.sid };
}

async function sendEmail(input: SendInput): Promise<SendResult> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"] ?? "Noum Klinik <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "Email is not connected" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: input.subject ?? "A note from your clinic",
      text: input.body,
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, error: json.message ?? "Email send failed" };
  return { ok: true, providerId: json.id };
}

export async function deliver(input: SendInput): Promise<SendResult> {
  if (!input.recipient) return { ok: false, error: "No recipient on file" };
  try {
    if (input.channel === "WhatsApp") return await sendWhatsApp(input);
    if (input.channel === "SMS") return await sendSms(input);
    if (input.channel === "Email") return await sendEmail(input);
    return { ok: false, error: `Unsupported channel: ${input.channel}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

/** Sends every queued outbox message that is due, updating delivery status. */
export async function flushOutbox(limit = 50) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("messages_outbox")
    .select("*")
    .eq("status", "Queued")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const row of data ?? []) {
    const result = await deliver({
      clinicId: row.clinic_id,
      channel: row.channel,
      recipient: row.recipient ?? "",
      subject: row.subject,
      body: row.body,
    });
    await supabaseAdmin
      .from("messages_outbox")
      .update(
        result.ok
          ? {
              status: "Sent",
              sent_at: new Date().toISOString(),
              provider_message_id: result.providerId ?? null,
              error: null,
            }
          : { status: "Failed", error: result.error ?? "Send failed" },
      )
      .eq("id", row.id);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
