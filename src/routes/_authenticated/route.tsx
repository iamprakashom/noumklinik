import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: preference } = await supabase
      .from("user_clinic_preferences")
      .select("clinic_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    let membershipQuery = supabase
      .from("clinic_members")
      .select("clinic_id, role, provider_id, clinics(name)")
      .eq("user_id", data.user.id)
      .eq("status", "active");
    if (preference?.clinic_id) membershipQuery = membershipQuery.eq("clinic_id", preference.clinic_id);
    const { data: selected } = await membershipQuery.limit(1).maybeSingle();
    const membership = selected ?? (await supabase.from("clinic_members").select("clinic_id, role, provider_id, clinics(name)").eq("user_id", data.user.id).eq("status", "active").limit(1).maybeSingle()).data;
    if (!membership) throw redirect({ to: "/onboarding" });

    const { data: memberships } = await supabase
      .from("clinic_members")
      .select("clinic_id, role, provider_id, clinics(name)")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .order("created_at");

    await supabase.from("clinic_members").update({ last_seen_at: new Date().toISOString() }).eq("user_id", data.user.id).eq("clinic_id", membership.clinic_id);

    return {
      user: data.user,
      clinicId: membership.clinic_id,
      clinicName: (membership.clinics as { name: string } | null)?.name ?? "Clinic",
      role: membership.role,
      providerId: membership.provider_id,
      memberships: (memberships ?? []).map((item) => ({ clinicId: item.clinic_id, clinicName: (item.clinics as { name: string } | null)?.name ?? "Clinic", role: item.role })),
    };
  },

  component: () => <Outlet />,
});
