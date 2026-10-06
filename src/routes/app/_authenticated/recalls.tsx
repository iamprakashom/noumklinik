import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Clock, X } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, StatCard, inputClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, patientName } from "@/data/clinic";
import {
  useInsert,
  usePatientRecalls,
  usePatients,
  useProviders,
  useServices,
  useUpdate,
  type PatientRecall,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/app/_authenticated/recalls")({
  head: () => ({
    meta: [
      { title: "Recalls — Noum Klinik" },
      {
        name: "description",
        content:
          "Patients due for their next session in a treatment course — laser, botox, peels — with one-click rebooking.",
      },
      { property: "og:title", content: "Recalls — Noum Klinik" },
      {
        property: "og:description",
        content: "Automatic repeat-session scheduling for aesthetic treatment courses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecallsPage,
});

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (dateStr: string) =>
  Math.round((new Date(`${dateStr}T00:00:00`).getTime() - startOfToday().getTime()) / 86400000);

function RecallsPage() {
  const [range, setRange] = useState<"due" | "next30" | "all">("due");
  const [booking, setBooking] = useState<PatientRecall | null>(null);
  const [when, setWhen] = useState("");
  const [providerId, setProviderId] = useState("");

  const recalls = usePatientRecalls();
  const patients = usePatients();
  const services = useServices();
  const providers = useProviders();
  const createAppointment = useInsert("appointments");
  const updateRecall = useUpdate("patient_recalls");

  const patientOf = (id: string) => {
    const p = patients.data?.find((x) => x.id === id);
    return p ? patientName(p) : "Unknown patient";
  };
  const phoneOf = (id: string) => patients.data?.find((x) => x.id === id)?.phone ?? "";

  const open = useMemo(
    () => (recalls.data ?? []).filter((r) => r.status === "Due"),
    [recalls.data],
  );

  const rows = useMemo(() => {
    if (range === "all") return recalls.data ?? [];
    return open.filter((r) => {
      const d = daysBetween(r.due_on);
      return range === "due" ? d <= 0 : d > 0 && d <= 30;
    });
  }, [range, open, recalls.data]);

  const overdueCount = open.filter((r) => daysBetween(r.due_on) < 0).length;
  const todayCount = open.filter((r) => daysBetween(r.due_on) === 0).length;
  const upcomingCount = open.filter((r) => {
    const d = daysBetween(r.due_on);
    return d > 0 && d <= 30;
  }).length;

  const startBooking = (r: PatientRecall) => {
    setBooking(r);
    const at = new Date(`${r.due_on}T10:00:00`);
    if (at.getTime() < Date.now()) at.setTime(Date.now() + 86400000);
    setWhen(new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setProviderId("");
  };

  const confirmBooking = () => {
    if (!booking || !when) return;
    const service = services.data?.find((s) => s.id === booking.service_id);
    createAppointment.mutate(
      {
        patient_id: booking.patient_id,
        provider_id: providerId || null,
        service_id: booking.service_id,
        starts_at: new Date(when).toISOString(),
        duration_min: service?.duration_min ?? 30,
        status: "Booked",
        source: "Recall",
        notes: `Recall: ${booking.service_name}`,
      },
      {
        onSuccess: (created) => {
          const appointmentId = (created?.[0] as { id?: string } | undefined)?.id ?? null;
          updateRecall.mutate({
            id: booking.id,
            values: { status: "Booked", booked_appointment_id: appointmentId },
          });
          setBooking(null);
          toast.success("Next session booked");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const snooze = (r: PatientRecall, days: number) => {
    const next = new Date(`${r.due_on}T00:00:00`);
    const base = next.getTime() < startOfToday().getTime() ? startOfToday() : next;
    const due = new Date(base.getTime() + days * 86400000).toISOString().slice(0, 10);
    updateRecall.mutate(
      { id: r.id, values: { due_on: due } },
      { onSuccess: () => toast.success(`Snoozed to ${formatDate(due)}`) },
    );
  };

  const dismiss = (r: PatientRecall) =>
    updateRecall.mutate(
      { id: r.id, values: { status: "Dismissed" } },
      { onSuccess: () => toast.success("Recall closed") },
    );

  return (
    <AppShell
      title="Recalls"
      subtitle="Patients due for the next session of a treatment course"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Overdue" value={String(overdueCount)} hint="Past their due date" />
        <StatCard label="Due today" value={String(todayCount)} />
        <StatCard label="Next 30 days" value={String(upcomingCount)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["due", "Due now"],
            ["next30", "Next 30 days"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={range === value ? primaryButton : ghostButton}
            onClick={() => setRange(value)}
            aria-pressed={range === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {!rows.length ? (
          <div className="p-4">
            <EmptyState>
              Nothing here. Recalls appear automatically when an appointment is marked Completed and
              the treatment has a follow-up interval set in Settings → Services.
            </EmptyState>
          </div>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Treatment</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const d = daysBetween(r.due_on);
                  const tone = r.status !== "Due" ? "idle" : d < 0 ? "overdue" : d === 0 ? "progress" : "idle";
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-secondary/60">
                      <td className="px-5 py-3">
                        <div>{patientOf(r.patient_id)}</div>
                        <div className="text-xs text-muted-foreground">{phoneOf(r.patient_id)}</div>
                      </td>
                      <td className="px-5 py-3">{r.service_name || "—"}</td>
                      <td className="px-5 py-3">
                        <div className="tabular-nums">{formatDate(r.due_on)}</div>
                        <div className="text-xs text-muted-foreground">
                          {d < 0 ? `${Math.abs(d)} days overdue` : d === 0 ? "Today" : `in ${d} days`}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Chip tone={tone}>{r.status}</Chip>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.status === "Due" ? (
                          <div className="flex justify-end gap-1">
                            <button className={ghostButton} onClick={() => startBooking(r)}>
                              <CalendarPlus className="size-3.5" /> Book
                            </button>
                            <button
                              className={ghostButton}
                              onClick={() => snooze(r, 14)}
                              aria-label="Snooze two weeks"
                            >
                              <Clock className="size-3.5" /> +2 wks
                            </button>
                            <button
                              className={ghostButton}
                              onClick={() => dismiss(r)}
                              aria-label="Close recall"
                            >
                              <X className="size-3.5" /> Close
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(booking)} onOpenChange={(v) => !v && setBooking(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book next session</DialogTitle>
          </DialogHeader>
          {booking ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                confirmBooking();
              }}
            >
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{patientOf(booking.patient_id)}</div>
                <div>
                  {booking.service_name} · due {formatDate(booking.due_on)}
                </div>
              </div>
              <Field label="Date & time">
                <input
                  required
                  type="datetime-local"
                  className={inputClass}
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </Field>
              <Field label="Doctor">
                <select
                  className={inputClass}
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {providers.data
                    ?.filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <DialogFooter>
                <button type="button" className={ghostButton} onClick={() => setBooking(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={primaryButton}
                  disabled={createAppointment.isPending}
                >
                  Book appointment
                </button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
