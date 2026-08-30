import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content: "Sign in to Luma to manage appointments, patient charts, billing and clinic follow-ups.",
      },
      { property: "og:title", content: "Sign in — Luma Aesthetics Clinic CRM" },
      { property: "og:description", content: "Access your clinic workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goAfterAuth = async (userId: string) => {
    const pending = sessionStorage.getItem("pending_invite_token");
    if (pending) {
      navigate({ to: "/join", search: { token: pending }, replace: true });
      return;
    }
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    navigate({ to: membership ? "/dashboard" : "/onboarding", replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void goAfterAuth(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await goAfterAuth(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session?.user) {
          // Signed in immediately — send them straight into clinic setup.
          await goAfterAuth(data.session.user.id);
          return;
        }
        toast.success("Account created — you can sign in now.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }


  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Luma Aesthetics</span>
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Patient data is private to your clinic team.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
