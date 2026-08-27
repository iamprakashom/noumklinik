import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { AppShell, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Panel, inputClass } from "@/components/clinic/bits";
import { listConversations, listThread, sendWhatsAppReply } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "WhatsApp inbox — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Two-way WhatsApp conversations with patients and leads, with replies logged against the right record.",
      },
      { property: "og:title", content: "WhatsApp inbox — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Reply to patient WhatsApp messages from one clinic inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InboxPage() {
  const conversationsFn = useServerFn(listConversations);
  const threadFn = useServerFn(listThread);
  const replyFn = useServerFn(sendWhatsAppReply);
  const qc = useQueryClient();

  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["wa-conversations"],
    queryFn: () => conversationsFn(),
    refetchInterval: 20000,
  });

  const list = conversations.data ?? [];
  const activeId = active ?? list[0]?.contact_wa_id ?? null;
  const activeConversation = list.find((c) => c.contact_wa_id === activeId) ?? null;

  const thread = useQuery({
    queryKey: ["wa-thread", activeId],
    queryFn: () => threadFn({ data: { waId: activeId! } }),
    enabled: !!activeId,
    refetchInterval: 20000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.data]);

  const send = useMutation({
    mutationFn: (body: string) =>
      replyFn({
        data: {
          waId: activeId!,
          body,
          patientId: activeConversation?.patient_id ?? null,
          leadId: activeConversation?.lead_id ?? null,
        },
      }),
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["wa-thread", activeId] });
      void qc.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Inbox"
      subtitle="WhatsApp conversations with patients and leads"
      actions={
        <span className="text-xs text-muted-foreground">
          {list.reduce((n, c) => n + c.unread, 0)} unread
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Panel title="Conversations">
          {conversations.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <EmptyState>
              No WhatsApp messages yet. Connect WhatsApp in Settings and patient replies will
              appear here.
            </EmptyState>
          ) : (
            <ul className="-mx-2 divide-y divide-border">
              {list.map((c) => (
                <li key={c.contact_wa_id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.contact_wa_id)}
                    className={`w-full rounded-md px-2 py-2 text-left transition-colors ${
                      c.contact_wa_id === activeId ? "bg-accent" : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.contact_name ?? `+${c.contact_wa_id}`}
                      </span>
                      {c.unread > 0 ? <Chip tone="progress">{c.unread}</Chip> : null}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{c.last_body}</p>
                    <p className="text-[10px] text-muted-foreground">{timeLabel(c.last_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={
            activeConversation
              ? (activeConversation.contact_name ?? `+${activeConversation.contact_wa_id}`)
              : "Thread"
          }
        >
          {!activeId ? (
            <EmptyState>Pick a conversation to read and reply.</EmptyState>
          ) : (
            <div className="flex h-[60vh] flex-col">
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {(thread.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      m.direction === "incoming"
                        ? "bg-secondary"
                        : "ml-auto bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {timeLabel(m.sent_at)} · {m.status}
                    </p>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) send.mutate(draft.trim());
                }}
              >
                <input
                  className={inputClass}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a reply…"
                  aria-label="Reply message"
                />
                <button type="submit" className={primaryButton} disabled={send.isPending}>
                  <Send className="size-3.5" />
                  {send.isPending ? "Sending…" : "Send"}
                </button>
              </form>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Free-form replies work for 24 hours after the patient's last message; outside that
                window use an approved template.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
