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

export interface ConflictModalState {
  message: string;
  onConfirm: () => void;
}

export function ConflictAlertDialog({
  modal,
  onClose,
}: {
  modal: ConflictModalState | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={!!modal} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Schedule Conflict Detected</AlertDialogTitle>
          <AlertDialogDescription>
            {modal?.message}
            <br />
            <br />
            Do you still want to proceed with this booking?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              modal?.onConfirm();
              onClose();
            }}
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
