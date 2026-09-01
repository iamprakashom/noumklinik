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
        kind: z.enum(["intake", "consent", "appointment", "feedback"]),
        consent_template_id: z.string().uuid().nullable().optional(),
        appointment_id: z.string().uuid().nullable().optional(),
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
      appointment_id: data.appointment_id ?? null,
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
      .select("id, kind, clinic_id, patient_id, consent_template_id, appointment_id, expires_at, completed_at")
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
      .select("trade_name, legal_name, google_review_link")
      .eq("clinic_id", link.clinic_id)
      .maybeSingle();

    let appointment: { starts_at: string; service: string | null; provider: string | null } | null = null;
    if ((link.kind === "appointment" || link.kind === "feedback") && link.appointment_id) {
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select("starts_at, status, services(name), providers(name)")
        .eq("id", link.appointment_id)
        .maybeSingle();
      if (appt) {
        appointment = {
          starts_at: appt.starts_at,
          service: (appt.services as { name: string } | null)?.name ?? null,
          provider: (appt.providers as { name: string } | null)?.name ?? null,
        };
      }
    }

    return {
      status: "ok" as const,
      kind: link.kind as "intake" | "consent" | "appointment" | "feedback",
      appointment,
      patientName: patient ? `${patient.first_name} ${patient.last_name}`.trim() : "Patient",
      clinicName: clinic?.trade_name ?? clinic?.legal_name ?? "Our clinic",
      googleReviewLink: clinic?.google_review_link ?? null,
      consent,
    };
  });

/** Public: patient leaves a 1–5 rating after their visit. */
export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, kind, clinic_id, patient_id, appointment_id, expires_at, completed_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "feedback" || link.completed_at || new Date(link.expires_at) < new Date()) {
      throw new Error("This link is no longer valid.");
    }

    const happy = data.rating >= 4;
    const { error } = await supabaseAdmin.from("patient_feedback").insert({
      clinic_id: link.clinic_id,
      patient_id: link.patient_id,
      appointment_id: link.appointment_id,
      rating: data.rating,
      comment: data.comment ?? null,
      is_complaint: !happy,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("patient_links")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", link.id);

    const { data: clinic } = await supabaseAdmin
      .from("clinic_profile")
      .select("google_review_link")
      .eq("clinic_id", link.clinic_id)
      .maybeSingle();

    return {
      ok: true,
      happy,
      reviewLink: happy ? (clinic?.google_review_link ?? null) : null,
    };
  });

/** Public: records that the patient opened the Google review link. */
export const markReviewClicked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("appointment_id, patient_id, kind")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "feedback") return { ok: false };
    const query = supabaseAdmin.from("patient_feedback").update({ review_link_clicked: true });
    if (link.appointment_id) await query.eq("appointment_id", link.appointment_id);
    else if (link.patient_id) await query.eq("patient_id", link.patient_id);
    return { ok: true };
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
    const values: {
      email?: string;
      phone?: string;
      birth_date?: string;
      allergies?: string | null;
      notes?: string | null;
    } = {};
    if (data.email) values.email = data.email;
    if (data.phone) values.phone = data.phone;
    if (data.birth_date) {
      if (data.birth_date > new Date().toISOString().slice(0, 10)) {
          throw new Error("Date of birth cannot be in the future.");
        }   
      values.birth_date = data.birth_date;
    }
    if (data.allergies !== undefined) values.allergies = data.allergies ?? null;
    if (data.notes !== undefined) values.notes = data.notes ?? null;
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
      .select("id, clinic_id, patient_id, consent_template_id, expires_at, completed_at, kind")
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
      clinic_id: link.clinic_id,
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

/** Public: patient confirms they will attend the linked appointment. */
export const confirmAppointment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, kind, appointment_id, expires_at, completed_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "appointment" || !link.appointment_id || new Date(link.expires_at) < new Date()) {
      throw new Error("This link is no longer valid.");
    }
    await supabaseAdmin
      .from("appointments")
      .update({ status: "Confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", link.appointment_id);
    await supabaseAdmin
      .from("patient_links")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", link.id);
    return { ok: true };
  });

/** Public: patient asks the clinic to move the linked appointment. */
export const requestReschedule = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(10),
        preferred_at: z.string().min(10),
        notes: z.string().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("patient_links")
      .select("id, kind, clinic_id, patient_id, appointment_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || link.kind !== "appointment" || !link.appointment_id || new Date(link.expires_at) < new Date()) {
      throw new Error("This link is no longer valid.");
    }
    const preferred = new Date(data.preferred_at);
      if (Number.isNaN(preferred.getTime()) || preferred.getTime() < Date.now() - 5 * 60 * 1000 ) {
      throw new Error("Reschedule preferred date and time must be in the future.");
    }
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("first_name, last_name, phone, email")
      .eq("id", link.patient_id!)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("appointment_requests").insert({
      clinic_id: link.clinic_id,
      full_name: patient ? `${patient.first_name} ${patient.last_name}`.trim() : "Patient",
      phone: patient?.phone ?? "",
      email: patient?.email ?? null,
      preferred_at: new Date(data.preferred_at).toISOString(),
      notes: data.notes ?? null,
      kind: "reschedule",
      appointment_id: link.appointment_id,
      patient_id: link.patient_id,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("appointments")
      .update({ status: "Reschedule requested" })
      .eq("id", link.appointment_id);
    return { ok: true };
  });
