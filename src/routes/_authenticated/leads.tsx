import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserRoundCheck } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEAD_SOURCES, LEAD_STAGES, formatDate, leadTone } from "@/data/clinic";
import { useConvertLead, useInsert, useLeads, useProviders, useUpdate } from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Track aesthetic clinic enquiries from Meta lead ads, website and referrals through a consultation pipeline and convert them into patients.",
      },
      { property: "og:title", content: "Leads — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Lead pipeline from first enquiry to booked consultation and conversion.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const [open, setOpen] = useState(false);
  const leads = useLeads();
  const providers = useProviders();
  const createLead = useInsert("leads");
  const updateLead = useUpdate("leads");
  const convertLead = useConvertLead();

  const all = leads.data ?? [];

  return (
    <AppShell
      title="Leads"
      subtitle="Enquiries captured from Meta lead ads, website forms and referrals"
      actions={
        <button className={primaryButton} onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add lead
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-5">
        {LEAD_STAGES.map((stage) => {
          const items = all.filter((l) => l.stage === stage);
          return (
            <section key={stage} className="rounded-xl border border-border bg-card">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold">{stage}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
              </header>
              <div className="space-y-2 p-3">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted-foreground">Empty</p>
                ) : (
                  items.map((l) => (
                    <article
                      key={l.id}
                      className="card-hover rounded-lg border border-border bg-background p-3"
                    >
                      <p className="text-sm font-medium">{l.full_name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {l.interest ?? "General enquiry"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Chip tone={leadTone(l.stage)}>{l.source}</Chip>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(l.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {providers.data?.find((p) => p.id === l.owner_id)?.name ?? "Unassigned"}
                      </p>
                      <select
                        value={l.stage}
                        onChange={(e) =>
                          updateLead.mutate(
                            { id: l.id, values: { stage: e.target.value } },
                            { onSuccess: () => toast.success("Lead updated") },
                          )
                        }
                        className={`${inputClass} mt-2 h-8 text-xs`}
                        aria-label="Lead stage"
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {l.stage !== "Converted" ? (
                        <button
                          className={`${ghostButton} mt-2 h-8 w-full justify-center`}
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
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {all.length === 0 ? (
        <div className="mt-6">
          <EmptyState>No leads yet — Meta lead ads will appear here automatically.</EmptyState>
        </div>
      ) : null}

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
              createLead.mutate(
                {
                  full_name: String(fd.get("full_name")),
                  email: String(fd.get("email")) || null,
                  phone: String(fd.get("phone")) || null,
                  source: String(fd.get("source")),
                  interest: String(fd.get("interest")) || null,
                  owner_id: String(fd.get("owner_id")) || null,
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
            <Field label="Source">
              <select name="source" className={inputClass}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Interest">
              <input name="interest" className={inputClass} placeholder="Lip filler" />
            </Field>
            <Field label="Owner" className="sm:col-span-2">
              <select name="owner_id" className={inputClass}>
                <option value="">Unassigned</option>
                {providers.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
