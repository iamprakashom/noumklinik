import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Facebook, RefreshCw, Sparkles, Unplug } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, Field, Panel, inputClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import {
  disconnectMeta,
  getLeadCaptureStatus,
  listMetaPages,
  refreshMetaForms,
  saveFormSettings,
  saveManualConnection,
  selectMetaPage,
  sendTestLead,
  startMetaConnect,
} from "@/lib/meta-leads.functions";

const CRM_FIELDS = [
  { value: "full_name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "interest", label: "Treatment interest" },
  { value: "city", label: "City (into notes)" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "Don't import" },
];

/** One-click Facebook / Instagram lead ads capture (admins only). */
export function LeadCaptureTab() {
  const qc = useQueryClient();
  const loadStatus = useServerFn(getLeadCaptureStatus);
  const startConnect = useServerFn(startMetaConnect);
  const loadPages = useServerFn(listMetaPages);
  const pickPage = useServerFn(selectMetaPage);
  const saveForm = useServerFn(saveFormSettings);
  const refreshForms = useServerFn(refreshMetaForms);
  const testLead = useServerFn(sendTestLead);
  const disconnect = useServerFn(disconnectMeta);
  const saveManual = useServerFn(saveManualConnection);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const status = useQuery({ queryKey: ["lead-capture"], queryFn: () => loadStatus() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["lead-capture"] });

  const conn = status.data?.connection ?? null;
  const needsPage = conn !== null && (conn.status === "choose_page" || !conn.page_id);

  const pages = useQuery({
    queryKey: ["meta-pages"],
    queryFn: () => loadPages(),
    enabled: needsPage,
  });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { source?: string; ok?: boolean } | null;
      if (data?.source !== "meta-connect") return;
      if (data.ok) {
        toast.success("Facebook connected — choose your page");
        refresh();
        void qc.invalidateQueries({ queryKey: ["meta-pages"] });
      } else {
        toast.error("Facebook connection was cancelled");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useMutation({
    mutationFn: () => startConnect({ data: { origin: window.location.origin } }),
    onSuccess: (res) => {
      window.open(res.url, "meta-connect", "width=600,height=720");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const choosePage = useMutation({
    mutationFn: (pageId: string) => pickPage({ data: { pageId } }),
    onSuccess: (res) => {
      toast.success(
        `${res.page} connected · ${res.forms} form(s)${res.imported ? ` · ${res.imported} past leads imported` : ""}`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateForm = useMutation({
    mutationFn: (v: { id: string; enabled: boolean; field_map: Record<string, string> }) =>
      saveForm({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: (formId: string) => testLead({ data: { formId } }),
    onSuccess: () => toast.success("Test lead added to Leads"),
    onError: (e: Error) => toast.error(e.message),
  });

  const doRefresh = useMutation({
    mutationFn: () => refreshForms({}),
    onSuccess: (r) => {
      toast.success(`${r.count} form(s) found`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doDisconnect = useMutation({
    mutationFn: () => disconnect({}),
    onSuccess: () => {
      toast.success("Disconnected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manual = useMutation({
    mutationFn: (v: { pageId: string; pageName: string; pageToken: string }) =>
      saveManual({ data: v }),
    onSuccess: () => {
      toast.success("Page connected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (status.isLoading) return <Panel title="Lead capture">Loading…</Panel>;
  if (status.error)
    return (
      <Panel title="Lead capture">
        <p className="text-sm text-muted-foreground">{(status.error as Error).message}</p>
      </Panel>
    );

  return (
    <div className="grid gap-4">
      <Panel
        title="Facebook & Instagram lead ads"
        action={
          conn && !needsPage ? (
            <div className="flex gap-2">
              <button
                className={ghostButton}
                onClick={() => doRefresh.mutate()}
                disabled={doRefresh.isPending}
              >
                <RefreshCw className="size-3.5" /> Refresh forms
              </button>
              <button className={ghostButton} onClick={() => doDisconnect.mutate()}>
                <Unplug className="size-3.5" /> Disconnect
              </button>
            </div>
          ) : null
        }
      >
        {!conn ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Connect the clinic's Facebook page once. Every lead form submission from Facebook,
              Instagram or WhatsApp ads then lands in Leads automatically — no links or codes to
              copy.
            </p>
            <div>
              <button
                className={primaryButton}
                onClick={() => connect.mutate()}
                disabled={connect.isPending || status.data?.configured === false}
              >
                <Facebook className="size-3.5" /> Connect Facebook
              </button>
            </div>
            {status.data?.configured === false ? (
              <p className="text-xs text-amber-600">
                Waiting on the Facebook app credentials for this CRM. Until they are added, use the
                advanced option below.
              </p>
            ) : null}
          </div>
        ) : needsPage ? (
          <div className="grid gap-3">
            <p className="text-sm">Which page runs your ads?</p>
            {pages.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading pages…</p>
            ) : (pages.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pages found on that Facebook account.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pages.data?.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    {p.picture ? (
                      <img src={p.picture} alt="" className="size-8 rounded-full" />
                    ) : (
                      <div className="size-8 rounded-full bg-muted" />
                    )}
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    <button
                      className={primaryButton}
                      onClick={() => choosePage.mutate(p.id)}
                      disabled={choosePage.isPending}
                    >
                      Use this page
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {conn.page_picture_url ? (
              <img src={conn.page_picture_url} alt="" className="size-9 rounded-full" />
            ) : (
              <div className="size-9 rounded-full bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{conn.page_name}</p>
              <p className="text-xs text-muted-foreground">
                {conn.last_lead_at
                  ? `Last lead ${new Date(conn.last_lead_at).toLocaleString()}`
                  : "No leads received yet"}{" "}
                · {status.data?.recentLeads ?? 0} in the last 7 days
              </p>
            </div>
            {conn.error_message ? (
              <Chip tone="overdue">{conn.error_message}</Chip>
            ) : (
              <Chip tone="completed">Live</Chip>
            )}
          </div>
        )}
      </Panel>

      {conn && !needsPage ? (
        <Panel title="Lead forms">
          {(status.data?.forms ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lead forms on this page yet. Create one in Meta Ads Manager, then hit “Refresh
              forms”.
            </p>
          ) : (
            <div className="grid gap-4">
              {status.data?.forms.map((f) => (
                <FormCard
                  key={f.id}
                  form={f}
                  onSave={(enabled, map) =>
                    updateForm.mutate({ id: f.id, enabled, field_map: map })
                  }
                  onTest={() => test.mutate(f.id)}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      <Panel title="Advanced">
        <button className={ghostButton} onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? "Hide" : "My ads are run by an agency"}
        </button>
        {showAdvanced ? (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              manual.mutate({
                pageId: String(fd.get("pageId")),
                pageName: String(fd.get("pageName")),
                pageToken: String(fd.get("pageToken")),
              });
            }}
          >
            <Field label="Page ID">
              <input name="pageId" required className={inputClass} />
            </Field>
            <Field label="Page name">
              <input name="pageName" required className={inputClass} />
            </Field>
            <Field label="Page access token">
              <input name="pageToken" type="password" required className={inputClass} />
            </Field>
            <div className="sm:col-span-3">
              <button type="submit" className={primaryButton} disabled={manual.isPending}>
                Save connection
              </button>
            </div>
          </form>
        ) : null}
      </Panel>
    </div>
  );
}

type FormRow = {
  id: string;
  form_name: string;
  enabled: boolean;
  field_map: Record<string, string>;
  questions: { key: string; label: string }[];
};

function FormCard({
  form,
  onSave,
  onTest,
}: {
  form: FormRow;
  onSave: (enabled: boolean, map: Record<string, string>) => void;
  onTest: () => void;
}) {
  const [enabled, setEnabled] = useState(form.enabled);
  const [map, setMap] = useState<Record<string, string>>(form.field_map ?? {});

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{form.form_name}</p>
          <p className="text-xs text-muted-foreground">
            {form.questions.length} question(s) · fields matched automatically
          </p>
        </div>
        <button className={ghostButton} onClick={onTest}>
          <Sparkles className="size-3.5" /> Test
        </button>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Capture leads" />
      </div>

      {enabled && form.questions.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {form.questions.map((q) => (
            <label key={q.key} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.label}</span>
              <select
                className={inputClass}
                value={map[q.key] ?? "notes"}
                onChange={(e) => setMap({ ...map, [q.key]: e.target.value })}
              >
                {CRM_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <button className={primaryButton} onClick={() => onSave(enabled, map)}>
          Save
        </button>
      </div>
    </div>
  );
}
