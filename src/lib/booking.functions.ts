import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public: everything the self-serve booking page needs to render, for one clinic. */
export const getBookingOptions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ clinicId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
  const clinicId = data.clinicId;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [servicesRes, providersRes, clinicRes] = await Promise.all([
    supabaseAdmin
      .from("services")
      .select("id, name, category, duration_min, price")
      .eq("clinic_id", clinicId)
      .eq("active", true)
      .order("name"),
    supabaseAdmin
      .from("providers")
      .select("id, name, title")
      .eq("clinic_id", clinicId)
      .eq("active", true)
      .order("name"),
    supabaseAdmin
      .from("clinic_profile")
      .select("trade_name, legal_name, phone, city")
      .eq("clinic_id", clinicId)
      .maybeSingle(),
  ]);

  return {
    services: servicesRes.data ?? [],
    providers: providersRes.data ?? [],
    clinic: {
      name: clinicRes.data?.trade_name ?? clinicRes.data?.legal_name ?? "Our clinic",
      phone: clinicRes.data?.phone ?? null,
      city: clinicRes.data?.city ?? null,
    },
  };
});

/** Public: a prospective patient asks the clinic for an appointment slot. */
export const requestBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        clinicId: z.string().uuid(),
        full_name: z.string().min(2).max(120),
        phone: z.string().min(6).max(20),
        email: z.string().email().nullable().optional(),
        service_id: z.string().uuid().nullable().optional(),
        provider_id: z.string().uuid().nullable().optional(),
        preferred_at: z.string().min(10),
        alternate_at: z.string().nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const preferred = new Date(data.preferred_at);
    if (Number.isNaN(preferred.getTime()) || preferred.getTime() < Date.now() - 3_600_000) {
      throw new Error("Please choose a date and time in the future.");
    }

    const digits = data.phone.replace(/\D/g, "").slice(-10);
    let patientId: string | null = null;
    if (digits.length === 10) {
      const { data: existing } = await supabaseAdmin
        .from("patients")
        .select("id, phone")
        .eq("clinic_id", data.clinicId)
        .ilike("phone", `%${digits}%`)
        .limit(1);
      patientId = existing?.[0]?.id ?? null;
    }

    const { error } = await supabaseAdmin.from("appointment_requests").insert({
      clinic_id: data.clinicId,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email ?? null,
      service_id: data.service_id ?? null,
      provider_id: data.provider_id ?? null,
      preferred_at: preferred.toISOString(),
      alternate_at: data.alternate_at ? new Date(data.alternate_at).toISOString() : null,
      notes: data.notes ?? null,
      kind: "new_booking",
      patient_id: patientId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
