import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Inbox, X } from "lucide-react";
import { Chip } from "@/components/clinic/bits";
import { formatDateTime } from "@/data/clinic";
import { checkAppointmentConflict, validateAppointmentTime } from "@/lib/clinic-hours";
import {
  ConflictAlertDialog,
  type ConflictModalState,
} from "@/components/clinic/ConflictAlertDialog";
import {
  useAppointments,
  useAppointmentRequests,
  useClinicProfile,
  useInsert,
  usePatients,
  useProviders,
  useRooms,
  useServices,
  useUpdate,
  type AppointmentRequest,
} from "@/lib/clinic-data";

/** Queue of self-serve booking and reschedule requests waiting on the front desk. */
export function BookingRequests() {
  const requests = useAppointmentRequests();
  const appointments = useAppointments();
  const patients = usePatients();
  const services = useServices();
  const providers = useProviders();
  const rooms = useRooms();
  const addPatient = useInsert("patients");
  const addAppointment = useInsert("appointments");
  const updatePatient = useUpdate("patients");
  const updateRequest = useUpdate("appointment_requests");
  const updateAppointment = useUpdate("appointments");
  const clinicProfile = useClinicProfile();
  const [busy, setBusy] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<ConflictModalState | null>(null);

  const pending = (requests.data ?? []).filter((r) => r.status === "New");
  if (pending.length === 0) return null;

  const digits = (v: string) => v.replace(/\D/g, "").slice(-10);

  async function executeAccept(req: AppointmentRequest) {
    setBusy(req.id);
    try {
      if (req.kind === "reschedule" && req.appointment_id) {
        await updateAppointment.mutateAsync({
          id: req.appointment_id,
          values: { starts_at: req.preferred_at, status: "Booked" },
        });
      } else {
        let patientId = req.patient_id;
        let matchedPatient = patientId
          ? (patients.data ?? []).find((p) => p.id === patientId)
          : null;
        if (!patientId) {
          matchedPatient = (patients.data ?? []).find(
            (p) => digits(p.phone ?? "") === digits(req.phone),
          );
          patientId = matchedPatient?.id ?? null;
        }
        if (patientId && matchedPatient && (req.birth_date || req.gender)) {
          const updates: Record<string, unknown> = {};
          if (req.birth_date && !matchedPatient.birth_date) updates["birth_date"] = req.birth_date;
          if (req.gender && !matchedPatient.gender) updates["gender"] = req.gender;
          if (Object.keys(updates).length > 0) {
            await updatePatient.mutateAsync({ id: patientId, values: updates });
          }
        }
        if (!patientId) {
          const [first, ...rest] = req.full_name.split(" ");
          const created = (await addPatient.mutateAsync({
            first_name: first ?? req.full_name,
            last_name: rest.join(" ") || "—",
            phone: req.phone,
            email: req.email,
            birth_date: req.birth_date || null,
            gender: req.gender || null,
            source: "Website",
          })) as { id: string }[];
          patientId = created[0]?.id ?? null;
        }
        if (!patientId) throw new Error("Could not create the patient record");
        const svc = services.data?.find((s) => s.id === req.service_id);
        await addAppointment.mutateAsync({
          patient_id: patientId,
          service_id: req.service_id,
          provider_id: req.provider_id,
          starts_at: req.preferred_at,
          duration_min: svc?.duration_min ?? 30,
          status: "Booked",
          source: "Website",
          notes: req.notes,
        });
      }
      await updateRequest.mutateAsync({ id: req.id, values: { status: "Accepted" } });
      toast.success("Appointment scheduled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept this request");
    } finally {
      setBusy(null);
    }
  }

  function accept(req: AppointmentRequest) {
    const timeErr = validateAppointmentTime(req.preferred_at, clinicProfile.data);
    if (timeErr) {
      toast.error(`Cannot accept: ${timeErr}`);
      return;
    }

    let conflictMsg: string | null = null;
    const startsAtDate = new Date(req.preferred_at);
    if (req.kind === "reschedule" && req.appointment_id) {
      const existingApp = appointments.data?.find((a) => a.id === req.appointment_id);
      conflictMsg = checkAppointmentConflict({
        appointments: appointments.data ?? [],
        providers: providers.data ?? [],
        rooms: rooms.data ?? [],
        startsAt: startsAtDate,
        durationMin: existingApp?.duration_min ?? 30,
        providerId: existingApp?.provider_id,
        roomId: existingApp?.room_id,
        excludeId: req.appointment_id,
      });
    } else {
      const svc = services.data?.find((s) => s.id === req.service_id);
      conflictMsg = checkAppointmentConflict({
        appointments: appointments.data ?? [],
        providers: providers.data ?? [],
        rooms: rooms.data ?? [],
        startsAt: startsAtDate,
        durationMin: svc?.duration_min ?? 30,
        providerId: req.provider_id,
      });
    }

    if (conflictMsg) {
      setConflictModal({
        message: conflictMsg,
        onConfirm: () => void executeAccept(req),
      });
      return;
    }

    void executeAccept(req);
  }

  return (
    <section className="mb-5 rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Inbox className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Booking requests</h2>
        <span className="text-xs text-muted-foreground">{pending.length} waiting</span>
      </header>
      <ul className="divide-y divide-border">
        {pending.map((r) => {
          const svc = services.data?.find((s) => s.id === r.service_id);
          const doc = providers.data?.find((p) => p.id === r.provider_id);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-52 flex-1">
                <p className="font-medium">
                  {r.full_name} <span className="text-xs text-muted-foreground">{r.phone}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {[svc?.name ?? "Treatment not chosen", doc?.name, r.notes]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Chip tone={r.kind === "reschedule" ? "overdue" : "progress"}>
                {r.kind === "reschedule" ? "Reschedule" : "New booking"}
              </Chip>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(r.preferred_at)}
                {r.alternate_at ? ` · alt ${formatDateTime(r.alternate_at)}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-60"
                  disabled={busy === r.id}
                  onClick={() => void accept(r)}
                >
                  <CalendarPlus className="size-3.5" /> Schedule
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                  disabled={busy === r.id}
                  onClick={() =>
                    updateRequest.mutate(
                      { id: r.id, values: { status: "Declined" } },
                      { onSuccess: () => toast.success("Request declined") },
                    )
                  }
                >
                  <X className="size-3.5" /> Decline
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConflictAlertDialog modal={conflictModal} onClose={() => setConflictModal(null)} />
    </section>
  );
}
