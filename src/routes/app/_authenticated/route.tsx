import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { can, PATH_PERMISSION, type ClinicRole } from "@/lib/permissions";

export const Route = createFileRoute("/app/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/app/auth" });

    const { data: preference } = await supabase
      .from("user_clinic_preferences")
      .select("clinic_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    let membershipQuery = supabase
      .from("clinic_members")
      .select("clinic_id, role, provider_id, clinics(name, active, organization_id, organizations(name))")
      .eq("user_id", data.user.id)
      .eq("status", "active");
    if (preference?.clinic_id) membershipQuery = membershipQuery.eq("clinic_id", preference.clinic_id);
    const { data: selected } = await membershipQuery.limit(1).maybeSingle();
    const membership = selected ?? (await supabase.from("clinic_members").select("clinic_id, role, provider_id, clinics(name, active, organization_id, organizations(name))").eq("user_id", data.user.id).eq("status", "active").limit(1).maybeSingle()).data;
    if (!membership) throw redirect({ to: "/app/onboarding" });

    const permission = Object.entries(PATH_PERMISSION).find(([path]) => location.pathname.startsWith(path))?.[1];
    if (permission && !can(membership.role as ClinicRole, permission)) {
      throw redirect({ to: "/app/access-denied" });
    }

    const { data: memberships } = await supabase
      .from("clinic_members")
      .select("clinic_id, role, provider_id, clinics(name, active, organization_id, organizations(name))")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .order("created_at");

    await supabase.from("clinic_members").update({ last_seen_at: new Date().toISOString() }).eq("user_id", data.user.id).eq("clinic_id", membership.clinic_id);

    return {
      user: data.user,
      clinicId: membership.clinic_id,
      clinicName: (membership.clinics as { name: string } | null)?.name ?? "Clinic",
      organizationId: (membership.clinics as { organization_id: string | null } | null)?.organization_id ?? null,
      organizationName: (membership.clinics as { organizations: { name: string } | null } | null)?.organizations?.name ?? (membership.clinics as { name: string } | null)?.name ?? "Clinic group",
      role: membership.role,
      providerId: membership.provider_id,
      memberships: (memberships ?? [])
        .filter((item) => (item.clinics as { active: boolean } | null)?.active !== false)
        .map((item) => ({
          clinicId: item.clinic_id,
          clinicName: (item.clinics as { name: string } | null)?.name ?? "Clinic",
          organizationId: (item.clinics as { organization_id: string | null } | null)?.organization_id ?? null,
          organizationName: (item.clinics as { organizations: { name: string } | null } | null)?.organizations?.name ?? "Clinic group",
          role: item.role,
        })),
    };
  },

  component: () => <Outlet />,
});
