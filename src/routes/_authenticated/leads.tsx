import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, Plus, Rows3, UserRoundCheck } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_GROUPS,
  LEAD_STAGES,
  SOURCE_GROUP_BY_SOURCE,
  TEMPERATURES,
  TEMPERATURE_HINT,
  daysSince,
  formatDate,
  leadTone,
  temperatureTone,
} from "@/data/clinic";
import type { Lead } from "@/data/clinic";
import {
  useConvertLead,
  useInsert,
  useLeads,
  useProviders,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Track aesthetic clinic enquiries from Meta ads, Google ads and organic sources, score interest strength and work overdue follow-ups.",
      },
      { property: "og:title", content: "Leads — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Lead pipeline with interest strength, source groups and follow-up tracking.",
      },
    ],
  }),
  component: LeadsPage,
});

type SortKey = "oldest" | "newest" | "follow_up";

function sourceGroupOf(lead: Lead) {
  return lead.source_group ?? SOURCE_GROUP_BY_SOURCE[lead.source] ?? "Organic";
}

function LeadsPage() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");
  const [stage, setStage] = useState("all");
  const [treatment, setTreatment] = useState("all");
  const [group, setGroup] = useState("all");
  const [doctor, setDoctor] = useState("all");
  const [sort, setSort] = useState<SortKey>("oldest");

  const leads = useLeads();
  const providers = useProviders();
  const services = useServices();
  const createLead = useInsert("leads");
  const updateLead = useUpdate("leads");
  const convertLead = useConvertLead();

  const all = useMemo(() => leads.data ?? [], [leads.data]);

  const rows = useMemo(() => {
    const filtered = all.filter(
      (l) =>
        (stage === "all" || l.stage === stage) &&
        (treatment === "all" || l.service_id === treatment) &&
        (group === "all" || sourceGroupOf(l) === group) &&
        (doctor === "all" ||
          (doctor === "unassigned" ? !l.owner_id : l.owner_id === doctor)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (sort === "follow_up")
        return (a.next_follow_up_at ?? "9999").localeCompare(b.next_follow_up_at ?? "9999");
      return a.created_at.localeCompare(b.created_at);
    });
  }, [all, stage, treatment, group, doctor, sort]);

  const today = new Date().toISOString();
  const overdue = all.filter(
    (l) => l.next_follow_up_at && l.next_follow_up_at < today && l.stage !== "Converted" && l.stage !== "Lost",
  );
  const scheduled = all.filter(
    (l) => l.next_follow_up_at && l.next_follow_up_at >= today && l.stage !== "Converted",
  );

  const providerName = (id: string | null) =>
    providers.data?.find((p) => p.id === id)?.name ?? "Unassigned";
  const serviceName = (id: string | null) =>
    services.data?.find((s) => s.id === id)?.name ?? "—";

  const setField = (id: string, values: Record<string, unknown>) =>
    updateLead.mutate({ id, values }, { onSuccess: () => toast.success("Lead updated") });

  return (
    <AppShell
      title="Leads"
      subtitle="Enquiries from Meta ads, Google ads, organic, referrals and walk-ins"
      actions={
        <>
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <button
              className={`flex h-8 items-center gap-1.5 rounded px-2.5 text-xs ${view === "table" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              onClick={() => setView("table")}
            >
              <Rows3 className="size-3.5" /> Table
            </button>
            <button
              className={`flex h-8 items-center gap-1.5 rounded px-2.5 text-xs ${view === "cards" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              onClick={() => setView("cards")}
            >
              <LayoutGrid className="size-3.5" /> Cards
            </button>
          </div>
          <button className={primaryButton} onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Add lead
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Overdue follow-ups</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overdue.length}</p>
          <ul className="mt-2 space-y-1">
            {overdue.slice(0, 3).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-xs">
                <span>{l.full_name}</span>
                <span className="text-status-overdue">
                  due {formatDate(l.next_follow_up_at)}
                </span>
              </li>
            ))}
            {overdue.length === 0 ? (
              <li className="text-xs text-muted-foreground">Nothing overdue.</li>
            ) : null}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Scheduled follow-ups</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{scheduled.length}</p>
          <ul className="mt-2 space-y-1">
            {scheduled.slice(0, 3).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-xs">
                <span>{l.full_name}</span>
                <span className="text-muted-foreground">{formatDate(l.next_follow_up_at)}</span>
              </li>
            ))}
            {scheduled.length === 0 ? (
              <li className="text-xs text-muted-foreground">Nothing scheduled.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={`${inputClass} w-40`} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={treatment} onChange={(e) => setTreatment(e.target.value)} className={`${inputClass} w-44`} aria-label="Filter by treatment">
          <option value="all">All treatments</option>
          {services.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${inputClass} w-40`} aria-label="Filter by source">
          <option value="all">All sources</option>
          {LEAD_SOURCE_GROUPS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className={`${inputClass} w-44`} aria-label="Filter by doctor">
          <option value="all">All doctors</option>
          <option value="unassigned">Unassigned</option>
          {providers.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${inputClass} w-48`} aria-label="Sort leads">
          <option value="oldest">Ageing · oldest first</option>
          <option value="newest">Ageing · newest first</option>
          <option value="follow_up">Next follow-up</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState>No leads match these filters.</EmptyState>
        </div>
      ) : view === "table" ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Treatment</th>
                <th className="px-5 py-3 font-medium">Interest</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">Ageing</th>
                <th className="px-5 py-3 font-medium">Next follow-up</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((l) => {
                const isOverdue = !!l.next_follow_up_at && l.next_follow_up_at < today;
                return (
                  <tr key={l.id} className="transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3">
                      <p className="font-medium">{l.full_name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone ?? l.email ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {sourceGroupOf(l)}
                      <span className="block">{l.source}</span>
                    </td>
                    <td className="px-5 py-3 text-xs">{l.service_id ? serviceName(l.service_id) : (l.interest ?? "—")}</td>
                    <td className="px-5 py-3">
                      <select
                        value={l.temperature}
                        onChange={(e) => setField(l.id, { temperature: e.target.value })}
                        className={`${inputClass} h-8 w-24 text-xs`}
                        aria-label="Interest strength"
                      >
                        {TEMPERATURES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={l.stage}
                        onChange={(e) => setField(l.id, { stage: e.target.value })}
                        className={`${inputClass} h-8 w-36 text-xs`}
                        aria-label="Lead status"
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={l.owner_id ?? ""}
                        onChange={(e) => setField(l.id, { owner_id: e.target.value || null })}
                        className={`${inputClass} h-8 w-36 text-xs`}
                        aria-label="Assigned doctor"
                      >
                        <option value="">Unassigned</option>
                        {providers.data?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-muted-foreground">
                      {daysSince(l.created_at)}d
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="date"
                        value={l.next_follow_up_at ? l.next_follow_up_at.slice(0, 10) : ""}
                        onChange={(e) =>
                          setField(l.id, {
                            next_follow_up_at: e.target.value
                              ? new Date(`${e.target.value}T09:00:00`).toISOString()
                              : null,
                          })
                        }
                        className={`${inputClass} h-8 w-36 text-xs ${isOverdue ? "border-status-overdue text-status-overdue" : ""}`}
                        aria-label="Next follow-up"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {l.stage !== "Converted" ? (
                        <button
                          className={ghostButton}
                          onClick={() =>
                            convertLead.mutate(l, {
                              onSuccess: () => toast.success("Lead converted to patient"),
                              onError: (err) => toast.error(err.message),
                            })
                          }
                        >
                          <UserRoundCheck className="size-3.5" /> Convert
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <article key={l.id} className="card-hover rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{l.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.service_id ? serviceName(l.service_id) : (l.interest ?? "General enquiry")}
                  </p>
                </div>
                <Chip tone={temperatureTone(l.temperature)}>{l.temperature}</Chip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Chip tone={leadTone(l.stage)}>{l.stage}</Chip>
                <Chip>{sourceGroupOf(l)}</Chip>
                <span className="text-[11px] text-muted-foreground">{daysSince(l.created_at)}d old</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {providerName(l.owner_id)} ·{" "}
                {l.next_follow_up_at
                  ? `follow up ${formatDate(l.next_follow_up_at)}`
                  : "no follow-up set"}
              </p>
              {l.stage !== "Converted" ? (
                <button
                  className={`${ghostButton} mt-3 h-8 w-full justify-center`}
                  onClick={() =>
                    convertLead.mutate(l, {
                      onSuccess: () => toast.success("Lead converted to patient"),
                      onError: (err) => toast.error(err.message),
                    })
                  }
                >
                  <UserRoundCheck className="size-3.5" /> Convert
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
          </DialogHeader>
          <form
            id="new-lead"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const source = String(fd.get("source"));
              const followUp = String(fd.get("next_follow_up_at"));
              createLead.mutate(
                {
                  full_name: String(fd.get("full_name")),
                  email: String(fd.get("email")) || null,
                  phone: String(fd.get("phone")) || null,
                  source,
                  source_group: String(fd.get("source_group")),
                  service_id: String(fd.get("service_id")) || null,
                  interest: String(fd.get("interest")) || null,
                  owner_id: String(fd.get("owner_id")) || null,
                  temperature: String(fd.get("temperature")),
                  next_follow_up_at: followUp ? new Date(`${followUp}T09:00:00`).toISOString() : null,
                  notes: String(fd.get("notes")) || null,
                  stage: "New",
                },
                {
                  onSuccess: () => {
                    toast.success("Lead added");
                    setOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Full name" className="sm:col-span-2">
              <input name="full_name" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Source group">
              <select name="source_group" className={inputClass} defaultValue="Organic">
                {LEAD_SOURCE_GROUPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source detail">
              <select name="source" className={inputClass}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Treatment interest">
              <select name="service_id" className={inputClass}>
                <option value="">Not sure yet</option>
                {services.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Interest strength">
              <select name="temperature" className={inputClass} defaultValue="Warm">
                {TEMPERATURES.map((t) => (
                  <option key={t} value={t}>
                    {t} — {TEMPERATURE_HINT[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Doctor">
              <select name="owner_id" className={inputClass}>
                <option value="">Unassigned</option>
                {providers.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Next follow-up">
              <input name="next_follow_up_at" type="date" className={inputClass} />
            </Field>
            <Field label="Other interest note" className="sm:col-span-2">
              <input name="interest" className={inputClass} placeholder="Laser hair removal — legs" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea name="notes" className={textareaClass} />
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="new-lead" className={primaryButton} disabled={createLead.isPending}>
              Add lead
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
