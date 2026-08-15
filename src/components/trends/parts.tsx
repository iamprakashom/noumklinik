import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type { Source } from "@/data/trends";

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 28 - ((v - min) / Math.max(max - min, 1)) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-7 w-24", className)}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VolumeChart({ series }: { series: { day: string; value: number }[] }) {
  const max = Math.max(...series.map((s) => s.value));
  const min = Math.min(...series.map((s) => s.value));
  const path = series
    .map((s, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 100 - ((s.value - min) / Math.max(max - min, 1)) * 88 - 6;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-metric">
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.4" />
          ))}
          <path d={`${path} L100,100 L0,100 Z`} fill="var(--metric-soft)" stroke="none" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{series[0]?.day}</span>
        <span>{series[Math.floor(series.length / 2)]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export function FlowCard({
  label,
  accent = "neutral",
  aside,
  children,
  last,
}: {
  label: string;
  accent?: "neutral" | "ai" | "metric";
  aside?: ReactNode;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className="relative pl-8">
      <span
        className={cn(
          "absolute left-[7px] top-6 size-2.5 rounded-full ring-4 ring-background",
          accent === "ai" ? "bg-ai" : accent === "metric" ? "bg-metric" : "bg-muted-foreground/60",
        )}
      />
      {!last ? <span className="absolute bottom-[-2.5rem] left-3 top-9 w-px bg-border" /> : null}
      <article className="rounded-xl border border-border bg-card p-6 card-hover">
        <header className="mb-3 flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.18em]",
              accent === "ai" ? "text-ai" : accent === "metric" ? "text-metric" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {aside}
        </header>
        {children}
      </article>
    </div>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ai">
      AI
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-foreground">
      {children}
    </span>
  );
}

export function SourceList({
  sources,
  method,
  accent = "metric",
}: {
  sources: Source[];
  method: string;
  accent?: "ai" | "metric";
}) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sources</p>
      <ol className="mt-3 space-y-2.5">
        {sources.map((s) => (
          <li key={s.id} className="flex gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-semibold",
                accent === "ai" ? "bg-ai-soft text-ai" : "bg-metric-soft text-metric",
              )}
            >
              {s.id}
            </span>
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "inline-flex items-center gap-1 text-[13px] font-medium underline-offset-4 hover:underline",
                  accent === "ai" ? "text-ai" : "text-metric",
                )}
              >
                {s.title}
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <p className="text-[12px] text-muted-foreground">{s.note}</p>
              <p className="text-[11px] text-muted-foreground/70">
                {s.publisher} · {s.retrieved}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">{method}</p>
    </div>
  );
}
