import { useState } from "react";
import { toast } from "sonner";
import { Archive, Pencil, Plus, RotateCcw, TriangleAlert, X } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { EmptyState, Field, Panel, inputClass, textareaClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money, type Package } from "@/data/clinic";
import {
  useInsert,
  usePackageItems,
  usePatientPackageItems,
  usePatientPackages,
  usePackages,
  useRemove,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";

type Draft = { service_id: string; sessions: number | ""; gap_days: number | "" };

/** Package catalogue: what the clinic sells upfront. */
export function PackagesTab() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">(0);
  const [validity, setValidity] = useState<number | "">(180);
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [editing, setEditing] = useState<Package | null>(null);
  const [refundable, setRefundable] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([{ service_id: "", sessions: 6, gap_days: 30 }]);

  const packages = usePackages();
  const items = usePackageItems();
  const services = useServices();
  const patientPackages = usePatientPackages();
  const patientItems = usePatientPackageItems();
  const addPackage = useInsert("packages");
  const addItems = useInsert("package_items");
  const updatePackage = useUpdate("packages");
  const removeItem = useRemove("package_items");

  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name ?? "Service";

  const reset = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice(0);
    setValidity(180);
    setRefundable(false);
    setDrafts([{ service_id: "", sessions: 6, gap_days: 30 }]);
  };

  const startEdit = (p: Package) => {
    const existing = (items.data ?? []).filter((i) => i.package_id === p.id);
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setPrice(p.price);
    setValidity(p.validity_days);
    setRefundable(p.refundable);
    setDrafts(
      existing.length > 0
        ? existing.map((i) => ({ service_id: i.service_id, sessions: i.sessions, gap_days: i.gap_days ?? "" }))
        : [{ service_id: "", sessions: 1, gap_days: "" }],
    );
    setOpen(true);
  };

  return (
    <Panel
      title="Packages"
      action={
        <button
          className={primaryButton}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-3.5" /> New package
        </button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 border-b border-border pb-4 sm:grid-cols-4">
        <Metric label="Catalogue" value={String(packages.data?.filter((p) => p.active).length ?? 0)} />
        <Metric label="Packages sold" value={String(patientPackages.data?.length ?? 0)} />
        <Metric label="Active patients" value={String(patientPackages.data?.filter((p) => p.status === "Active").length ?? 0)} />
        <Metric label="Unused liability" value={money((patientItems.data ?? []).reduce((sum, i) => sum + Math.max(0, i.sessions_total - i.sessions_used) * Number(i.unit_value), 0))} />
      </div>
      {packages.data?.length === 0 ? (
        <EmptyState>No packages yet — add one to sell prepaid session bundles.</EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {packages.data?.map((p) => {
            const included = (items.data ?? []).filter((i) => i.package_id === p.id);
            const listValue = included.reduce((sum, i) => sum + i.sessions * Number(services.data?.find((s) => s.id === i.service_id)?.price ?? 0), 0);
            const savingPercent = listValue > 0 ? Math.round(((listValue - Number(p.price)) / listValue) * 100) : 0;
            const sold = (patientPackages.data ?? []).filter((x) => x.package_id === p.id).length;
            const hasArchivedService = included.some((i) => services.data?.find((s) => s.id === i.service_id)?.active === false);
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0 ${p.active ? "" : "opacity-55"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {included
                      .map((i) => `${i.sessions} × ${serviceName(i.service_id)}${i.gap_days ? ` · every ${i.gap_days} days` : ""}`)
                      .join(", ") || "No sessions defined"}{" "}
                    · valid {p.validity_days} days ·{" "}
                    {p.refundable ? "unused refundable" : "non-refundable"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{sold} sold{listValue > 0 ? ` · list value ${money(listValue)} · ${savingPercent >= 0 ? `${savingPercent}% saving` : `${Math.abs(savingPercent)}% above list`}` : ""}</p>
                  {hasArchivedService ? <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><TriangleAlert className="size-3" /> Contains an archived treatment</p> : null}
                </div>
                <span className="text-sm tabular-nums">{money(p.price)}</span>
                <button
                  type="button"
                  className={ghostButton}
                  aria-label={`Edit ${p.name}`}
                  title="Edit package"
                  onClick={() => startEdit(p)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button className={ghostButton} aria-label={`${p.active ? "Archive" : "Restore"} ${p.name}`} onClick={() => updatePackage.mutate({ id: p.id, values: { active: !p.active } }, { onSuccess: () => toast.success(p.active ? "Package archived" : "Package restored"), onError: (e) => toast.error(e.message) })}>
                  {p.active ? <Archive className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          <form
            id="new-package"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const lines = drafts
                .filter((d) => d.service_id && (d.sessions === "" || d.sessions > 0))
                .map((d) => ({ ...d, sessions: d.sessions === "" ? 1 : d.sessions, gap_days: d.gap_days === "" ? null : d.gap_days }));
              if (lines.length === 0) {
                toast.error("Add at least one service with sessions");
                return;
              }
              const values = {
                name,
                description: description || null,
                price: price === "" ? 0 : price,
                validity_days: validity === "" ? 180 : validity,
                refundable,
              };
              if (editing) {
                const replaceItems = async () => {
                  try {
                    const existingItems = (items.data ?? []).filter(
                      (i) => i.package_id === editing.id,
                    );
                    await Promise.all(existingItems.map((item) => removeItem.mutateAsync(item.id)));
                    addItems.mutate(
                      lines.map((l) => ({
                        package_id: editing.id,
                        service_id: l.service_id,
                        sessions: l.sessions,
                          gap_days: l.gap_days,
                      })),
                      {
                        onSuccess: () => {
                          toast.success("Package updated");
                          setOpen(false);
                          reset();
                        },
                        onError: (err) => toast.error(err.message),
                      },
                    );
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                };
                updatePackage.mutate(
                  { id: editing.id, values },
                  {
                    onSuccess: () => void replaceItems(),
                    onError: (err) => toast.error(err.message),
                  },
                );
              } else {
                addPackage.mutate(values, {
                  onSuccess: (rows) => {
                    const created = (rows as { id: string }[])[0];
                    if (!created) return;
                    addItems.mutate(
                      lines.map((l) => ({
                        package_id: created.id,
                        service_id: l.service_id,
                        sessions: l.sessions,
                        gap_days: l.gap_days,
                      })),
                      {
                        onSuccess: () => {
                          toast.success("Package created");
                          setOpen(false);
                          reset();
                        },
                        onError: (err) => toast.error(err.message),
                      },
                    );
                  },
                  onError: (err) => toast.error(err.message),
                });
              }
            }}
          >
            <Field label="Package name">
              <input
                required
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="6 sessions — Laser hair removal"
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                className={textareaClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Included sessions</span>
              {drafts.map((d, idx) => (
                 <div key={idx} className="grid grid-cols-[minmax(0,1fr)_70px_90px_32px] gap-2">
                  <select
                    className={inputClass}
                    aria-label="Service"
                    value={d.service_id}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, service_id: e.target.value } : x)),
                      )
                    }
                  >
                    <option value="">Select service…</option>
                    {services.data?.filter((s) => s.active || s.id === d.service_id).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.active ? "" : " (archived)"}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    aria-label="Sessions"
                    className={inputClass}
                    value={d.sessions}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      setDrafts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, sessions: value } : x)),
                      );
                    }}
                    onBlur={() => {
                      setDrafts((prev) =>
                        prev.map((x, i) =>
                          i === idx && x.sessions === "" ? { ...x, sessions: 1 } : x,
                        ),
                      );
                    }}
                  />
                  <input type="number" min={1} aria-label="Gap days" title="Recommended days between sessions" placeholder="Gap" className={inputClass} value={d.gap_days} onChange={(e) => { const value = e.target.value === "" ? "" : Number(e.target.value); setDrafts((prev) => prev.map((x, i) => i === idx ? { ...x, gap_days: value } : x)); }} />
                  <button type="button" className={ghostButton} aria-label="Remove service" onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== idx))}><X className="size-3.5" /></button>
                </div>
              ))}
              <button
                type="button"
                className={`${ghostButton} w-fit`}
                onClick={() => setDrafts((prev) => [...prev, { service_id: "", sessions: 1, gap_days: "" }])}
              >
                <Plus className="size-3.5" /> Add service
              </button>
            </div>

            {(() => {
              const listValue = drafts.reduce((sum, d) => sum + Number(d.sessions || 0) * Number(services.data?.find((s) => s.id === d.service_id)?.price ?? 0), 0);
              const charged = Number(price || 0);
              const saving = listValue - charged;
              const percent = listValue > 0 ? Math.round((saving / listValue) * 100) : 0;
              return listValue > 0 ? <div className={`grid grid-cols-3 gap-3 border-y border-border py-3 text-xs ${percent > 40 || percent < 0 ? "text-destructive" : ""}`}><Metric label="List value" value={money(listValue)} /><Metric label="Package price" value={money(charged)} /><Metric label={saving >= 0 ? "Patient saves" : "Above list"} value={`${money(Math.abs(saving))} (${Math.abs(percent)}%)`} /></div> : null;
            })()}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Package price (₹)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={price}
                  onChange={(e) => {
                    const value = e.target.value === "" ? "" : Math.max(0, Number(e.target.value));
                    setPrice(value);
                  }}
                  onBlur={() => {
                    if (price === "") setPrice(0);
                  }}
                />
              </Field>
              <Field label="Validity (days)">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={validity}
                  onChange={(e) => {
                    const value = e.target.value === "" ? "" : Number(e.target.value);
                    setValidity(value);
                  }}
                  onBlur={() => {
                    if (validity === "") setValidity(180);
                  }}
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <Switch checked={refundable} onCheckedChange={setRefundable} />
              Unused sessions are refundable
            </label>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="new-package" className={primaryButton}>
              {editing ? "Save changes" : "Create package"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(v) => v || setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDelete?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDelete?.message}</p>
          <DialogFooter>
            <button className={ghostButton} type="button" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              className={primaryButton}
              type="button"
              onClick={() => {
                confirmDelete?.onConfirm();
                setConfirmDelete(null);
              }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</p></div>;
}
