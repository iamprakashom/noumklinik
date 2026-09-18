import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: clinicId, error: clinicError } = await context.supabase.rpc("current_clinic_id");
    if (clinicError || !clinicId) throw new Error("No active branch found");

    const { data: current, error: currentError } = await context.supabase
      .from("clinics")
      .select("organization_id, organizations(name)")
      .eq("id", clinicId)
      .single();
    if (currentError) throw new Error(currentError.message);

    const { data: owner } = await context.supabase.rpc("is_organization_owner", {
      _organization_id: current.organization_id,
    });
    const { data: branches, error } = await context.supabase
      .from("clinics")
      .select("id, name, branch_code, active, created_at")
      .eq("organization_id", current.organization_id)
      .order("created_at");
    if (error) throw new Error(error.message);

    return {
      organizationId: current.organization_id,
      organizationName: (current.organizations as { name: string } | null)?.name ?? "Clinic group",
      isOwner: Boolean(owner),
      branches: branches ?? [],
    };
  });

export const createBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      code: z.string().trim().max(20).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("No active branch found");
    const { data: current } = await context.supabase
      .from("clinics")
      .select("organization_id")
      .eq("id", clinicId)
      .single();
    if (!current) throw new Error("Clinic group not found");
    const { data: owner } = await context.supabase.rpc("is_organization_owner", {
      _organization_id: current.organization_id,
    });
    if (!owner) throw new Error("Only an organization owner can add a branch");

    const { data: branch, error } = await context.supabase
      .from("clinics")
      .insert({
        name: data.name,
        branch_code: data.code?.toUpperCase() || null,
        organization_id: current.organization_id,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !branch) throw new Error(error?.message ?? "Could not create branch");

    const email = (context.claims['email'] as string | undefined) ?? null;
    const { error: memberError } = await context.supabase.from("clinic_members").insert({
      clinic_id: branch.id,
      user_id: context.userId,
      email,
      role: "admin",
      status: "active",
    });
    if (memberError) throw new Error(memberError.message);

    const { data: sourceProfile } = await context.supabase
      .from("clinic_profile")
      .select("legal_name, state, state_code, declaration, working_days, open_time, close_time")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    const profile = sourceProfile ?? {
      legal_name: data.name,
      state: "Karnataka",
      state_code: "29",
      declaration: "We declare that this invoice shows the actual price of the services described.",
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      open_time: "09:00",
      close_time: "18:00",
    };
    const { error: profileError } = await context.supabase.from("clinic_profile").insert({
      ...profile,
      clinic_id: branch.id,
      singleton: true,
      trade_name: data.name,
      invoice_prefix: data.code?.toUpperCase() || "INV",
    });
    if (profileError) throw new Error(profileError.message);

    await context.supabase.from("activity_log").insert({
      clinic_id: clinicId,
      actor_id: context.userId,
      action: "branch_created",
      entity_type: "clinic",
      entity_id: branch.id,
      summary: `Created branch ${data.name}`,
    });
    return { clinicId: branch.id };
  });

export const setBranchActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clinicId: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: target } = await context.supabase
      .from("clinics")
      .select("id, name, organization_id")
      .eq("id", data.clinicId)
      .single();
    if (!target) throw new Error("Branch not found");
    const { data: owner } = await context.supabase.rpc("is_organization_owner", {
      _organization_id: target.organization_id,
    });
    if (!owner) throw new Error("Only an organization owner can change branch status");
    const { error } = await context.supabase.from("clinics").update({ active: data.active }).eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });