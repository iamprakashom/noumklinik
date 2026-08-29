import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["admin", "provider", "front_desk"]);

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeToken() {
  return `${globalThis.crypto.randomUUID()}${globalThis.crypto.randomUUID()}`.replace(/-/g, "");
}

/** Clinics the signed-in user belongs to, plus invites waiting on their email. */
export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims['email'] as string | undefined) ?? null;

    const { data: memberships, error } = await context.supabase
      .from("clinic_members")
      .select("id, clinic_id, role, status, clinics(id, name)")
      .eq("user_id", context.userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const invites = email
      ? ((
          await supabaseAdmin
            .from("clinic_invites")
            .select("id, clinic_id, role, expires_at, clinics(name)")
            .eq("status", "pending")
            .ilike("email", email)
            .gt("expires_at", new Date().toISOString())
        ).data ?? [])
      : [];

    return {
      email,
      memberships: (memberships ?? []).map((m) => ({
        clinicId: m.clinic_id,
        role: m.role,
        clinicName: (m.clinics as { name: string } | null)?.name ?? "Clinic",
      })),
      invites: invites.map((i) => ({
        id: i.id,
        clinicName: (i.clinics as { name: string } | null)?.name ?? "Clinic",
        role: i.role,
      })),
    };
  });

/** First-run: create a clinic workspace and become its admin. */
export const createClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().trim().min(2).max(120), state: z.string().trim().max(60).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .limit(1);
    if (existing && existing.length > 0) return { clinicId: existing[0]!.clinic_id };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({ name: data.name, created_by: context.userId })
      .select("id")
      .single();
    if (clinicError || !clinic) throw new Error(clinicError?.message ?? "Could not create the clinic");

    const { error: memberError } = await supabaseAdmin.from("clinic_members").insert({
      clinic_id: clinic.id,
      user_id: context.userId,
      email: (context.claims['email'] as string | undefined) ?? null,
      role: "admin",
      status: "active",
    });
    if (memberError) throw new Error(memberError.message);

    await supabaseAdmin.from("clinic_profile").insert({
      clinic_id: clinic.id,
      singleton: true,
      legal_name: data.name,
      trade_name: data.name,
      state: data.state || "Karnataka",
      state_code: "29",
    });

    return { clinicId: clinic.id };
  });

/** Roster + pending invites for the caller's clinic. */
export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members, error } = await context.supabase
      .from("clinic_members")
      .select("id, user_id, email, full_name, role, status, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);

    const { data: invites } = await context.supabase
      .from("clinic_invites")
      .select("id, email, role, status, expires_at, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return {
      me: context.userId,
      members: members ?? [],
      invites: (invites ?? []).filter((i) => new Date(i.expires_at) > new Date()),
    };
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(200),
        role: roleSchema,
        origin: z.string().url().max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: clinicId, error: clinicError } = await context.supabase.rpc("current_clinic_id");
    if (clinicError || !clinicId) throw new Error("You are not part of a clinic yet");

    const token = makeToken();
    const tokenHash = await sha256Hex(token);

    // RLS allows this only for clinic admins.
    const { error } = await context.supabase.from("clinic_invites").insert({
      clinic_id: clinicId,
      email: data.email.toLowerCase(),
      role: data.role,
      token_hash: tokenHash,
      invited_by: context.userId,
    });
    if (error) {
      throw new Error(
        error.message.includes("row-level security")
          ? "Only clinic admins can invite colleagues"
          : error.message,
      );
    }

    return { link: `${data.origin.replace(/\/$/, "")}/join?token=${token}` };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clinic_invites")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        role: roleSchema.optional(),
        status: z.enum(["active", "suspended"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: target, error: readError } = await context.supabase
      .from("clinic_members")
      .select("id, user_id, clinic_id, role, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError || !target) throw new Error("Member not found");

    const demoting = (data.role && data.role !== "admin") || data.status === "suspended";
    if (target.role === "admin" && demoting) {
      const { count } = await context.supabase
        .from("clinic_members")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", target.clinic_id)
        .eq("role", "admin")
        .eq("status", "active");
      if ((count ?? 0) <= 1) throw new Error("A clinic needs at least one admin");
    }

    const values: { role?: "admin" | "provider" | "front_desk"; status?: string } = {};
    if (data.role) values.role = data.role;
    if (data.status) values.status = data.status;

    const { error } = await context.supabase.from("clinic_members").update(values).eq("id", data.id);
    if (error) {
      throw new Error(
        error.message.includes("row-level security")
          ? "Only clinic admins can change team access"
          : error.message,
      );
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: target } = await context.supabase
      .from("clinic_members")
      .select("id, user_id, clinic_id, role")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("Member not found");
    if (target.user_id === context.userId) throw new Error("You cannot remove yourself");

    const { error } = await context.supabase.from("clinic_members").delete().eq("id", data.id);
    if (error) {
      throw new Error(
        error.message.includes("row-level security")
          ? "Only clinic admins can remove colleagues"
          : error.message,
      );
    }
    return { ok: true };
  });

/** Accept an invite from the emailed link, or from the onboarding screen. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10).max(200).optional(), inviteId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = ((context.claims['email'] as string | undefined) ?? "").toLowerCase();

    let query = supabaseAdmin
      .from("clinic_invites")
      .select("id, clinic_id, role, email, status, expires_at")
      .eq("status", "pending");
    if (data.token) query = query.eq("token_hash", await sha256Hex(data.token));
    else if (data.inviteId) query = query.eq("id", data.inviteId);
    else throw new Error("Invalid invite");

    const { data: invite } = await query.maybeSingle();
    if (!invite) throw new Error("This invite is no longer valid");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired");
    if (invite.email.toLowerCase() !== email) {
      throw new Error(`This invite was sent to ${invite.email}. Sign in with that email to accept it.`);
    }

    const { error } = await supabaseAdmin
      .from("clinic_members")
      .upsert(
        {
          clinic_id: invite.clinic_id,
          user_id: context.userId,
          email,
          role: invite.role,
          status: "active",
        },
        { onConflict: "clinic_id,user_id" },
      );
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("clinic_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);

    return { clinicId: invite.clinic_id };
  });
