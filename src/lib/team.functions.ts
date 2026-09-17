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
      .select("id, user_id, email, full_name, role, status, provider_id, last_seen_at, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);

    const { data: invites } = await context.supabase
      .from("clinic_invites")
      .select("id, email, role, status, provider_id, expires_at, created_at")
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
        providerId: z.string().uuid().nullable().optional(),
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
      provider_id: data.role === "provider" ? (data.providerId ?? null) : null,
    });
    if (error) {
      throw new Error(
        error.message.includes("row-level security")
          ? "Only clinic admins can invite colleagues"
          : error.message,
      );
    }

    const link = `${data.origin.replace(/\/$/, "")}/join?token=${token}`;
    await context.supabase.from("activity_log").insert({ clinic_id: clinicId, actor_id: context.userId, action: "invite_created", entity_type: "team_member", summary: `Invited ${data.email.toLowerCase()} as ${data.role.replace("_", " ")}` });
    const { deliver } = await import("@/lib/messaging.server");
    const email = await deliver({ clinicId, channel: "Email", recipient: data.email, subject: "You are invited to Noum Klinik", body: `You have been invited to join a clinic workspace as ${data.role.replace("_", " ")}.

Accept your invite: ${link}

This link is intended only for ${data.email}.` });
    return { link, emailSent: email.ok };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("clinic_invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .select("id");

    if (error || !updated || updated.length === 0) {
      throw new Error(
        error?.message.includes("row-level security")
          ? "Only clinic admins can revoke invites"
          : error?.message ?? "Only clinic admins can revoke invites",
      );
    }
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
        providerId: z.string().uuid().nullable().optional(),
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

    const values: { role?: "admin" | "provider" | "front_desk"; status?: string; provider_id?: string | null } = {};
    if (data.role) values.role = data.role;
    if (data.status) values.status = data.status;
    if (data.providerId !== undefined) values.provider_id = data.providerId;
    if (data.role && data.role !== "provider") values.provider_id = null;

    const { data: updated, error } = await context.supabase
      .from("clinic_members")
      .update(values)
      .eq("id", data.id)
      .select("id");

    if (error || !updated || updated.length === 0) {
      throw new Error(
        error?.message.includes("row-level security")
          ? "Only clinic admins can change team access"
          : error?.message ?? "Only clinic admins can change team access",
      );
    }
    await context.supabase.from("activity_log").insert({ clinic_id: target.clinic_id, actor_id: context.userId, action: "team_access_changed", entity_type: "team_member", entity_id: target.id, summary: `Changed access for team member` });
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

    const { data: deleted, error } = await context.supabase
      .from("clinic_members")
      .delete()
      .eq("id", data.id)
      .select("id");

    if (error || !deleted || deleted.length === 0) {
      throw new Error(
        error?.message.includes("row-level security")
          ? "Only clinic admins can remove colleagues"
          : error?.message ?? "Only clinic admins can remove colleagues",
      );
    }
    await context.supabase.from("activity_log").insert({ clinic_id: target.clinic_id, actor_id: context.userId, action: "team_member_removed", entity_type: "team_member", summary: "Removed a team member" });
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
      .select("id, clinic_id, role, email, status, provider_id, expires_at")
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
          provider_id: invite.provider_id,
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
