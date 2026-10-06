import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Settings,

  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { patientName } from "@/data/clinic";
import { useLeads, usePatients } from "@/lib/clinic-data";
import { can, type ClinicRole, type Permission } from "@/lib/permissions";

const PAGES = [
  { to: "/app/dashboard", label: "Today", icon: LayoutDashboard, permission: "appointments" },
  { to: "/app/appointments", label: "Appointments", icon: CalendarDays, permission: "appointments" },
  { to: "/app/recalls", label: "Recalls", icon: RotateCcw, permission: "appointments" },

  { to: "/app/patients", label: "Patients", icon: Users, permission: "patients" },
  { to: "/app/leads", label: "Leads", icon: UserPlus, permission: "leads" },
  { to: "/app/inbox", label: "Inbox", icon: MessageSquare, permission: "inbox" },
  { to: "/app/billing", label: "Billing", icon: CreditCard, permission: "billing" },
  { to: "/app/reports", label: "Reports", icon: BarChart3, permission: "reports" },
  { to: "/app/automations", label: "Follow-ups", icon: Sparkles, permission: "settings" },
  { to: "/app/settings", label: "Settings", icon: Settings, permission: "settings" },
] as const;

/** Keyboard-first jump bar: Cmd/Ctrl+K from anywhere in the clinic app. */
export function CommandPalette({ role }: { role: ClinicRole }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const patients = usePatients();
  const leads = useLeads(can(role, "leads"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search patients, leads or jump to a page…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Actions">
          {can(role, "leads") ? <CommandItem
            value="book appointment new"
            onSelect={() => go(() => navigate({ to: "/app/appointments", search: { new: true } }))}
          >
            <CalendarDays className="size-4" />
            Book an appointment
          </CommandItem> : null}
          <CommandItem
            value="add patient new"
            onSelect={() => go(() => navigate({ to: "/app/patients", search: { new: true } }))}
          >
            <Users className="size-4" />
            Add a patient
          </CommandItem>
          <CommandItem
            value="add lead new enquiry"
            onSelect={() => go(() => navigate({ to: "/app/leads" }))}
          >
            <UserPlus className="size-4" />
            Add a lead
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Patients">
          {(patients.data ?? []).slice(0, 200).map((p) => (
            <CommandItem
              key={p.id}
              value={`${patientName(p)} ${p.phone ?? ""} ${p.email ?? ""}`}
              onSelect={() =>
                go(() =>
                  navigate({ to: "/app/patients/$patientId", params: { patientId: p.id } }),
                )
              }
            >
              <Users className="size-4" />
              <span className="flex-1 truncate">{patientName(p)}</span>
              <span className="text-xs text-muted-foreground">{p.phone ?? ""}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {can(role, "leads") ? <CommandGroup heading="Leads">
          {(leads.data ?? []).slice(0, 100).map((l) => (
            <CommandItem
              key={l.id}
              value={`${l.full_name} ${l.phone ?? ""} lead`}
              onSelect={() => go(() => navigate({ to: "/app/leads" }))}
            >
              <UserPlus className="size-4" />
              <span className="flex-1 truncate">{l.full_name}</span>
              <span className="text-xs text-muted-foreground">{l.stage}</span>
            </CommandItem>
          ))}
        </CommandGroup> : null}

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {PAGES.filter((p) => can(role, p.permission as Permission)).map((p) => (
            <CommandItem key={p.to} value={p.label} onSelect={() => go(() => navigate({ to: p.to }))}>
              <p.icon className="size-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
