import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Chip } from "@/components/clinic/bits";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import {
  appointmentTone,
  formatDateTime,
  patientName,
  type Appointment,
  type Patient,
  type Provider,
  type Room,
  type Service,
} from "@/data/clinic";
import {
  AlertTriangle,
  Calendar,
  Clock,
  DoorClosed,
  FileText,
  Mail,
  Phone,
  Stethoscope,
  Tag,
  User,
  XCircle,
} from "lucide-react";

export function AppointmentDetailDialog({
  appointment,
  patient,
  provider,
  room,
  service,
  onClose,
  onReschedule,
  onCancel,
}: {
  appointment: Appointment | null;
  patient?: Patient | null | undefined;
  provider?: Provider | null | undefined;
  room?: Room | null | undefined;
  service?: Service | null | undefined;
  onClose: () => void;
  onReschedule?: ((app: Appointment) => void) | undefined;
  onCancel?: ((app: Appointment) => void) | undefined;
}) {
  if (!appointment) return null;

  const isCancelled = appointment.status === "Cancelled";
  const isOverridden = appointment.is_override || !!appointment.override_reason;

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-4">
            <DialogTitle className="text-base font-semibold">Appointment Details</DialogTitle>
            <Chip tone={appointmentTone(appointment.status)}>{appointment.status}</Chip>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {/* Double-booking override banner (APT-05.3) */}
          {isOverridden && (
            <div className="rounded-lg border border-status-progress/30 bg-status-progress-soft p-3 text-xs text-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-status-progress">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Double-Booking Override</span>
              </div>
              <div className="mt-1.5 space-y-1">
                <p>
                  <strong className="font-medium">Override Reason: </strong>
                  {appointment.override_reason || "Approved double-booking"}
                </p>
                {appointment.override_at && (
                  <p className="text-[11px] text-muted-foreground">
                    Overridden on {formatDateTime(appointment.override_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cancellation details banner (APT-08.2) */}
          {isCancelled && (
            <div className="rounded-lg border border-status-overdue/30 bg-status-overdue-soft p-3 text-xs text-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-status-overdue">
                <XCircle className="size-4 shrink-0" />
                <span>Appointment Cancelled</span>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Cancellation Reason
                  </span>
                  <span className="font-semibold text-foreground">
                    {appointment.cancellation_reason || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Cancelled By</span>
                  <span className="font-medium text-foreground">
                    {appointment.cancelled_by || "Staff member"}
                  </span>
                </div>
                {appointment.cancelled_at && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Cancelled At</span>
                    <span className="font-medium text-foreground">
                      {formatDateTime(appointment.cancelled_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patient Card */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Patient</span>
              {patient ? (
                <Link
                  to="/app/patients/$patientId"
                  params={{ patientId: patient.id }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View patient profile →
                </Link>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">
                {patient ? patientName(patient) : "Unknown patient"}
              </span>
            </div>
            {(patient?.phone || patient?.email) && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-0.5">
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {patient.email}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Appointment timing & service */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> Date & Time
              </span>
              <p className="font-medium text-foreground">{formatDateTime(appointment.starts_at)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> {appointment.duration_min} minutes
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="size-3" /> Treatment
              </span>
              <p className="font-medium text-foreground">
                {service?.name ?? "General Consultation"}
              </p>
              <p className="text-xs text-muted-foreground">
                {service?.category ? `${service.category} · ` : ""}
                {service?.price ? `₹${service.price}` : ""}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Stethoscope className="size-3" /> Doctor
              </span>
              <p className="font-medium text-foreground">{provider?.name ?? "Unassigned"}</p>
              {provider?.title && <p className="text-xs text-muted-foreground">{provider.title}</p>}
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DoorClosed className="size-3" /> Room
              </span>
              <p className="font-medium text-foreground">{room?.name ?? "Not assigned"}</p>
            </div>
          </div>

          {/* Reschedule history */}
          {appointment.reschedule_count > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1">
              <span className="font-medium text-foreground">Reschedule history</span>
              <p className="text-muted-foreground">
                Rescheduled {appointment.reschedule_count} time
                {appointment.reschedule_count > 1 ? "s" : ""}
                {appointment.previous_starts_at && (
                  <span>
                    {" "}
                    · Previously scheduled for {formatDateTime(appointment.previous_starts_at)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Source & Notes */}
          <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>
                Source:{" "}
                <strong className="font-medium text-foreground">
                  {appointment.source || "Walk-in"}
                </strong>
              </span>
              <span>
                Priority tag:{" "}
                <strong className="font-medium text-foreground">
                  {appointment.temperature || "Warm"}
                </strong>
              </span>
            </div>
            {appointment.notes && (
              <div className="border-t border-border pt-2">
                <span className="text-muted-foreground block mb-1 flex items-center gap-1">
                  <FileText className="size-3" /> Notes
                </span>
                <p className="whitespace-pre-line text-foreground">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
          <button type="button" className={ghostButton} onClick={onClose}>
            Close
          </button>
          {!isCancelled && appointment.status !== "Completed" && (
            <>
              {onCancel && (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-3.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  onClick={() => {
                    onClose();
                    onCancel(appointment);
                  }}
                >
                  Cancel appointment
                </button>
              )}
              {onReschedule && (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => {
                    onClose();
                    onReschedule(appointment);
                  }}
                >
                  Reschedule
                </button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
