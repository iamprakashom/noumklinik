import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  APPOINTMENT_STATUSES,
  addDays,
  appointmentTone,
  formatTime,
  isSameDay,
  patientName,
  toLocalInputValue,
} from "@/data/clinic";
import {
  useAppointments,
  useInsert,
  usePatients,
  useProviders,
  useRooms,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Schedule — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Book and manage clinic appointments by provider and treatment room, with check-in, completion and no-show tracking.",
      },
      { property: "og:title", content: "Schedule — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Daily medspa schedule by provider and room with live appointment statuses.",
      },
    ],
  }),
  component: Schedule,
});

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 - 19:00

function Schedule() {
  const [day, setDay] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState("all");

  const appointments = useAppointments();
  const patients = usePatients();
  const providers = useProviders();
  const rooms = useRooms();
  const services = useServices();
  const createAppointment = useInsert("appointments");
  const updateAppointment = useUpdate("appointments");

  const dayAppointments = useMemo(
    () =>
      (appointments.data ?? [])
        .filter((a) => isSameDay(a.starts_at, day))
        .filter((a) => providerFilter === "all" || a.provider_id === providerFilter)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments.data, day, providerFilter],
  );

  const nameOf = (id: string | null, list?: { id: string; name: string }[]) =>
    list?.find((x) => x.id === id)?.name ?? "—";

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const service = services.data?.find((s) => s.id === String(fd.get("service_id")));
    createAppointment.mutate(
      {
        patient_id: String(fd.get("patient_id")),
        provider_id: String(fd.get("provider_id")) || null,
        room_id: String(fd.get("room_id")) || null,
        service_id: service?.id ?? null,
        starts_at: new Date(String(fd.get("starts_at"))).toISOString(),
        duration_min: Number(fd.get("duration_min")) || service?.duration_min || 30,
        status: "Booked",
        notes: String(fd.get("notes")) || null,
      },
      {
        onSuccess: () => {
          toast.success("Appointment booked");
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <AppShell
      title="Schedule"
      subtitle={day.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
      actions={
        <>
          <div className="flex items-center rounded-md border border-border bg-card">
            <button
              className="px-2 py-2 text-muted-foreground hover:text-foreground"
              onClick={() => setDay((d) => addDays(d, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="px-2.5 text-xs font-medium"
              onClick={() => setDay(new Date())}
            >
              Today
            </button>
            <button
              className="px-2 py-2 text-muted-foreground hover:text-foreground"
              onClick={() => setDay((d) => addDays(d, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className={`${inputClass} w-44`}
          >
            <option value="all">All providers</option>
            {providers.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className={primaryButton} onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New appointment
          </button>
        </>
      }
    >
      <div className="rounded-xl border border-border bg-card">
        {dayAppointments.length === 0 ? (
          <div className="p-6">
            <EmptyState>No appointments for this day.</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {HOURS.map((hour) => {
              const slot = dayAppointments.filter(
                (a) => new Date(a.starts_at).getHours() === hour,
              );
              if (slot.length === 0) return null;
              return (
                <li key={hour} className="flex gap-4 px-5 py-4">
                  <span className="w-14 shrink-0 pt-1 text-xs tabular-nums text-muted-foreground">
                    {`${String(hour).padStart(2, "0")}:00`}
                  </span>
                  <div className="grid flex-1 gap-2">
                    {slot.map((a) => {
                      const p = patients.data?.find((x) => x.id === a.patient_id);
                      return (
                        <div
                          key={a.id}
                          className="card-hover flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
                        >
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatTime(a.starts_at)} · {a.duration_min}m
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {p ? (
                                <Link
                                  to="/patients/$patientId"
                                  params={{ patientId: p.id }}
                                  className="hover:underline"
                                >
                                  {patientName(p)}
                                </Link>
                              ) : (
                                "Unknown patient"
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {nameOf(a.service_id, services.data)} ·{" "}
                              {nameOf(a.provider_id, providers.data)} ·{" "}
                              {nameOf(a.room_id, rooms.data)}
                            </p>
                          </div>
                          <Chip tone={appointmentTone(a.status)}>{a.status}</Chip>
                          <select
                            value={a.status}
                            onChange={(e) =>
                              updateAppointment.mutate(
                                { id: a.id, values: { status: e.target.value } },
                                { onSuccess: () => toast.success("Status updated") },
                              )
                            }
                            className={`${inputClass} h-8 w-36 text-xs`}
                            aria-label="Appointment status"
                          >
                            {APPOINTMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New appointment</DialogTitle>
          </DialogHeader>
          <form
            id="new-appointment"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget);
            }}
          >
            <Field label="Patient" className="sm:col-span-2">
              <select name="patient_id" required className={inputClass}>
                {patients.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {patientName(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <select name="service_id" className={inputClass}>
                {services.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider">
              <select name="provider_id" className={inputClass}>
                {providers.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room">
              <select name="room_id" className={inputClass}>
                {rooms.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration (min)">
              <input name="duration_min" type="number" min={10} step={5} defaultValue={30} className={inputClass} />
            </Field>
            <Field label="Starts at" className="sm:col-span-2">
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={toLocalInputValue(new Date(day.setHours(10, 0, 0, 0)))}
                className={inputClass}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea name="notes" className={textareaClass} placeholder="Treatment notes, preferences…" />
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-appointment"
              className={primaryButton}
              disabled={createAppointment.isPending}
            >
              Book appointment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
