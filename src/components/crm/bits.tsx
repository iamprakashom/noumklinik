import { cn } from "@/lib/utils";

const TONES = {
  completed: "bg-status-completed-soft text-status-completed",
  progress: "bg-status-progress-soft text-status-progress",
  overdue: "bg-status-overdue-soft text-status-overdue",
  idle: "bg-status-idle-soft text-status-idle",
} as const;

export type Tone = keyof typeof TONES;

export function Chip({
  tone = "idle",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AvatarCircle({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const letters = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-muted-foreground",
        size === "sm" ? "size-5 text-[10px]" : "size-8 text-xs",
      )}
    >
      {letters}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "progress",
}: {
  value: number;
  tone?: Tone;
}) {
  const fill = {
    completed: "bg-status-completed",
    progress: "bg-primary",
    overdue: "bg-status-overdue",
    idle: "bg-status-idle",
  }[tone];
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${value}%` }} />
    </div>
  );
}