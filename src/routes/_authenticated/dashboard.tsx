import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/clinic/AppShell";
import { Avatar, Chip, EmptyState, Panel, StatCard } from "@/components/clinic/bits";
import {
  appointmentTone,
  formatDateTime,
  formatTime,
  initials,
  isSameDay,
  money,
  patientName,
} from "@/data/clinic";
import {
  useAppointments,
  useInvoices,
  useLeads,
  useOutbox,
  usePatients,
  useProviders,
  useServices,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Daily clinic overview: today's schedule, check-ins, revenue, new leads and scheduled patient follow-ups.",
      },
      { property: "og:title", content: "Today — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Schedule, revenue, leads and follow-ups for your medspa at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const patients = usePatients();
  const appointments = useAppointments();
  const providers = useProviders();
  const services = useServices();
  const invoices = useInvoices();
  const leads = useLeads();
  const outbox = useOutbox();

  const today = new Date();
  const appts = appointments.data ?? [];
  const todays = appts.filter((a) => isSameDay(a.starts_at, today));
  const providerName = (id: string | null) =>
    providers.data?.find((p) => p.id === id)?.name ?? "Unassigned";
  const serviceName = (id: string | null) =>
    services.data?.find((s) => s.id === id)?.name ?? "Service";
  const patient = (id: string) => patients.data?.find((p) => p.id === id);

  const paid = (invoices.data ?? []).filter((i) => i.status === "Paid");
  const revenueToday = paid
    .filter((i) => isSameDay(`${i.issued_at}T12:00:00`, today))
    .reduce((s, i) => s + Number(i.total), 0);
  const revenueMonth = paid
    .filter((i) => new Date(`${i.issued_at}T12:00:00`).getMonth() === today.getMonth())
    .reduce((s, i) => s + Number(i.total), 0);

  const newLeads = (leads.data ?? []).filter((l) => l.stage === "New");
  const converted = (leads.data ?? []).filter((l) => l.stage === "Converted").length;
  const conversion = leads.data?.length
    ? Math.round((converted / leads.data.length) * 100)
    : 0;
  const noShows = appts.filter((a) => a.status === "No-show").length;
  const queued = (outbox.data ?? []).filter((m) => m.status === "Queued");

  return (
    <AppShell
      title="Today"
      subtitle={today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Appointments today"
          value={todays.length}
          hint={`${todays.filter((a) => a.status === "Checked-in").length} checked in`}
        />
        <StatCard label="Revenue today" value={money(revenueToday)} hint={`${money(revenueMonth)} this month`} />
        <StatCard label="New leads" value={newLeads.length} hint={`${conversion}% conversion`} />
        <StatCard label="Queued follow-ups" value={queued.length} hint={`${noShows} no-shows logged`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Today's schedule"
          action={
            <Link to="/appointments" className="text-xs text-primary hover:underline">
              Open schedule
            </Link>
          }
        >
          {todays.length === 0 ? (
            <EmptyState>No appointments booked for today.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {todays.map((a) => {
                const p = patient(a.patient_id);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-16 text-xs tabular-nums text-muted-foreground">
                      {formatTime(a.starts_at)}
                    </span>
                    <Avatar label={p ? initials(patientName(p)) : "?"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p ? patientName(p) : "Unknown patient"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {serviceName(a.service_id)} · {providerName(a.provider_id)}
                      </p>
                    </div>
                    <Chip tone={appointmentTone(a.status)}>{a.status}</Chip>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="New leads"
            action={
              <Link to="/leads" className="text-xs text-primary hover:underline">
                Pipeline
              </Link>
            }
          >
            {newLeads.length === 0 ? (
              <EmptyState>No new leads waiting.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {newLeads.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.source}
                        {l.interest ? ` · ${l.interest}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Upcoming follow-ups"
            action={
              <Link to="/automations" className="text-xs text-primary hover:underline">
                Automations
              </Link>
            }
          >
            {queued.length === 0 ? (
              <EmptyState>Nothing queued right now.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {queued.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {m.channel} · {m.recipient ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(m.scheduled_for)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
