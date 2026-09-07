import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateAppointmentTime } from "@/lib/clinic-hours";

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
        .select("trade_name, legal_name, phone, city, working_days, open_time, close_time")
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
        working_days: clinicRes.data?.working_days ?? null,
        open_time: clinicRes.data?.open_time ?? null,
        close_time: clinicRes.data?.close_time ?? null,
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
        birth_date: z
          .string()
          .date()
          .refine((value) => value <= new Date().toISOString().slice(0, 10), {
            message: "Date of birth cannot be in the future",
          })
          .nullable()
          .optional(),
        gender: z.string().min(1),
        service_id: z.string().uuid().nullable().optional(),
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

    // Fetch clinic hours to validate the booking falls within working hours/days
    const { data: clinicProfile } = await supabaseAdmin
      .from("clinic_profile")
      .select("working_days, open_time, close_time")
      .eq("clinic_id", data.clinicId)
      .maybeSingle();

    const preferredError = validateAppointmentTime(preferred, clinicProfile, {
      minMinutesInFuture: 60,
    });
    if (preferredError) {
      throw new Error(preferredError);
    }

    if (data.alternate_at) {
      const alternate = new Date(data.alternate_at);
      if (Number.isNaN(alternate.getTime()) || alternate.getTime() < Date.now() - 3_600_000) {
        throw new Error("Backup appointment date cannot be in the past.");
      }
      if (alternate.getTime() < preferred.getTime()) {
        throw new Error("Backup appointment date must be after or equal to the preferred date.");
      }
      const altError = validateAppointmentTime(alternate, clinicProfile, {
        minMinutesInFuture: 60,
      });
      if (altError) {
        throw new Error(`Backup slot: ${altError}`);
      }
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
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      service_id: data.service_id ?? null,
      preferred_at: preferred.toISOString(),
      alternate_at: data.alternate_at ? new Date(data.alternate_at).toISOString() : null,
      notes: data.notes ?? null,
      kind: "new_booking",
      patient_id: patientId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
