import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership) throw redirect({ to: "/onboarding" });

    return { user: data.user, clinicId: membership.clinic_id };
  },

  component: () => <Outlet />,
});
