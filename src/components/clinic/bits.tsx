import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/data/clinic";

const TONE: Record<StatusTone, string> = {
  completed: "bg-status-completed-soft text-status-completed",
  progress: "bg-status-progress-soft text-status-progress",
  overdue: "bg-status-overdue-soft text-status-overdue",
  idle: "bg-status-idle-soft text-status-idle",
};

export function Chip({
  tone = "idle",
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground",
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  className,
  as = "label",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  as?: "label" | "div";
}) {
  if (as === "div") {
    return (
      <div role="group" aria-label={label} className={cn("grid gap-1.5", className)}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

export const textareaClass =
  "min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}
