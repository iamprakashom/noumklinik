import { Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AvatarCircle, Chip, ProgressBar } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import {
  PEOPLE,
  STAGES,
  type Campaign,
  type Stage,
  daysUntil,
  deadlineTone,
  formatDate,
  personById,
} from "@/data/crm";
import { cn } from "@/lib/utils";

export function CampaignPanel({
  campaign,
  onClose,
  onSave,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSave?: (c: Campaign) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Campaign | null>(campaign);

  useEffect(() => {
    setDraft(campaign);
    setEditing(false);
  }, [campaign]);

  if (!campaign || !draft) return null;

  const view = editing ? draft : campaign;
  const stageIndex = STAGES.indexOf(view.stage);
  const done = view.deliverables.filter((d) => d.done).length;
  const tone = deadlineTone(view.deadline, view.stage);
  const days = daysUntil(view.deadline);
  const pms = PEOPLE.filter((p) => p.role === "PM");
  const executors = PEOPLE.filter((p) => p.role === "Executor");
  const nextStage = STAGES[stageIndex + 1] as Stage | undefined;

  function patch(p: Partial<Campaign>) {
    setDraft((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function toggleDeliverable(id: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            deliverables: prev.deliverables.map((d) =>
              d.id === id ? { ...d, done: !d.done } : d,
            ),
          }
        : prev,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/20"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-[520px] flex-col overflow-y-auto border-l border-border bg-card shadow-[0_0_40px_oklch(0_0_0/0.12)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          {editing ? (
            <div className="grid flex-1 gap-2">
              <input
                value={draft.client}
                onChange={(e) => patch({ client: e.target.value })}
                aria-label="Client"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input
                value={draft.song}
                onChange={(e) => patch({ song: e.target.value })}
                aria-label="Campaign / song"
                className="h-9 rounded-md border border-border bg-background px-2 text-base font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">{campaign.client}</p>
              <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{campaign.song}</h2>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Edit campaign"
              >
                <Pencil className="size-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close panel"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-medium text-muted-foreground">Current stage</p>
          {editing ? (
            <select
              value={draft.stage}
              onChange={(e) => patch({ stage: e.target.value as Stage })}
              aria-label="Stage"
              className="mt-2 h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-md bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground">
                <span className="size-2 rounded-full bg-primary" />
                {view.stage}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                Step {stageIndex + 1} of {STAGES.length}
              </span>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-5 border-b border-border px-6 py-5">
          <Field label="Project manager">
            {editing ? (
              <select
                value={draft.pm}
                onChange={(e) => patch({ pm: e.target.value })}
                aria-label="Project manager"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {pms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <AvatarCircle name={personById(view.pm).name} />
                {personById(view.pm).name}
              </span>
            )}
          </Field>
          <Field label="Executor">
            {editing ? (
              <select
                value={draft.executor}
                onChange={(e) => patch({ executor: e.target.value })}
                aria-label="Executor"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {executors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <AvatarCircle name={personById(view.executor).name} />
                {personById(view.executor).name}
              </span>
            )}
          </Field>
          <Field label="Deadline">
            {editing ? (
              <input
                type="date"
                value={draft.deadline}
                onChange={(e) => patch({ deadline: e.target.value })}
                aria-label="Deadline"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            ) : (
              <Chip tone={tone}>
                {formatDate(view.deadline)}
                {tone === "overdue" ? ` · ${Math.abs(days)}d late` : ""}
              </Chip>
            )}
          </Field>
          <Field label="Deliverables">
            <div className="flex items-center gap-2">
              <ProgressBar
                value={(done / view.deliverables.length) * 100}
                tone={view.stage === "Completed" ? "completed" : "progress"}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {done}/{view.deliverables.length}
              </span>
            </div>
          </Field>
        </dl>

        <div className="px-6 py-5">
          <p className="text-xs font-medium text-muted-foreground">Deliverables</p>
          <ul className="mt-3 flex flex-col">
            {view.deliverables.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
              >
                <button
                  type="button"
                  disabled={!editing}
                  onClick={() => toggleDeliverable(d.id)}
                  aria-label={`Toggle ${d.label}`}
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[4px] border text-[10px]",
                    d.done
                      ? "border-status-completed bg-status-completed text-primary-foreground"
                      : "border-border",
                    editing && "cursor-pointer",
                  )}
                >
                  {d.done ? "✓" : ""}
                </button>
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
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(campaign);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => {
                  onSave?.(draft);
                  setEditing(false);
                }}
              >
                Save changes
              </Button>
            </>
          ) : (
            <>
          {view.stage === "Approval" && (
            <Button
              variant="outline"
              size="sm"
              className="border-status-overdue text-status-overdue hover:bg-status-overdue-soft hover:text-status-overdue"
              onClick={() => {
                onSave?.({ ...campaign, stage: "Editing/Sampling" });
                toast.error(`${campaign.song} sent back to Editing/Sampling`);
              }}
            >
              Reject to Editor
            </Button>
          )}
          <Button
            size="sm"
            className="ml-auto"
            disabled={!nextStage}
            onClick={() => {
              if (!nextStage) return;
              onSave?.({ ...campaign, stage: nextStage });
              toast.success(`${campaign.song} moved to ${nextStage}`);
            }}
          >
            {nextStage ? `Advance to ${nextStage}` : "Completed"}
          </Button>
            </>
          )}
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