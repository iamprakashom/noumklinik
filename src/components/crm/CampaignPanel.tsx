import { X } from "lucide-react";
import { AvatarCircle, Chip, ProgressBar } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import {
  STAGES,
  type Campaign,
  daysUntil,
  deadlineTone,
  formatDate,
  personById,
} from "@/data/crm";
import { cn } from "@/lib/utils";

export function CampaignPanel({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  if (!campaign) return null;

  const stageIndex = STAGES.indexOf(campaign.stage);
  const done = campaign.deliverables.filter((d) => d.done).length;
  const tone = deadlineTone(campaign.deadline, campaign.stage);
  const days = daysUntil(campaign.deadline);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/20"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-[520px] flex-col overflow-y-auto border-l border-border bg-card shadow-[0_0_40px_oklch(0_0_0/0.12)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs text-muted-foreground">{campaign.client}</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{campaign.song}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-medium text-muted-foreground">Current stage</p>
          <ol className="mt-3 flex items-center">
            {STAGES.map((s, i) => (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      i < stageIndex && "bg-status-completed",
                      i === stageIndex && "bg-primary ring-4 ring-accent",
                      i > stageIndex && "bg-border",
                    )}
                  />
                  <span
                    className={cn(
                      "w-14 text-center text-[10px] leading-tight",
                      i === stageIndex
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {s}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <span
                    className={cn(
                      "-mt-5 h-px flex-1",
                      i < stageIndex ? "bg-status-completed" : "bg-border",
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        <dl className="grid grid-cols-2 gap-5 border-b border-border px-6 py-5">
          <Field label="Project manager">
            <span className="flex items-center gap-2 text-sm">
              <AvatarCircle name={personById(campaign.pm).name} />
              {personById(campaign.pm).name}
            </span>
          </Field>
          <Field label="Executor">
            <span className="flex items-center gap-2 text-sm">
              <AvatarCircle name={personById(campaign.executor).name} />
              {personById(campaign.executor).name}
            </span>
          </Field>
          <Field label="Deadline">
            <Chip tone={tone}>
              {formatDate(campaign.deadline)}
              {tone === "overdue" ? ` · ${Math.abs(days)}d late` : ""}
            </Chip>
          </Field>
          <Field label="Deliverables">
            <div className="flex items-center gap-2">
              <ProgressBar
                value={(done / campaign.deliverables.length) * 100}
                tone={campaign.stage === "Completed" ? "completed" : "progress"}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {done}/{campaign.deliverables.length}
              </span>
            </div>
          </Field>
        </dl>

        <div className="px-6 py-5">
          <p className="text-xs font-medium text-muted-foreground">Checklist</p>
          <ul className="mt-3 flex flex-col">
            {campaign.deliverables.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[4px] border text-[10px]",
                    d.done
                      ? "border-status-completed bg-status-completed text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {d.done ? "✓" : ""}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    d.done ? "text-muted-foreground line-through" : "",
                  )}
                >
                  {d.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border px-6 py-4">
          {campaign.stage === "Approval" && (
            <Button
              variant="outline"
              size="sm"
              className="border-status-overdue text-status-overdue hover:bg-status-overdue-soft hover:text-status-overdue"
            >
              Reject to Editor
            </Button>
          )}
          <Button size="sm" className="ml-auto">
            Advance stage
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}