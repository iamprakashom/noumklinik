import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { primaryButton, ghostButton } from "@/components/clinic/AppShell";
import { Chip, Field, Panel, inputClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import {
  getWhatsAppSettings,
  listWhatsAppTemplates,
  saveWhatsAppSettings,
  testWhatsAppConnection,
} from "@/lib/whatsapp.functions";

/** WhatsApp Business Cloud API connection, webhook details and approved templates. */
export function WhatsAppTab() {
  const load = useServerFn(getWhatsAppSettings);
  const save = useServerFn(saveWhatsAppSettings);
  const test = useServerFn(testWhatsAppConnection);
  const templatesFn = useServerFn(listWhatsAppTemplates);
  const qc = useQueryClient();

  const settings = useQuery({ queryKey: ["whatsapp-settings"], queryFn: () => load() });
  const templates = useQuery({ queryKey: ["whatsapp-templates"], queryFn: () => templatesFn() });

  const saveMutation = useMutation({
    mutationFn: (values: {
      phone_number_id: string;
      waba_id: string;
      access_token: string;
      app_secret: string;
      enabled: boolean;
    }) => save({ data: values }),
    onSuccess: () => {
      toast.success("WhatsApp settings saved");
      void qc.invalidateQueries({ queryKey: ["whatsapp-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (r) => {
      toast.success(`Connected as ${r.display_name ?? "your business"} (${r.phone_number ?? "—"})`);
      void qc.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      void qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settings.isLoading) return <Panel title="WhatsApp Business">Loading…</Panel>;
  if (settings.error)
    return (
      <Panel title="WhatsApp Business">
        <p className="text-sm text-muted-foreground">{(settings.error as Error).message}</p>
      </Panel>
    );

  const s = settings.data!;
  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/hooks/whatsapp` : "";

  return (
    <div className="grid gap-4">
      <Panel title="WhatsApp Business connection">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Chip
            tone={
              s.status === "Connected" ? "completed" : s.status === "Error" ? "overdue" : "idle"
            }
          >
            {s.status}
          </Chip>
          {s.phone_number ? <span>{s.phone_number}</span> : null}
          {s.display_name ? <span>· {s.display_name}</span> : null}
          {s.error_message ? (
            <span className="text-status-overdue">· {s.error_message}</span>
          ) : null}
        </div>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveMutation.mutate({
              phone_number_id: String(fd.get("phone_number_id") ?? ""),
              waba_id: String(fd.get("waba_id") ?? ""),
              access_token: String(fd.get("access_token") ?? ""),
              app_secret: String(fd.get("app_secret") ?? ""),
              enabled: fd.get("enabled") === "on",
            });
          }}
        >
          <Field label="Phone number ID">
            <input
              name="phone_number_id"
              defaultValue={s.phone_number_id ?? ""}
              className={inputClass}
              placeholder="From Meta → WhatsApp → API setup"
            />
          </Field>
          <Field label="WhatsApp Business Account ID">
            <input
              name="waba_id"
              defaultValue={s.waba_id ?? ""}
              className={inputClass}
              placeholder="WABA ID"
            />
          </Field>
          <Field label={`Permanent access token ${s.access_token_masked || ""}`}>
            <input
              name="access_token"
              className={inputClass}
              type="password"
              placeholder={s.access_token_masked ? "Leave blank to keep" : "System user token"}
            />
          </Field>
          <Field label={`App secret ${s.app_secret_masked || ""}`}>
            <input
              name="app_secret"
              className={inputClass}
              type="password"
              placeholder={s.app_secret_masked ? "Leave blank to keep" : "Used to verify webhooks"}
            />
          </Field>

          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <Switch name="enabled" defaultChecked={s.enabled} />
            Send clinic messages over WhatsApp
          </label>

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={primaryButton} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save connection"}
            </button>
            <button
              type="button"
              className={ghostButton}
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? "Checking…" : "Test connection"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Webhook">
        <p className="mb-3 text-xs text-muted-foreground">
          Paste these into Meta → WhatsApp → Configuration → Webhook, then subscribe to the{" "}
          <span className="font-medium text-foreground">messages</span> field so patient replies
          land in your inbox.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Callback URL">
            <input readOnly value={webhookUrl} className={inputClass} />
          </Field>
          <Field label="Verify token">
            <input readOnly value={s.verify_token} className={inputClass} />
          </Field>
        </div>
      </Panel>

      <Panel title="Approved templates">
        {templates.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        ) : (templates.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates yet. Create and get them approved in Meta Business Manager — they are
            required to message a patient outside the 24-hour reply window.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(templates.data ?? []).map((t) => (
              <li key={`${t.name}-${t.language}`} className="flex items-center gap-3 py-2">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.language}</span>
                <span className="text-xs text-muted-foreground">{t.category}</span>
                <Chip
                  className="ml-auto"
                  tone={
                    t.status === "APPROVED"
                      ? "completed"
                      : t.status === "REJECTED"
                        ? "overdue"
                        : "progress"
                  }
                >
                  {t.status}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
