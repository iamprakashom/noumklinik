import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/clinic/bits";

export type FilterDef = {
  key: string;
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export type SortDef = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

const selectBase =
  "h-9 rounded-md border bg-background pl-3 pr-8 text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

function activeLabel(f: FilterDef) {
  return f.options.find((o) => o.value === f.value)?.label ?? f.allLabel;
}

export function LeadsToolbar({
  query,
  onQueryChange,
  filters,
  sort,
  shown,
  total,
  onClearAll,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filters: FilterDef[];
  sort: SortDef;
  shown: number;
  total: number;
  onClearAll: () => void;
}) {
  const [openFilters, setOpenFilters] = useState(false);
  const active = filters.filter((f) => f.value !== "all");
  const hasAny = active.length > 0 || query.trim().length > 0;

  return (
    <div className="mt-6 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search name, phone or email…"
            aria-label="Search leads"
            className={cn(inputClass, "pl-9")}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpenFilters((v) => !v)}
          aria-expanded={openFilters}
          className={cn(
            selectBase,
            "flex items-center gap-1.5 pr-3 sm:hidden",
            active.length ? "border-primary text-primary" : "border-border text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters{active.length ? ` (${active.length})` : ""}
        </button>

        <div
          className={cn(
            "flex-wrap items-center gap-2",
            openFilters ? "flex w-full" : "hidden",
            "sm:flex sm:w-auto",
          )}
        >
          {filters.map((f) => (
            <select
              key={f.key}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              aria-label={f.label}
              className={cn(
                selectBase,
                f.value !== "all"
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              <option value="all">{f.allLabel}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Sort
            <select
              value={sort.value}
              onChange={(e) => sort.onChange(e.target.value)}
              aria-label="Sort leads"
              className={cn(selectBase, "border-border text-foreground")}
            >
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasAny ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            Showing {shown} of {total}
          </span>
          {query.trim() ? (
            <FilterChip label={`“${query.trim()}”`} onClear={() => onQueryChange("")} />
          ) : null}
          {active.map((f) => (
            <FilterChip
              key={f.key}
              label={`${f.label}: ${activeLabel(f)}`}
              onClear={() => f.onChange("all")}
            />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 text-xs text-primary underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
