import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luma — MedSpa & Aesthetic Clinic CRM" },
      {
        name: "description",
        content:
          "Luma is the all-in-one CRM for aesthetic clinics: scheduling, patient charts, consents, billing, lead capture and automated follow-ups.",
      },
      { property: "og:title", content: "Luma — MedSpa & Aesthetic Clinic CRM" },
      {
        property: "og:description",
        content: "Scheduling, clinical charting, billing and follow-up automation for medspas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // A signed-in visitor (including the OAuth return, which lands here with a
  // leftover "#") goes straight into the app — clinic setup first if needed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (!cancelled) setChecking(false);
        return;
      }
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      const pending = sessionStorage.getItem("pending_invite_token");
      if (pending) {
        navigate({ to: "/join", search: { token: pending }, replace: true });
        return;
      }
      const { data: membership } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      navigate({ to: membership ? "/dashboard" : "/onboarding", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-5" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Luma Aesthetics</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Clinic operations for medspas — scheduling, patient charts, consents, billing,
          lead capture and automated follow-ups in one workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {checking ? "Loading…" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
