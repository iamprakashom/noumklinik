import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, CalendarDays, Eye, Plus, RotateCcw } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { BookingRequests } from "@/components/clinic/BookingRequests";
import { Chip, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import { PhoneInput } from "@/components/clinic/PhoneInput";
import {
  ConflictAlertDialog,
  type ConflictModalState,
} from "@/components/clinic/ConflictAlertDialog";
import { AppointmentDetailDialog } from "@/components/clinic/AppointmentDetailDialog";
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
  CANCELLATION_REASONS,
  TEMPERATURES,
  appointmentTone,
  formatDateTime,
  patientName,
  phoneDigits,
  phoneError,
  temperatureTone,
  toLocalInputValue,
  type Appointment,
} from "@/data/clinic";
import {
  useAppointments,
  useClinicProfile,
  useInsert,
  usePatientConsents,
  usePatients,
  useProviders,
  useRooms,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";
import { checkAppointmentConflict, validateAppointmentTime } from "@/lib/clinic-hours";
import { TimePickerSelector } from "@/components/clinic/TimePickerSelector";
import { sendAppointmentReminder } from "@/lib/messaging.functions";

export const Route = createFileRoute("/app/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Noum Klinik" },
      {
        name: "description",
        content:
          "Book, reschedule and assign clinic appointments with source tracking, treatment type, doctor assignment and session reminders.",
      },
      { property: "og:title", content: "Appointments — Noum Klinik" },
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
  const { user } = Route.useRouteContext();
  const { new: openNew } = Route.useSearch();
  const [open, setOpen] = useState(openNew ?? false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [reschedule, setReschedule] = useState<Appointment | null>(null);
  const [range, setRange] = useState<RangeKey>("upcoming");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [conflictModal, setConflictModal] = useState<ConflictModalState | null>(null);
  const [cancelModal, setCancelModal] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

  const appointments = useAppointments();
  const patients = usePatients();
  const providers = useProviders();
  const rooms = useRooms();
  const services = useServices();
  const consents = usePatientConsents();
  const clinicProfile = useClinicProfile();

  const createAppointment = useInsert("appointments");
  const createPatient = useInsert("patients");
  const updateAppointment = useUpdate("appointments");
  const sendReminder = useServerFn(sendAppointmentReminder);

  const consentPending = (patientId: string, serviceId: string | null) => {
    const svc = services.data?.find((s) => s.id === serviceId);
    if (!svc?.consent_template_id) return false;
    return !(consents.data ?? []).some(
      (c) => c.patient_id === patientId && c.template_id === svc.consent_template_id,
    );
  };

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
      .filter((a) => (sourceFilter === "all" ? true : (a.source ?? "Walk-in") === sourceFilter))
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

  const patch = (
    id: string,
    values: Record<string, unknown>,
    msg = "Appointment updated",
    callbacks?: { onSuccess?: () => void; onError?: (err: Error) => void },
  ) =>
    updateAppointment.mutate(
      { id, values },
      {
        onSuccess: () => {
          toast.success(msg);
          callbacks?.onSuccess?.();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update appointment");
          callbacks?.onError?.(err);
        },
      },
    );

  function handleDoctorChange(a: Appointment, newDocId: string | null) {
    const conflict = checkAppointmentConflict({
      appointments: appointments.data ?? [],
      patients: patients.data ?? [],
      providers: providers.data ?? [],
      rooms: rooms.data ?? [],
      startsAt: new Date(a.starts_at),
      durationMin: a.duration_min ?? 30,
      providerId: newDocId,
      roomId: a.room_id,
      excludeId: a.id,
    });
    if (conflict) {
      setConflictModal({
        conflict,
        onConfirm: (overrideReason) => {
          const nowIso = new Date().toISOString();
          patch(
            a.id,
            {
              provider_id: newDocId,
              is_override: true,
              override_reason: overrideReason,
              override_at: nowIso,
            },
            "Doctor assigned (conflict overridden)",
          );
        },
      });
      return;
    }
    patch(a.id, { provider_id: newDocId }, "Doctor assigned");
  }

  function handleRescheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reschedule) return;
    const fd = new FormData(e.currentTarget);
    const newStart = new Date(String(fd.get("starts_at")));
    const timeErr = validateAppointmentTime(newStart, clinicProfile.data);
    if (timeErr) {
      toast.error(timeErr);
      return;
    }

    const conflict = checkAppointmentConflict({
      appointments: appointments.data ?? [],
      patients: patients.data ?? [],
      providers: providers.data ?? [],
      rooms: rooms.data ?? [],
      startsAt: newStart,
      durationMin: reschedule.duration_min ?? 30,
      providerId: reschedule.provider_id,
      roomId: reschedule.room_id,
      excludeId: reschedule.id,
    });

    const doReschedule = (overrideReason?: string) => {
      const nowIso = new Date().toISOString();
      const existingNotes = reschedule.notes ?? "";
      const overrideNotes = overrideReason
        ? `[Reschedule Override: ${overrideReason} on ${formatDateTime(nowIso)}]`
        : "";
      const updatedNotes = [existingNotes, overrideNotes].filter(Boolean).join("\n") || null;

      updateAppointment.mutate(
        {
          id: reschedule.id,
          values: {
            previous_starts_at: reschedule.starts_at,
            starts_at: newStart.toISOString(),
            reschedule_count: (reschedule.reschedule_count ?? 0) + 1,
            status: "Booked",
            ...(overrideReason
              ? {
                  is_override: true,
                  override_reason: overrideReason,
                  override_at: nowIso,
                  notes: updatedNotes,
                }
              : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success(
              overrideReason
                ? "Appointment rescheduled (conflict overridden)"
                : "Appointment rescheduled",
            );
            setReschedule(null);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    };

    if (conflict) {
      setConflictModal({
        conflict,
        onConfirm: (reason) => doReschedule(reason),
      });
      return;
    }

    doReschedule();
  }

  async function handleNewAppointmentSubmit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const service = services.data?.find((s) => s.id === String(fd.get("service_id")));
    const startsAtDate = new Date(String(fd.get("starts_at")));
    const timeErr = validateAppointmentTime(startsAtDate, clinicProfile.data);
    if (timeErr) {
      toast.error(timeErr);
      return;
    }

    let patientId = String(fd.get("patient_id") ?? "");
    if (quickAdd) {
      const name = String(fd.get("new_patient_name") ?? "").trim();
      const rawPhone = String(fd.get("new_patient_phone") ?? "");
      const phoneCountry = String(fd.get("new_patient_phone_country") || "91");
      const phoneErr = phoneError(rawPhone, phoneCountry);
      if (phoneErr) {
        toast.error(phoneErr);
        return;
      }
      const phone = phoneDigits(rawPhone);
      if (!name || !phone) {
        toast.error("New patient needs a name and mobile number");
        return;
      }
      const fullPhone = `+${phoneCountry}${phone}`;
      const existing = patients.data?.find((p) =>
        phoneCountry === "91" && phone.length === 10
          ? phoneDigits(p.phone).slice(-10) === phone
          : p.phone === fullPhone,
      );
      if (existing) {
        patientId = existing.id;
        toast.info(`${patientName(existing)} already exists — booking against that record`);
      } else {
        const [first, ...rest] = name.split(" ");
        try {
          const created = (await createPatient.mutateAsync({
            first_name: first ?? name,
            last_name: rest.join(" ") || "—",
            phone: `+${String(fd.get("new_patient_phone_country") || "91")}${phone}`,
            source: "Walk-in",
          })) as { id: string }[];
          patientId = created[0]?.id ?? "";
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

    const providerId = String(fd.get("provider_id")) || null;
    const roomId = String(fd.get("room_id")) || null;
    const durationMin = Number(fd.get("duration_min")) || service?.duration_min || 30;

    const conflict = checkAppointmentConflict({
      appointments: appointments.data ?? [],
      patients: patients.data ?? [],
      providers: providers.data ?? [],
      rooms: rooms.data ?? [],
      startsAt: startsAtDate,
      durationMin,
      providerId,
      roomId,
    });

    const doCreate = (overrideReason?: string) => {
      const nowIso = new Date().toISOString();
      const existingNotes = String(fd.get("notes") ?? "").trim();
      const overrideNotes = overrideReason
        ? `[Double-booking Override: ${overrideReason} on ${formatDateTime(nowIso)}]`
        : "";
      const notes = [existingNotes, overrideNotes].filter(Boolean).join("\n") || null;

      createAppointment.mutate(
        {
          patient_id: patientId,
          provider_id: providerId,
          room_id: roomId,
          service_id: service?.id ?? null,
          starts_at: startsAtDate.toISOString(),
          duration_min: durationMin,
          status: "Booked",
          source: String(fd.get("source")),
          temperature: String(fd.get("temperature")),
          ...(overrideReason
            ? {
                is_override: true,
                override_reason: overrideReason,
                override_at: nowIso,
              }
            : {}),
          notes,
        },
        {
          onSuccess: () => {
            toast.success(
              overrideReason
                ? "Appointment booked (double-booking overridden)"
                : "Appointment booked",
            );
            setQuickAdd(false);
            setOpen(false);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    };

    if (conflict) {
      setConflictModal({
        conflict,
        onConfirm: (reason) => doCreate(reason),
      });
      return;
    }

    doCreate();
  }

  function handleCancelConfirm() {
    if (!cancelModal || !cancelReason) return;
    const staffName =
      (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "Staff member";
    const timestamp = new Date().toISOString();
    const reasonSnippet = `[Cancellation Reason: ${cancelReason}${cancelNotes ? ` - ${cancelNotes}` : ""} by ${staffName} on ${formatDateTime(timestamp)}]`;
    const existingNotes = cancelModal.notes ? `${cancelModal.notes}\n` : "";
    const updatedNotes = `${existingNotes}${reasonSnippet}`;

    patch(
      cancelModal.id,
      {
        status: "Cancelled",
        cancellation_reason: cancelReason,
        cancelled_at: timestamp,
        cancelled_by: staffName,
        notes: updatedNotes,
      },
      "Appointment cancelled",
      {
        onSuccess: () => {
          setCancelModal(null);
          setCancelReason("");
          setCancelNotes("");
        },
      },
    );
  }

  return (
    <AppShell
      title="Appointments"
      subtitle="Bookings across WhatsApp, Instagram and walk-ins — reschedule, assign a doctor or send a reminder"
      actions={
        <button className={primaryButton} onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> New appointment
        </button>
      }
    >
      <BookingRequests />
      <section aria-label="Appointment list" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-2 border-b border-border bg-card p-3 sm:grid-cols-3 lg:flex lg:items-center">
          <label className="grid min-w-0 gap-1 lg:flex lg:items-center lg:gap-2">
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden /> Date
            </span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className={`${inputClass} min-w-0 lg:w-32`}
              aria-label="Filter appointments by date"
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All dates</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 lg:flex lg:items-center lg:gap-2">
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">Source</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`${inputClass} min-w-0 lg:w-36`}
              aria-label="Filter appointments by source"
            >
              <option value="all">All sources</option>
              {APPOINTMENT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 lg:flex lg:items-center lg:gap-2">
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">Doctor</span>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className={`${inputClass} min-w-0 lg:w-44`}
              aria-label="Filter appointments by doctor"
            >
              <option value="all">All doctors</option>
              <option value="unassigned">Unassigned</option>
              {providers.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:col-span-3 lg:ml-auto lg:justify-end">
            <span aria-live="polite" className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {rows.length} {rows.length === 1 ? "appointment" : "appointments"}
            </span>
            {range !== "upcoming" || sourceFilter !== "all" || doctorFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setRange("upcoming");
                  setSourceFilter("all");
                  setDoctorFilter("all");
                }}
                className={`${ghostButton} shrink-0`}
                aria-label="Clear appointment filters"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Clear
              </button>
            ) : null}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-xs text-muted-foreground">
            No appointments match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
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
                const patient = patients.data?.find((x) => x.id === a.patient_id);
                return (
                  <tr key={a.id} className="align-top transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3">
                      {patient ? (
                        <Link
                          to="/app/patients/$patientId"
                          params={{ patientId: patient.id }}
                          className="font-medium hover:underline"
                        >
                          {patientName(patient)}
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
                        onChange={(e) => handleDoctorChange(a, e.target.value || null)}
                        className={`${inputClass} h-8 w-36 text-xs`}
                        aria-label="Doctor"
                      >
                        <option value="">Unassigned</option>
                        {providers.data
                          ?.filter((pr) => pr.active || pr.id === a.provider_id)
                          .map((pr) => (
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
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Cancelled") {
                            setCancelModal(a);
                            setCancelReason("");
                            setCancelNotes("");
                            return;
                          }
                          patch(a.id, { status: val }, "Status updated");
                        }}
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
                      {a.cancellation_reason ? (
                        <span
                          className="mt-0.5 block max-w-[120px] truncate text-[11px] text-muted-foreground"
                          title={a.cancellation_reason}
                        >
                          {a.cancellation_reason}
                        </span>
                      ) : null}
                      {a.is_override ? (
                        <Chip tone="progress" className="mt-1 block text-[10px]">
                          Overridden
                        </Chip>
                      ) : null}
                    </td>
                    <td className="max-w-[180px] px-5 py-3 text-xs text-muted-foreground">
                      {a.notes ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => setViewingAppointment(a)}
                        >
                          <Eye className="size-3.5" /> Details
                        </button>
                        <button
                          type="button"
                          disabled={a.status === "Cancelled" || a.status === "Completed"}
                          className={`${ghostButton} disabled:opacity-40`}
                          onClick={() => setReschedule(a)}
                        >
                          <CalendarClock className="size-3.5" /> Reschedule
                        </button>
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => {
                            toast.promise(sendReminder({ data: { appointmentId: a.id } }), {
                              loading: "Sending reminder…",
                              success: "Reminder sent",
                              error: (e: Error) => e.message,
                            });
                          }}
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
      </section>

      <Dialog open={!!reschedule} onOpenChange={(v) => !v && setReschedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          {reschedule ? (
            <form id="reschedule-form" className="space-y-3" onSubmit={handleRescheduleSubmit}>
              <p className="text-sm text-muted-foreground">
                Current time:{" "}
                <span className="font-medium text-foreground">
                  {formatDateTime(reschedule.starts_at)}
                </span>
              </p>
              <Field as="div" label="New date & time">
                <TimePickerSelector
                  name="starts_at"
                  required
                  clinic={clinicProfile.data}
                  defaultValue={toLocalInputValue(new Date(reschedule.starts_at))}
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New appointment</DialogTitle>
          </DialogHeader>
          <form
            id="new-appointment"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleNewAppointmentSubmit(e.currentTarget);
            }}
          >
            <div className="sm:col-span-2">
              {quickAdd ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New patient name">
                    <input name="new_patient_name" required className={inputClass} autoFocus />
                  </Field>
                  <Field label="Mobile number">
                    <PhoneInput name="new_patient_phone" required />
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
                {providers.data
                  ?.filter((p) => p.active)
                  .map((p) => (
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
            <Field as="div" label="Schedule date & time" className="sm:col-span-2">
              <TimePickerSelector name="starts_at" required clinic={clinicProfile.data} />
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

      <ConflictAlertDialog modal={conflictModal} onClose={() => setConflictModal(null)} />

      <Dialog
        open={!!cancelModal}
        onOpenChange={(v) => {
          if (!v) {
            setCancelModal(null);
            setCancelReason("");
            setCancelNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please select a mandatory reason for cancelling this appointment:
            </p>
            <Field label="Cancellation reason *">
              <select
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select cancellation reason…
                </option>
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Additional notes (optional)">
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Add any internal context about this cancellation..."
                className={textareaClass}
              />
            </Field>
          </div>
          <DialogFooter>
            <button
              type="button"
              className={ghostButton}
              onClick={() => {
                setCancelModal(null);
                setCancelReason("");
                setCancelNotes("");
              }}
            >
              Keep appointment
            </button>
            <button
              type="button"
              disabled={!cancelReason}
              className={`${primaryButton} disabled:opacity-50`}
              onClick={handleCancelConfirm}
            >
              Confirm Cancellation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentDetailDialog
        appointment={viewingAppointment}
        patient={patients.data?.find((p) => p.id === viewingAppointment?.patient_id)}
        provider={providers.data?.find((p) => p.id === viewingAppointment?.provider_id)}
        room={rooms.data?.find((r) => r.id === viewingAppointment?.room_id)}
        service={services.data?.find((s) => s.id === viewingAppointment?.service_id)}
        onClose={() => setViewingAppointment(null)}
        onReschedule={(app) => setReschedule(app)}
        onCancel={(app) => {
          setCancelModal(app);
          setCancelReason("");
          setCancelNotes("");
        }}
      />
    </AppShell>
  );
}
