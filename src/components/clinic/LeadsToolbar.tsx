import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/clinic/bits";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  "h-9 rounded-md border bg-background pl-3 pr-8 text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftSort, setDraftSort] = useState(sort.options[0]?.value ?? "");

  const active = filters.filter((f) => f.value !== "all");
  const hasAny = active.length > 0 || query.trim().length > 0;

  const openSheet = () => {
    setDraft(Object.fromEntries(filters.map((f) => [f.key, f.value])));
    setDraftSort(sort.value);
    setSheetOpen(true);
  };

  const applySheet = () => {
    for (const f of filters) {
      const v = draft[f.key] ?? "all";
      if (v !== f.value) f.onChange(v);
    }
    if (draftSort !== sort.value) sort.onChange(draftSort);
    setSheetOpen(false);
  };

  const resetSheet = () => {
    setDraft(Object.fromEntries(filters.map((f) => [f.key, "all"])));
    setDraftSort(sort.options[0]?.value ?? "");
  };

  const draftActiveCount = Object.values(draft).filter((v) => v && v !== "all").length;

  return (
    <div className="mt-6 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                onQueryChange("");
              }
            }}
            placeholder="Search name, phone or email…"
            aria-label="Search leads by name, phone or email"
            className={cn(inputClass, "pl-9", focusRing)}
          />
        </div>

        {/* Mobile: open filter sheet */}
        <button
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          className={cn(
            selectBase,
            "flex items-center gap-1.5 pr-3 sm:hidden",
            active.length ? "border-primary text-primary" : "border-border text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters{active.length ? ` (${active.length})` : ""}
        </button>

        {/* Desktop: inline filters */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex sm:w-auto">
          {filters.map((f) => (
            <select
              key={f.key}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              aria-label={`${f.label}: ${activeLabel(f)}`}
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
              aria-label={`Sort leads: ${sort.options.find((o) => o.value === sort.value)?.label ?? sort.value}`}
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

      <span aria-live="polite" className="sr-only">
        Showing {shown} of {total} leads
      </span>

      {hasAny ? (
        <div
          role="group"
          aria-label="Active filters"
          className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground"
        >
          <span className="tabular-nums" aria-hidden>
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
            className={cn(
              "ml-1 rounded text-xs text-primary underline-offset-2 hover:underline",
              focusRing,
            )}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter leads</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-2">
            {filters.map((f) => (
              <label key={f.key} className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                <select
                  value={draft[f.key] ?? "all"}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  className={cn(selectBase, "h-10 w-full text-sm")}
                >
                  <option value="all">{f.allLabel}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Sort</span>
              <select
                value={draftSort}
                onChange={(e) => setDraftSort(e.target.value)}
                className={cn(selectBase, "h-10 w-full text-sm")}
              >
                {sort.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <SheetFooter className="flex-row gap-2 px-4">
            <button
              type="button"
              onClick={resetSheet}
              className={cn(
                "h-10 flex-1 rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-secondary",
                focusRing,
              )}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applySheet}
              className={cn(
                "h-10 flex-[2] rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                focusRing,
              )}
            >
              Apply filters{draftActiveCount ? ` (${draftActiveCount})` : ""}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
        aria-label={`Remove ${label}`}
        className={cn("rounded-full text-muted-foreground transition-colors hover:text-foreground", focusRing)}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
