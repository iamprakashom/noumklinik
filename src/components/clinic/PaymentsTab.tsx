import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { primaryButton } from "@/components/clinic/AppShell";
import { Field, Panel, inputClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import { getGatewayConfig, saveGatewayConfig } from "@/lib/payments.functions";

type GatewayInput = {
  provider: "razorpay" | "cashfree";
  mode: "test" | "live";
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  enabled: boolean;
  allow_upi: boolean;
  allow_emi: boolean;
};

/** Razorpay / Cashfree merchant account configuration (admins only). */
export function PaymentsTab() {
  const load = useServerFn(getGatewayConfig);
  const save = useServerFn(saveGatewayConfig);
  const qc = useQueryClient();

  const config = useQuery({ queryKey: ["gateway"], queryFn: () => load() });
  const mutation = useMutation({
    mutationFn: (values: GatewayInput) => save({ data: values }),
    onSuccess: () => {
      toast.success("Payment settings saved");
      void qc.invalidateQueries({ queryKey: ["gateway"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (config.isLoading) {
    return <Panel title="Payment gateway">Loading…</Panel>;
  }
  if (config.error) {
    return (
      <Panel title="Payment gateway">
        <p className="text-sm text-muted-foreground">{(config.error as Error).message}</p>
      </Panel>
    );
  }

  const c = config.data;

  return (
    <div className="grid gap-4">
      <Panel title="Payment gateway">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            mutation.mutate({
              provider: String(fd.get("provider")) as "razorpay" | "cashfree",
              mode: String(fd.get("mode")) as "test" | "live",
              key_id: String(fd.get("key_id")),
              key_secret: String(fd.get("key_secret")),
              webhook_secret: String(fd.get("webhook_secret")),
              enabled: fd.get("enabled") === "on",
              allow_upi: fd.get("allow_upi") === "on",
              allow_emi: fd.get("allow_emi") === "on",
            });
          }}
        >
          <Field label="Provider">
            <select name="provider" className={inputClass} defaultValue={c?.provider ?? "razorpay"}>
              <option value="razorpay">Razorpay</option>
              <option value="cashfree">Cashfree</option>
            </select>
          </Field>
          <Field label="Mode">
            <select name="mode" className={inputClass} defaultValue={c?.mode ?? "test"}>
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </Field>
          <Field label="Key ID / App ID">
            <input name="key_id" className={inputClass} defaultValue={c?.key_id ?? ""} />
          </Field>
          <Field label={`Key secret ${c?.key_secret_masked ? `(saved: ${c.key_secret_masked})` : ""}`}>
            <input name="key_secret" type="password" className={inputClass} placeholder="Leave blank to keep" />
          </Field>
          <Field
            label={`Webhook secret ${c?.webhook_secret_masked ? `(saved: ${c.webhook_secret_masked})` : ""}`}
            className="sm:col-span-2"
          >
            <input name="webhook_secret" type="password" className={inputClass} placeholder="Leave blank to keep" />
          </Field>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            Collection enabled
            <Switch name="enabled" defaultChecked={c?.enabled ?? false} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            Allow UPI
            <Switch name="allow_upi" defaultChecked={c?.allow_upi ?? true} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            Allow EMI
            <Switch name="allow_emi" defaultChecked={c?.allow_emi ?? true} />
          </label>

          <div className="sm:col-span-2">
            <button type="submit" className={primaryButton} disabled={mutation.isPending}>
              Save payment settings
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Webhook endpoints">
        <p className="text-xs text-muted-foreground">
          Add these callback URLs in your merchant dashboard so paid links settle invoices
          automatically.
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          <li className="rounded bg-secondary px-3 py-2 font-mono">/api/public/hooks/razorpay</li>
          <li className="rounded bg-secondary px-3 py-2 font-mono">/api/public/hooks/cashfree</li>
        </ul>
      </Panel>
    </div>
  );
}
