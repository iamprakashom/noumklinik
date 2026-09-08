import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inputClass } from "@/components/clinic/bits";
import { AlertTriangle, Calendar, DoorClosed, Stethoscope, User } from "lucide-react";
import type { ConflictingAppointmentInfo } from "@/lib/clinic-hours";

export interface ConflictModalState {
  conflict: ConflictingAppointmentInfo;
  allowOverride?: boolean;
  onConfirm: (overrideReason: string) => void;
}

export function ConflictAlertDialog({
  modal,
  onClose,
}: {
  modal: ConflictModalState | null;
  onClose: () => void;
}) {
  const [overrideReason, setOverrideReason] = useState("");
  const allowOverride = modal?.allowOverride ?? true;

  useEffect(() => {
    setOverrideReason("");
  }, [modal]);

  if (!modal) return null;
  const { conflict } = modal;

  return (
    <AlertDialog open={!!modal} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-status-progress">
            <AlertTriangle className="size-5 shrink-0" />
            <AlertDialogTitle>Schedule Conflict Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-1 text-sm text-muted-foreground">
            The requested appointment time overlaps with an existing booking. Please review the
            conflict details below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 rounded-lg border border-status-progress/30 bg-status-progress-soft p-3.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <User className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              <strong className="font-semibold text-foreground">Conflicting patient: </strong>
              {conflict.patientName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {conflict.conflictType === "room" ? (
              <DoorClosed className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Stethoscope className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span>
              <strong className="font-semibold text-foreground">
                {conflict.conflictType === "room"
                  ? "Conflicting Room: "
                  : conflict.conflictType === "both"
                    ? "Conflicting Doctor & Room: "
                    : "Conflicting Doctor: "}
              </strong>
              {conflict.conflictType === "both"
                ? `${conflict.providerName} & ${conflict.roomName}`
                : conflict.conflictType === "room"
                  ? conflict.roomName
                  : conflict.providerName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              <strong className="font-semibold text-foreground">Existing time slot: </strong>
              {conflict.timeSlotFormatted}
            </span>
          </div>
        </div>

        {allowOverride && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-foreground">
              Override reason <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Doctor approved emergency add-on, VIP consultation..."
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">
              Overriding will double-book this slot. The reason and timestamp will be logged for
              administrative review.
            </p>
          </div>
        )}

        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          {allowOverride ? (
            <AlertDialogAction
              disabled={!overrideReason.trim()}
              onClick={() => {
                if (!overrideReason.trim()) return;
                modal.onConfirm(overrideReason.trim());
                onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Proceed Anyway
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
