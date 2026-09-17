import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Stethoscope } from "lucide-react";
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
      { title: "Sign in — Noum Klinik" },
      {
        name: "description",
        content: "Sign in to Noum Klinik to manage appointments, patient charts, billing and clinic follow-ups.",
      },
      { property: "og:title", content: "Sign in — Noum Klinik" },
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
  const [showPassword, setShowPassword] = useState(false);

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
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await goAfterAuth(data.session.user.id);

  }

  return (
    <main className="auth-scope flex min-h-screen items-center justify-center bg-background p-3 sm:p-6 lg:p-8">
      <div className="grid min-h-[min(760px,calc(100vh-4rem))] w-full max-w-6xl overflow-hidden rounded-lg border border-border bg-card shadow-[var(--auth-shadow)] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[var(--auth-panel)] p-12 text-[var(--auth-panel-foreground)] lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute inset-y-0 right-0 w-px bg-[var(--auth-highlight)]/40" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[var(--auth-panel-foreground)]/20 bg-[var(--auth-panel-foreground)]/10">
              <Stethoscope className="size-5" />
            </span>
            <span className="auth-heading text-xl font-semibold">Noum Klinik</span>
          </div>

          <div className="relative max-w-md">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-[var(--auth-panel-muted)]">
              <span className="h-px w-8 bg-[var(--auth-highlight)]" /> Clinic operations, organized
            </p>
            <h1 className="auth-heading text-5xl font-semibold leading-[1.08]">
              Your clinic day, clearly in view.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-[var(--auth-panel-muted)]">
              Appointments, patient records, billing and follow-ups—kept together for your clinic team.
            </p>
          </div>

          <div className="relative flex items-center gap-3 border-t border-[var(--auth-panel-foreground)]/15 pt-6 text-sm text-[var(--auth-panel-muted)]">
            <ShieldCheck className="size-5 shrink-0 text-[var(--auth-highlight)]" />
            <span>Private workspace for authorized clinic staff</span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col justify-center p-6 sm:p-12 lg:p-16 xl:p-20">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-9 flex items-center gap-2 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Stethoscope className="size-4" /></span>
              <span className="auth-heading text-base font-semibold">Noum Klinik</span>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><LockKeyhole className="size-3.5" /> Secure clinic access</p>
              <h2 className="auth-heading text-3xl font-semibold text-foreground">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === "signin" ? "Sign in to continue to your clinic workspace." : "Set up your secure Noum Klinik account."}
              </p>
            </div>

        <form onSubmit={submit} className="mt-8 grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
              autoComplete="email"
              className="h-11 bg-background px-3.5 focus-visible:ring-2"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-11 bg-background px-3.5 pr-11 focus-visible:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={busy} className="mt-1 h-11 w-full font-semibold">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in to your account" : "Create account"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="h-11 w-full bg-card" onClick={google} disabled={busy}>
          <span className="flex size-5 items-center justify-center rounded-full border border-border text-[10px] font-bold text-primary">G</span>
          Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-7 w-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mode === "signin"
            ? "New to Noum Klinik? Create an account"
            : "Already have an account? Sign in"}
        </button>
          </div>
        </section>
      </div>
    </main>
  );
}
