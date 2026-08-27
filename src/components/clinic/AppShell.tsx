import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/automations", label: "Follow-ups", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 flex h-screen w-44 shrink-0 flex-col border-r border-border bg-card/60">
        <div className="flex items-center gap-2 px-3 py-4">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Luma Aesthetics</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border px-2 py-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

export const primaryButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export const ghostButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary";
