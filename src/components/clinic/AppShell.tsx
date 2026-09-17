import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  MessageSquare,
  CreditCard,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,

  Settings,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/clinic/CommandPalette";
import { Route as AuthenticatedRoute } from "@/routes/_authenticated/route";
import { can, type ClinicRole, type Permission } from "@/lib/permissions";


const NAV = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard, permission: "appointments" },
  { to: "/appointments", label: "Appointments", icon: CalendarDays, permission: "appointments" },
  { to: "/recalls", label: "Recalls", icon: RotateCcw, permission: "appointments" },

  { to: "/patients", label: "Patients", icon: Users, permission: "patients" },
  { to: "/leads", label: "Leads", icon: UserPlus, permission: "leads" },
  { to: "/inbox", label: "Inbox", icon: MessageSquare, permission: "inbox" },
  { to: "/billing", label: "Billing", icon: CreditCard, permission: "billing" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "reports" },
  { to: "/automations", label: "Follow-ups", icon: Sparkles, permission: "settings" },
  { to: "/settings", label: "Settings", icon: Settings, permission: "settings" },
  { to: "/activity", label: "Activity", icon: ClipboardList, permission: "settings" },
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
  const router = useRouter();
  const workspace = AuthenticatedRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navList = (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.filter((item) => can(workspace.role as ClinicRole, item.permission as Permission)).map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors lg:text-xs",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-3 py-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">Noum Klinik</span>
    </div>
  );

  const signOutButton = (
    <button
      onClick={signOut}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:text-xs"
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-44 shrink-0 flex-col border-r border-border bg-card/60 lg:flex">
        {brand}
        {navList}
        <div className="mt-auto border-t border-border px-2 py-3">{signOutButton}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-chrome flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5 sm:gap-4 lg:flex-nowrap lg:px-8 lg:py-5">
          <Sheet open={mobileNav} onOpenChange={setMobileNav}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col">
                {brand}
                {navList}
                <div className="mt-auto border-t border-border px-2 py-3">{signOutButton}</div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-xl">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
            {workspace.memberships.length > 1 ? (
              <select
                aria-label="Current clinic"
                value={workspace.clinicId}
                className="h-9 max-w-48 rounded-md border border-border bg-card px-2 text-xs"
                onChange={async (event) => {
                  await supabase.from("user_clinic_preferences").upsert({ user_id: workspace.user.id, clinic_id: event.target.value, updated_at: new Date().toISOString() });
                  queryClient.clear();
                  await router.invalidate();
                  navigate({ to: "/dashboard", replace: true });
                }}
              >
                {workspace.memberships.map((clinic) => <option key={clinic.clinicId} value={clinic.clinicId}>{clinic.clinicName}</option>)}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
              }
              className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary lg:inline-flex"
            >
              <Search className="size-3.5" />
              Search
              <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd>
            </button>
            {actions}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <CommandPalette role={workspace.role as ClinicRole} />
    </div>
  );
}


export const primaryButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export const ghostButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary";
