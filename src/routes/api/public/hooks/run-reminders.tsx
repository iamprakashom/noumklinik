import { createFileRoute } from "@tanstack/react-router";
import type { TablesInsert } from "@/integrations/supabase/types";

type Rule = {
  id: string;
  trigger_type: string;
  offset_hours: number;
  channel: string;
  template_id: string | null;
  enabled: boolean;
};

function render(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? "");
}

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [rulesRes, templatesRes, apptRes, patientsRes, providersRes, servicesRes, outboxRes] =
    await Promise.all([
      supabaseAdmin.from("automation_rules").select("*").eq("enabled", true),
      supabaseAdmin.from("message_templates").select("*"),
      supabaseAdmin.from("appointments").select("*"),
      supabaseAdmin.from("patients").select("*"),
      supabaseAdmin.from("providers").select("*"),
      supabaseAdmin.from("services").select("*"),
      supabaseAdmin.from("messages_outbox").select("rule_id, appointment_id"),
    ]);

  const rules = (rulesRes.data ?? []) as Rule[];
  const templates = templatesRes.data ?? [];
  const appointments = apptRes.data ?? [];
  const patients = patientsRes.data ?? [];
  const providers = providersRes.data ?? [];
  const services = servicesRes.data ?? [];
  const existing = new Set(
    (outboxRes.data ?? []).map((m) => `${m.rule_id ?? ""}:${m.appointment_id ?? ""}`),
  );

  const baseUrl = (
    process.env["PUBLIC_SITE_URL"] ?? "https://beat-flow-dash.lovable.app"
  ).replace(/\/$/, "");
  const now = Date.now();
  const horizon = now + 14 * 86_400_000;
  const rows: TablesInsert<"messages_outbox">[] = [];

  for (const rule of rules) {
    const template = templates.find((t) => t.id === rule.template_id);
    if (!template) continue;

    for (const appt of appointments) {
      if (rule.trigger_type === "before_appointment" && appt.status === "Cancelled") continue;
      if (rule.trigger_type === "after_treatment" && appt.status !== "Completed") continue;
      if (rule.trigger_type === "no_show" && appt.status !== "No-show") continue;
      if (!["before_appointment", "after_treatment", "no_show"].includes(rule.trigger_type)) continue;

      const key = `${rule.id}:${appt.id}`;
      if (existing.has(key)) continue;

      const start = new Date(appt.starts_at).getTime();
      const when = start + rule.offset_hours * 3_600_000;
      if (when > horizon) continue;

      const patient = patients.find((p) => p.id === appt.patient_id);
      if (!patient) continue;
      const provider = providers.find((p) => p.id === appt.provider_id);
      const service = services.find((s) => s.id === appt.service_id);

      const mintLink = async (kind: "appointment" | "feedback") => {
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
        const { error: linkError } = await supabaseAdmin.from("patient_links").insert({
          token,
          patient_id: patient.id,
          appointment_id: appt.id,
          kind,
        });
        return linkError ? "" : `${baseUrl}/p/${token}`;
      };

      const text = `${template.body} ${template.subject ?? ""}`;
      let confirmUrl = "";
      if (/\{\{\s*confirm_link\s*\}\}/.test(text)) confirmUrl = await mintLink("appointment");
      let feedbackUrl = "";
      if (/\{\{\s*feedback_link\s*\}\}/.test(text)) feedbackUrl = await mintLink("feedback");

      const vars = {
        confirm_link: confirmUrl,
        feedback_link: feedbackUrl,

        first_name: patient.first_name,
        last_name: patient.last_name,
        service: service?.name ?? "your treatment",
        provider: provider?.name ?? "your provider",
        time: new Date(appt.starts_at).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      rows.push({
        patient_id: patient.id,
        appointment_id: appt.id,
        rule_id: rule.id,
        channel: rule.channel,
        recipient: rule.channel === "Email" ? patient.email : patient.phone,
        subject: template.subject ? render(template.subject, vars) : null,
        body: render(template.body, vars),
        status: "Queued",
        scheduled_for: new Date(when).toISOString(),
      });
      existing.add(key);
    }
  }

  if (rows.length) {
    const { error } = await supabaseAdmin.from("messages_outbox").insert(rows);
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

export const Route = createFileRoute("/api/public/hooks/run-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) return new Response("Scheduler not configured", { status: 503 });
        const auth = request.headers.get("authorization") ?? "";
        const provided = request.headers.get("x-cron-secret") ?? auth.replace(/^Bearer\s+/i, "");
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });
        try {
          const queued = await run();
          const { flushOutbox } = await import("@/lib/messaging.server");
          const { sent, failed } = await flushOutbox();
          return Response.json({ queued, sent, failed });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
