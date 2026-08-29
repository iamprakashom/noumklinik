import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireClinicId } from "@/lib/clinic.server";

/** Sends a single queued outbox message immediately. */
export const sendOutboxMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("messages_outbox")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Message not found");

    const { deliver } = await import("@/lib/messaging.server");
    const result = await deliver({
      clinicId: row.clinic_id,
      channel: row.channel,
      recipient: row.recipient ?? "",
      subject: row.subject,
      body: row.body,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

    if (!result.ok) throw new Error(result.error ?? "Send failed");
    return { ok: true };
  });

/** Queues and immediately sends a session reminder for one appointment. */
export const sendAppointmentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        channel: z.enum(["WhatsApp", "SMS", "Email"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: appt, error } = await context.supabase
      .from("appointments")
      .select("id, starts_at, patient_id, service_id, provider_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (error || !appt) throw new Error("Appointment not found");

    const [{ data: patient }, { data: service }, { data: provider }] = await Promise.all([
      context.supabase
        .from("patients")
        .select("id, first_name, last_name, email, phone, preferred_channel")
        .eq("id", appt.patient_id)
        .maybeSingle(),
      appt.service_id
        ? context.supabase.from("services").select("name").eq("id", appt.service_id).maybeSingle()
        : Promise.resolve({ data: null }),
      appt.provider_id
        ? context.supabase.from("providers").select("name").eq("id", appt.provider_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!patient) throw new Error("Patient not found");

    const channel = data.channel ?? patient.preferred_channel ?? "WhatsApp";
    const recipient = channel === "Email" ? patient.email : patient.phone;
    const when = new Date(appt.starts_at).toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const body = `Hi ${patient.first_name}, this is a reminder for your ${
      service?.name ?? "appointment"
    } on ${when}${provider?.name ? ` with ${provider.name}` : ""}. Reply here to reschedule.`;

    const { deliver } = await import("@/lib/messaging.server");
    const clinicId = await requireClinicId(context.supabase);
    const result = await deliver({
      clinicId,
      channel,
      recipient: recipient ?? "",
      subject: "Your upcoming appointment",
      body,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("messages_outbox").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      appointment_id: appt.id,
      channel,
      recipient,
      subject: "Your upcoming appointment",
      body,
      status: result.ok ? "Sent" : "Failed",
      scheduled_for: new Date().toISOString(),
      sent_at: result.ok ? new Date().toISOString() : null,
      provider_message_id: result.providerId ?? null,
      error: result.ok ? null : (result.error ?? "Send failed"),
    });

    if (!result.ok) throw new Error(result.error ?? "Send failed");
    return { ok: true };
  });
