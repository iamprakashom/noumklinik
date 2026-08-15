import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  KanbanSquare,
  LayoutDashboard,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INITIAL_HISTORY,
  SUGGESTED_PROMPTS,
  buildReport,
  type SavedSearch,
} from "@/data/trends";
import {
  AiBadge,
  Chip,
  FlowCard,
  SourceList,
  Sparkline,
  VolumeChart,
} from "@/components/trends/parts";

const MAIN_MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: KanbanSquare },
  { to: "/people", label: "People", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Trend Intelligence — AI Music Trend Search" },
      {
        name: "description",
        content:
          "Search any song, artist, genre or topic and get an AI narrative from trend to data, insight, opportunity and recommended actions.",
      },
      { property: "og:title", content: "Trend Intelligence — AI Music Trend Search" },
      {
        property: "og:description",
        content:
          "AI-powered trend intelligence for music marketing teams: mention volume, discussion excerpts and campaign-ready recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrendsPage,
});

function TrendsPage() {
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedSearch[]>(INITIAL_HISTORY);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const report = useMemo(() => (keyword ? buildReport(keyword) : null), [keyword]);

  function run(term: string) {
    const value = term.trim();
    if (!value) return;
    setKeyword(value);
    setQuery(value);
    setSaved(false);
    setHistory((prev) => [
      { keyword: value, at: "Just now", direction: buildReport(value).direction },
      ...prev.filter((h) => h.keyword.toLowerCase() !== value.toLowerCase()),
    ]);
  }

  return (
    <div className="trend-scope relative flex min-h-screen w-full overflow-hidden font-sans">
      <Aurora />

      <aside
        className={cn(
          "relative z-10 flex h-screen shrink-0 flex-col border-r border-border bg-background/70 backdrop-blur transition-[width] duration-200",
          sidebarOpen ? "w-64" : "w-14",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Collapse history" : "Expand history"}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
          {sidebarOpen ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              History
            </span>
          ) : null}
        </div>

        {sidebarOpen ? (
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
            {history.map((item) => (
              <button
                key={item.keyword}
                type="button"
                onClick={() => run(item.keyword)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-secondary"
              >
                {item.direction === "up" ? (
                  <ArrowUpRight className="size-3.5 shrink-0 text-metric" />
                ) : (
                  <ArrowDownRight className="size-3.5 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.keyword}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.at}</span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="border-t border-border p-2">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              !sidebarOpen && "justify-center px-0",
            )}
          >
            <Sparkles className="size-4 shrink-0" />
            {sidebarOpen ? "Back to CRM" : null}
          </Link>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {report ? (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{report.keyword}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  report.direction === "up"
                    ? "bg-metric-soft text-metric"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {report.change} · 14d
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSaved((v) => !v)}
                aria-label="Save search"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {saved ? <BookmarkCheck className="size-4 text-ai" /> : <Bookmark className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeyword(null);
                  setQuery("");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="size-3.5" /> New Search
              </button>
            </div>
          </header>
        ) : null}

        <main className="flex flex-1 justify-center px-6">
          <div className="w-full max-w-[800px]">
            {report ? (
              <Results report={report} />
            ) : (
              <SearchHome query={query} setQuery={setQuery} onSearch={run} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="trend-aurora absolute -left-40 top-[-12rem] size-[36rem] rounded-full bg-ai-soft blur-[120px]" />
      <div className="trend-aurora absolute -right-32 top-40 size-[30rem] rounded-full bg-metric-soft blur-[130px] [animation-delay:-7s]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,var(--background)_75%)]" />
    </div>
  );
}

function SearchHome({
  query,
  setQuery,
  onSearch,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSearch: (v: string) => void;
}) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center py-24 text-center">
      <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Sparkles className="size-3 text-ai" /> Trend Intelligence
      </span>
      <h1 className="text-[40px] font-semibold leading-tight tracking-tight">What's trending?</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Raw signal in white and teal. <span className="text-ai">AI interpretation in purple.</span>
      </p>

      <form
        className="mt-9 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
      >
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 backdrop-blur transition-colors focus-within:border-ai">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a song, artist, genre, or topic..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Analyze
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSearch(p)}
            className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-ai/50 hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}

function Results({ report }: { report: ReturnType<typeof buildReport> }) {
  return (
    <div className="space-y-10 py-10">
      <FlowCard
        label="Trend"
        aside={
          <span className={report.direction === "up" ? "text-metric" : "text-destructive"}>
            <Sparkline values={report.trend.spark} />
          </span>
        }
      >
        <h2 className="text-xl font-semibold tracking-tight">{report.trend.headline}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{report.trend.summary}</p>
      </FlowCard>

      <FlowCard
        label="Data"
        accent="metric"
        aside={<span className="text-[11px] text-muted-foreground">Mention volume · last 14 days</span>}
      >
        <VolumeChart series={report.data.series} />
        <ul className="mt-5 space-y-3 border-t border-border pt-4">
          {report.data.excerpts.map((e) => (
            <li key={e.text} className="border-l-2 border-border pl-3">
              <p className="text-[13px] italic text-muted-foreground">“{e.text}”</p>
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-block text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-metric hover:underline"
              >
                {e.source}
              </a>
            </li>
          ))}
        </ul>
        <SourceList sources={report.data.sources} method={report.data.method} />
      </FlowCard>

      <FlowCard label="Insight" accent="ai" aside={<AiBadge />}>
        <p className="text-[15px] leading-relaxed text-foreground">{report.insight}</p>
        <SourceList sources={report.insightSources} method={report.insightMethod} accent="ai" />
      </FlowCard>

      <FlowCard label="Opportunity" accent="ai" aside={<AiBadge />}>
        <p className="text-[15px] font-semibold leading-relaxed">{report.opportunity}</p>
      </FlowCard>

      <FlowCard label="Recommendation" accent="ai" aside={<AiBadge />} last>
        <ul className="space-y-4">
          {report.recommendations.map((r) => (
            <li key={r.label}>
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{r.label}</p>
              <div className="flex flex-wrap gap-2">
                {r.chips.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </FlowCard>
    </div>
  );
}
