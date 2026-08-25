import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendOutboxMessage } from "@/lib/messaging.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, Panel, inputClass, textareaClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNELS, TRIGGER_TYPES, formatDateTime, patientName } from "@/data/clinic";
import {
  useAutomationRules,
  useInsert,
  useMessageTemplates,
  useOutbox,
  usePatients,
  useUpdate,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Automated appointment reminders, post-treatment check-ins, recalls and no-show win-backs over Email, SMS and WhatsApp.",
      },
      { property: "og:title", content: "Follow-ups — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Reminder rules, message templates and the outbox of scheduled patient messages.",
      },
    ],
  }),
  component: Automations,
});

function offsetLabel(hours: number) {
  if (hours === 0) return "immediately";
  const abs = Math.abs(hours);
  const unit = abs % 24 === 0 ? `${abs / 24}d` : `${abs}h`;
  return hours < 0 ? `${unit} before` : `${unit} after`;
}

function Automations() {
  const [ruleOpen, setRuleOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const rules = useAutomationRules();
  const templates = useMessageTemplates();
  const outbox = useOutbox();
  const patients = usePatients();
  const updateRule = useUpdate("automation_rules");
  const updateMessage = useUpdate("messages_outbox");
  const sendNow = useServerFn(sendOutboxMessage);
  const createRule = useInsert("automation_rules");
  const createTemplate = useInsert("message_templates");

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/run-reminders", { method: "POST" });
      const json = (await res.json()) as { queued?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`${json.queued ?? 0} message(s) queued`);
      await outbox.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run automations");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell
      title="Follow-ups"
      subtitle="Reminder rules, templates and the message outbox"
      actions={
        <button className={ghostButton} onClick={runNow} disabled={running}>
          <Play className="size-3.5" /> Run automations now
        </button>
      }
    >
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <Panel
            title="Automation rules"
            action={
              <button className={primaryButton} onClick={() => setRuleOpen(true)}>
                <Plus className="size-3.5" /> New rule
              </button>
            }
          >
            {rules.data?.length === 0 ? (
              <EmptyState>No rules configured.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {rules.data?.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {TRIGGER_TYPES.find((t) => t.value === r.trigger_type)?.label ??
                          r.trigger_type}{" "}
                        · {offsetLabel(r.offset_hours)} ·{" "}
                        {templates.data?.find((t) => t.id === r.template_id)?.name ?? "No template"}
                      </p>
                    </div>
                    <Chip tone={r.enabled ? "completed" : "idle"}>{r.channel}</Chip>
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) =>
                        updateRule.mutate(
                          { id: r.id, values: { enabled: v } },
                          { onSuccess: () => toast.success(v ? "Rule enabled" : "Rule paused") },
                        )
                      }
                      aria-label="Toggle rule"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Panel
            title="Message templates"
            action={
              <button className={primaryButton} onClick={() => setTemplateOpen(true)}>
                <Plus className="size-3.5" /> New template
              </button>
            }
          >
            {templates.data?.length === 0 ? (
              <EmptyState>No templates yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {templates.data?.map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t.name}</p>
                      <Chip>{t.channel}</Chip>
                    </div>
                    {t.subject ? (
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{t.subject}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">{t.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Merge fields: {"{{first_name}}"}, {"{{service}}"}, {"{{provider}}"}, {"{{time}}"},{" "}
              {"{{interest}}"}
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="outbox" className="mt-4">
          <Panel title="Outbox">
            {outbox.data?.length === 0 ? (
              <EmptyState>Nothing scheduled.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {outbox.data?.map((m) => {
                  const p = patients.data?.find((x) => x.id === m.patient_id);
                  return (
                    <li key={m.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {p ? patientName(p) : (m.recipient ?? "Recipient")}
                          </span>
                          <Chip
                            tone={
                              m.status === "Sent"
                                ? "completed"
                                : m.status === "Failed"
                                  ? "overdue"
                                  : "progress"
                            }
                          >
                            {m.channel} · {m.status}
                          </Chip>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(m.scheduled_for)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{m.body}</p>
                      </div>
                      {m.status === "Queued" ? (
                        <div className="flex gap-1">
                          <button
                            className={ghostButton}
                            onClick={() =>
                              toast.promise(
                                sendNow({ data: { id: m.id } }).then(() => outbox.refetch()),
                                {
                                  loading: "Sending…",
                                  success: "Message sent",
                                  error: (e: Error) => e.message,
                                },
                              )
                            }
                          >
                            Send now
                          </button>
                          <button
                            className={ghostButton}
                            onClick={() =>
                              updateMessage.mutate(
                                {
                                  id: m.id,
                                  values: { status: "Sent", sent_at: new Date().toISOString() },
                                },
                                { onSuccess: () => toast.success("Marked as sent") },
                              )
                            }
                          >
                            Mark sent
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              “Send now” delivers through the connected WhatsApp, SMS or email provider; messages
              stay queued until those credentials are connected.
            </p>

          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New automation rule</DialogTitle>
          </DialogHeader>
          <form
            id="new-rule"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createRule.mutate(
                {
                  name: String(fd.get("name")),
                  trigger_type: String(fd.get("trigger_type")),
                  offset_hours: Number(fd.get("offset_hours")) || 0,
                  channel: String(fd.get("channel")),
                  template_id: String(fd.get("template_id")) || null,
                  enabled: true,
                },
                {
                  onSuccess: () => {
                    toast.success("Rule created");
                    setRuleOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Name" className="sm:col-span-2">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Trigger">
              <select name="trigger_type" className={inputClass}>
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offset (hours, negative = before)">
              <input name="offset_hours" type="number" defaultValue={-24} className={inputClass} />
            </Field>
            <Field label="Channel">
              <select name="channel" className={inputClass}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Template">
              <select name="template_id" className={inputClass}>
                {templates.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setRuleOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="new-rule" className={primaryButton} disabled={createRule.isPending}>
              Create rule
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New message template</DialogTitle>
          </DialogHeader>
          <form
            id="new-template"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createTemplate.mutate(
                {
                  name: String(fd.get("name")),
                  channel: String(fd.get("channel")),
                  subject: String(fd.get("subject")) || null,
                  body: String(fd.get("body")),
                },
                {
                  onSuccess: () => {
                    toast.success("Template created");
                    setTemplateOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Channel">
              <select name="channel" className={inputClass}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject (email only)">
              <input name="subject" className={inputClass} />
            </Field>
            <Field label="Body">
              <textarea
                name="body"
                required
                className={textareaClass}
                placeholder="Hi {{first_name}}, …"
              />
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setTemplateOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-template"
              className={primaryButton}
              disabled={createTemplate.isPending}
            >
              Create template
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
