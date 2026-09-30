import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { EmptyState, Field, Panel, inputClass } from "@/components/clinic/bits";
import { money } from "@/data/clinic";
import type { ServiceAddon } from "@/data/clinic";
import {
  useAddonDiscountRules,
  useServiceAddons,
  useInsert,
  useRemove,
  useServices,
} from "@/lib/clinic-data";

/** Upsell configuration: which treatments can be added on, and bundle discounts. */
export function AddonsTab() {
  const services = useServices();
  const addons = useServiceAddons();
  const rules = useAddonDiscountRules();
  const addAddon = useInsert("service_addons");
  const removeAddon = useRemove("service_addons");
  const addRule = useInsert("addon_discount_rules");
  const removeRule = useRemove("addon_discount_rules");

  const [main, setMain] = useState("");
  const [addon, setAddon] = useState("");

  const name = (id: string | null) => services.data?.find((s) => s.id === id)?.name ?? "Any treatment";
  const grouped = new Map<string, ServiceAddon[]>();
  for (const a of addons.data ?? []) {
    grouped.set(a.main_service_id, [...(grouped.get(a.main_service_id) ?? []), a]);
  }

  return (
    <div className="grid gap-4">
      <Panel title="Add-on treatments (upsell)">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Main treatment">
            <select value={main} onChange={(e) => setMain(e.target.value)} className={`${inputClass} w-52`}>
              <option value="">Select…</option>
              {services.data?.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Add-on treatment">
            <select value={addon} onChange={(e) => setAddon(e.target.value)} className={`${inputClass} w-52`}>
              <option value="">Select…</option>
              {services.data
                ?.filter((s) => s.active && s.id !== main)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <button
            className={primaryButton}
            disabled={!main || !addon}
            onClick={() =>
              addAddon.mutate(
                { main_service_id: main, addon_service_id: addon },
                {
                  onSuccess: () => {
                    toast.success("Add-on linked");
                    setAddon("");
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            <Plus className="size-3.5" /> Link add-on
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {grouped.size === 0 ? <EmptyState>No add-ons configured yet.</EmptyState> : null}
          {[...grouped.entries()].map(([mainId, list]) => (
            <div key={mainId} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{name(mainId)}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {list.map((a: ServiceAddon) => {
                  const svc = services.data?.find((s) => s.id === a.addon_service_id);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs"
                    >
                      {svc?.name ?? "Treatment"}
                      {svc ? (
                        <span className="text-muted-foreground">{money(svc.price)}</span>
                      ) : null}
                      <button
                        onClick={() => removeAddon.mutate(a.id)}
                        aria-label="Remove add-on"
                        className="text-muted-foreground hover:text-status-overdue"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Add-on bundle discounts">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addRule.mutate(
              {
                name: String(fd.get("name")),
                main_service_id: String(fd.get("main_service_id")) || null,
                min_addons: Number(fd.get("min_addons")) || 1,
                discount_type: String(fd.get("discount_type")),
                discount_value: Number(fd.get("discount_value")) || 0,
                active: true,
              },
              {
                onSuccess: () => toast.success("Discount rule added"),
                onError: (err) => toast.error(err.message),
              },
            );
            e.currentTarget.reset();
          }}
        >
          <Field label="Rule name">
            <input name="name" required className={`${inputClass} w-48`} placeholder="Laser + facial combo" />
          </Field>
          <Field label="Applies to">
            <select name="main_service_id" className={`${inputClass} w-44`}>
              <option value="">Any treatment</option>
              {services.data?.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Min add-ons">
            <input name="min_addons" type="number" min={1} defaultValue={1} className={`${inputClass} w-24`} />
          </Field>
          <Field label="Type">
            <select name="discount_type" className={`${inputClass} w-28`} defaultValue="percent">
              <option value="percent">Percent</option>
              <option value="amount">Amount</option>
            </select>
          </Field>
          <Field label="Value">
            <input name="discount_value" type="number" min={0} step={1} defaultValue={10} className={`${inputClass} w-24`} />
          </Field>
          <button className={primaryButton} type="submit">
            <Plus className="size-3.5" /> Add rule
          </button>
        </form>

        {rules.data?.length === 0 ? (
          <div className="mt-4">
            <EmptyState>No discount rules yet.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rules.data?.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {name(r.main_service_id)} · {r.min_addons}+ add-ons ·{" "}
                    {r.discount_type === "percent" ? `${r.discount_value}% off` : `${money(r.discount_value)} off`}
                  </p>
                </div>
                <button className={ghostButton} onClick={() => removeRule.mutate(r.id)}>
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
