import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { BookingRequests } from "@/components/clinic/BookingRequests";
import { Chip, EmptyState, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  APPOINTMENT_SOURCES,
  APPOINTMENT_STATUSES,
  TEMPERATURES,
  appointmentTone,
  formatDateTime,
  patientName,
  temperatureTone,
  toLocalInputValue,
} from "@/data/clinic";
import type { Appointment } from "@/data/clinic";
import {
  useAppointments,
  useInsert,
  usePatients,
  useProviders,
  useRooms,
  usePatientConsents,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";
import { sendAppointmentReminder } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Book, reschedule and assign clinic appointments with source tracking, treatment type, doctor assignment and session reminders.",
      },
      { property: "og:title", content: "Appointments — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Medspa appointment desk with reschedule, doctor assignment and reminders.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { new?: boolean } =>
    search["new"] === true || search["new"] === "true" ? { new: true } : {},
  component: AppointmentsPage,
});

type RangeKey = "today" | "upcoming" | "past" | "all";

function AppointmentsPage() {
  const { new: openNew } = Route.useSearch();
  const [open, setOpen] = useState(openNew ?? false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [reschedule, setReschedule] = useState<Appointment | null>(null);
  const [range, setRange] = useState<RangeKey>("upcoming");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");

  const appointments = useAppointments();
  const patients = usePatients();
  const providers = useProviders();
  const rooms = useRooms();
  const services = useServices();
  const consents = usePatientConsents();

  const consentPending = (patientId: string, serviceId: string | null) => {
    const svc = services.data?.find((s) => s.id === serviceId);
    if (!svc?.consent_template_id) return false;
    return !(consents.data ?? []).some(
      (c) => c.patient_id === patientId && c.template_id === svc.consent_template_id,
    );
  };
  const createAppointment = useInsert("appointments");
  const createPatient = useInsert("patients");
  const updateAppointment = useUpdate("appointments");
  const sendReminder = useServerFn(sendAppointmentReminder);

  const rows = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);
    const endOfDay = new Date(now).setHours(23, 59, 59, 999);
    return (appointments.data ?? [])
      .filter((a) => {
        const t = new Date(a.starts_at).getTime();
        if (range === "today") return t >= startOfDay && t <= endOfDay;
        if (range === "upcoming") return t >= startOfDay;
        if (range === "past") return t < startOfDay;
        return true;
      })
      .filter((a) => sourceFilter === "all" || (a.source ?? "Walk-in") === sourceFilter)
      .filter((a) =>
        doctorFilter === "all"
          ? true
          : doctorFilter === "unassigned"
            ? !a.provider_id
            : a.provider_id === doctorFilter,
      )
      .sort((a, b) =>
        range === "past"
          ? b.starts_at.localeCompare(a.starts_at)
          : a.starts_at.localeCompare(b.starts_at),
      );
  }, [appointments.data, range, sourceFilter, doctorFilter]);

  const nameOf = (id: string | null, list?: { id: string; name: string }[]) =>
    list?.find((x) => x.id === id)?.name ?? "—";

  const patch = (id: string, values: Record<string, unknown>, msg = "Appointment updated") =>
    updateAppointment.mutate({ id, values }, { onSuccess: () => toast.success(msg) });

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const service = services.data?.find((s) => s.id === String(fd.get("service_id")));
    const startsAtDate = new Date(String(fd.get("starts_at")));
    if (Number.isNaN(startsAtDate.getTime()) || startsAtDate.getTime() < Date.now() - 5 * 60 * 1000) {
      toast.error("Appointment date and time cannot be in the past");
      return;
    }

    let patientId = String(fd.get("patient_id") ?? "");
    if (quickAdd) {
      const name = String(fd.get("new_patient_name") ?? "").trim();
      const phone = String(fd.get("new_patient_phone") ?? "").trim();
      if (!name || !phone) {
        toast.error("New patient needs a name and mobile number");
        return;
      }
      const existing = patients.data?.find((p) => (p.phone ?? "").replace(/\D/g, "") === phone.replace(/\D/g, ""));
      if (existing) {
        patientId = existing.id;
        toast.info(`${patientName(existing)} already exists — booking against that record`);
      } else {
        const [first, ...rest] = name.split(" ");
        try {
          const rows = (await createPatient.mutateAsync({
            first_name: first ?? name,
            last_name: rest.join(" ") || "—",
            phone,
            source: "Walk-in",
          })) as { id: string }[];
          patientId = rows[0]?.id ?? "";
        } catch (e) {
          toast.error((e as Error).message);
          return;
        }
      }
    }
    if (!patientId) {
      toast.error("Pick a patient first");
      return;
    }

    createAppointment.mutate(
      {
        patient_id: patientId,
        provider_id: String(fd.get("provider_id")) || null,
        room_id: String(fd.get("room_id")) || null,
        service_id: service?.id ?? null,
        starts_at: startsAtDate.toISOString(),
        duration_min: Number(fd.get("duration_min")) || service?.duration_min || 30,
        status: "Booked",
        source: String(fd.get("source")),
        temperature: String(fd.get("temperature")),
        notes: String(fd.get("notes")) || null,
      },
      {
        onSuccess: () => {
          toast.success("Appointment booked");
          setQuickAdd(false);
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }


  return (
    <AppShell
      title="Appointments"
      subtitle="Bookings across WhatsApp, Instagram and walk-ins — reschedule, assign a doctor or send a reminder"
      actions={
        <>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className={`${inputClass} w-32`}
            aria-label="Date range"
          >
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={`${inputClass} w-36`}
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {APPOINTMENT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className={`${inputClass} w-40`}
            aria-label="Filter by doctor"
          >
            <option value="all">All doctors</option>
            <option value="unassigned">Unassigned</option>
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
      <BookingRequests />
      {rows.length === 0 ? (
        <EmptyState>No appointments match these filters.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
                <th className="px-5 py-3 font-medium">Treatment</th>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">Tag</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Notes</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => {
                const p = patients.data?.find((x) => x.id === a.patient_id);
                return (
                  <tr key={a.id} className="align-top transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3">
                      {p ? (
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          className="font-medium hover:underline"
                        >
                          {patientName(p)}
                        </Link>
                      ) : (
                        "Unknown patient"
                      )}
                      <p className="text-xs text-muted-foreground">
                        {nameOf(a.room_id, rooms.data)} · {a.duration_min}m
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={a.source ?? "Walk-in"}
                        onChange={(e) => patch(a.id, { source: e.target.value })}
                        className={`${inputClass} h-8 w-32 text-xs`}
                        aria-label="Source"
                      >
                        {APPOINTMENT_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {formatDateTime(a.starts_at)}
                      {a.reschedule_count ? (
                        <span className="block text-[11px] text-status-progress">
                          rescheduled {a.reschedule_count}×
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={a.service_id ?? ""}
                        onChange={(e) => {
                          const svc = services.data?.find((s) => s.id === e.target.value);
                          patch(
                            a.id,
                            {
                              service_id: e.target.value || null,
                              duration_min: svc?.duration_min ?? a.duration_min,
                            },
                            "Treatment updated",
                          );
                        }}
                        className={`${inputClass} h-8 w-40 text-xs`}
                        aria-label="Treatment type"
                      >
                        <option value="">Not set</option>
                        {services.data?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {consentPending(a.patient_id, a.service_id) ? (
                        <Chip tone="overdue" className="mt-1">
                          Consent pending
                        </Chip>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={a.provider_id ?? ""}
                        onChange={(e) =>
                          patch(a.id, { provider_id: e.target.value || null }, "Doctor assigned")
                        }
                        className={`${inputClass} h-8 w-36 text-xs`}
                        aria-label="Doctor"
                      >
                        <option value="">Unassigned</option>
                        {providers.data?.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={a.temperature ?? "Warm"}
                        onChange={(e) => patch(a.id, { temperature: e.target.value })}
                        className={`${inputClass} h-8 w-24 text-xs`}
                        aria-label="Tag"
                      >
                        {TEMPERATURES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <Chip tone={temperatureTone(a.temperature ?? "Warm")} className="mt-1">
                        {a.temperature ?? "Warm"}
                      </Chip>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => patch(a.id, { status: e.target.value }, "Status updated")}
                        className={`${inputClass} h-8 w-32 text-xs`}
                        aria-label="Status"
                      >
                        {APPOINTMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Chip tone={appointmentTone(a.status)} className="mt-1">
                        {a.status}
                      </Chip>
                    </td>
                    <td className="max-w-[180px] px-5 py-3 text-xs text-muted-foreground">
                      {a.notes ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <button className={ghostButton} onClick={() => setReschedule(a)}>
                          <CalendarClock className="size-3.5" /> Reschedule
                        </button>
                        <button
                          className={ghostButton}
                          onClick={() =>
                            toast.promise(sendReminder({ data: { appointmentId: a.id } }), {
                              loading: "Sending reminder…",
                              success: "Reminder sent",
                              error: (e: Error) => e.message,
                            })
                          }
                        >
                          <BellRing className="size-3.5" /> Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!reschedule} onOpenChange={(v) => !v && setReschedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          {reschedule ? (
            <form
              id="reschedule-form"
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newStart = new Date(String(fd.get("starts_at")));
                if (newStart.getTime() < Date.now() - 5 * 60 * 1000) {
                  toast.error("New appointment time cannot be in the past");
                  return;
                }
                updateAppointment.mutate(
                  {
                    id: reschedule.id,
                    values: {
                      previous_starts_at: reschedule.starts_at,
                      starts_at: newStart.toISOString(),
                      reschedule_count: (reschedule.reschedule_count ?? 0) + 1,
                      status: "Booked",
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Appointment rescheduled");
                      setReschedule(null);
                    },
                    onError: (err) => toast.error(err.message),
                  },
                );
              }}
            >
              <p className="text-xs text-muted-foreground">
                Currently {formatDateTime(reschedule.starts_at)}
              </p>
              <Field label="New date & time">
                <input
                  name="starts_at"
                  type="datetime-local"
                  required
                  min={toLocalInputValue(new Date())}
                  defaultValue={toLocalInputValue(new Date(reschedule.starts_at))}
                  className={inputClass}
                />
              </Field>
            </form>
          ) : null}
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setReschedule(null)}>
              Cancel
            </button>
            <button type="submit" form="reschedule-form" className={primaryButton}>
              Save new time
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              void submit(e.currentTarget);
            }}
          >
            <div className="sm:col-span-2">
              {quickAdd ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New patient name">
                    <input name="new_patient_name" required className={inputClass} autoFocus />
                  </Field>
                  <Field label="Mobile number">
                    <input name="new_patient_phone" inputMode="tel" required className={inputClass} />
                  </Field>
                </div>
              ) : (
                <Field label="Patient">
                  <select name="patient_id" required className={inputClass}>
                    {patients.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {patientName(p)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <button
                type="button"
                className="mt-1.5 text-xs text-primary underline"
                onClick={() => setQuickAdd((v) => !v)}
              >
                {quickAdd ? "Choose an existing patient" : "New patient — add name & mobile only"}
              </button>
            </div>

            <Field label="Treatment type">
              <select name="service_id" className={inputClass} defaultValue="">
                <option value="">Select a treatment…</option>
                {services.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {(services.data?.length ?? 0) === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No treatments yet — add them in Clinic setup → Services.
                </p>
              ) : null}
            </Field>

            <Field label="Doctor">
              <select name="provider_id" className={inputClass}>
                <option value="">Unassigned</option>
                {providers.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select name="source" className={inputClass} defaultValue="WhatsApp">
                {APPOINTMENT_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tag">
              <select name="temperature" className={inputClass} defaultValue="Warm">
                {TEMPERATURES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room">
              <select name="room_id" className={inputClass}>
                <option value="">Not set</option>
                {rooms.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration (min)">
              <input
                name="duration_min"
                type="number"
                min={10}
                step={5}
                defaultValue={30}
                className={inputClass}
              />
            </Field>
            <Field label="Schedule date & time" className="sm:col-span-2">
              <input
                name="starts_at"
                type="datetime-local"
                required
                min={toLocalInputValue(new Date())}
                defaultValue={toLocalInputValue(new Date(new Date().setHours(10, 0, 0, 0)))}
                className={inputClass}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                name="notes"
                className={textareaClass}
                placeholder="Treatment notes, preferences…"
              />
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
