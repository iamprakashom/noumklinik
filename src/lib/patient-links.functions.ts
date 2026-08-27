import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().min(10) });

/** Staff-only: mint a shareable intake or consent link for a patient. */
export const createPatientLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        patient_id: z.string().uuid(),
        kind: z.enum(["intake", "consent"]),
        consent_template_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
    const { error } = await context.supabase.from("patient_links").insert({
      token,
      patient_id: data.patient_id,
      kind: data.kind,
      consent_template_id: data.consent_template_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { token };
  });

/** Public: resolve a token into the minimal payload the patient page needs. */
export const getPatientLink = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, kind, patient_id, consent_template_id, expires_at, completed_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) return { status: "invalid" as const };
    if (new Date(link.expires_at) < new Date()) return { status: "expired" as const };
    if (link.completed_at) return { status: "completed" as const };

    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("first_name, last_name")
      .eq("id", link.patient_id!)
      .maybeSingle();

    let consent: { name: string; body: string } | null = null;
    if (link.kind === "consent" && link.consent_template_id) {
      const { data: tpl } = await supabaseAdmin
        .from("consent_templates")
        .select("name, body")
        .eq("id", link.consent_template_id)
        .maybeSingle();
      consent = tpl ?? null;
    }

    const { data: clinic } = await supabaseAdmin
      .from("clinic_profile")
      .select("trade_name, legal_name")
      .limit(1)
      .maybeSingle();

    return {
      status: "ok" as const,
      kind: link.kind as "intake" | "consent",
      patientName: patient ? `${patient.first_name} ${patient.last_name}`.trim() : "Patient",
      clinicName: clinic?.trade_name ?? clinic?.legal_name ?? "Our clinic",
      consent,
    };
  });

/** Public: patient submits their pre-visit intake answers. */
export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        email: z.string().email().nullable().optional(),
        phone: z.string().max(20).nullable().optional(),
        birth_date: z.string().nullable().optional(),
        allergies: z.string().max(2000).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, patient_id, expires_at, completed_at, kind")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "intake" || link.completed_at || new Date(link.expires_at) < new Date()) {
      throw new Error("This link is no longer valid.");
    }
    const values: Record<string, unknown> = {};
    if (data.email) values['email'] = data.email;
    if (data.phone) values['phone'] = data.phone;
    if (data.birth_date) values['birth_date'] = data.birth_date;
    if (data.allergies !== undefined) values['allergies'] = data.allergies;
    if (data.notes !== undefined) values['notes'] = data.notes;
    if (Object.keys(values).length > 0) {
      await supabaseAdmin.from("patients").update(values).eq("id", link.patient_id!);
    }
    await supabaseAdmin
      .from("patient_links")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", link.id);
    return { ok: true };
  });

/** Public: patient signs a consent form from their own device. */
export const submitConsent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        signature_name: z.string().min(2).max(120),
        signature_data: z.string().max(400_000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, patient_id, consent_template_id, expires_at, completed_at, kind")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "consent" || link.completed_at || new Date(link.expires_at) < new Date()) {
      throw new Error("This link is no longer valid.");
    }
    let templateName = "Consent";
    if (link.consent_template_id) {
      const { data: tpl } = await supabaseAdmin
        .from("consent_templates")
        .select("name")
        .eq("id", link.consent_template_id)
        .maybeSingle();
      templateName = tpl?.name ?? templateName;
    }
    const { error } = await supabaseAdmin.from("patient_consents").insert({
      patient_id: link.patient_id!,
      template_id: link.consent_template_id,
      template_name: templateName,
      signature_name: data.signature_name,
      signature_data: data.signature_data ?? null,
      signed_via: "Patient device",
      signed_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("patient_links")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", link.id);
    return { ok: true };
  });
