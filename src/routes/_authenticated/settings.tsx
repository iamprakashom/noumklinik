import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { ClinicProfileTab } from "@/components/clinic/ClinicProfileTab";
import { PackagesTab } from "@/components/clinic/PackagesTab";
import { AddonsTab } from "@/components/clinic/AddonsTab";
import { PaymentsTab } from "@/components/clinic/PaymentsTab";
import { WhatsAppTab } from "@/components/clinic/WhatsAppTab";
import { LeadCaptureTab } from "@/components/clinic/LeadCaptureTab";
import { TeamTab } from "@/components/clinic/TeamTab";
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
import { money } from "@/data/clinic";
import type { Service } from "@/data/clinic";
import {
  useConsentTemplates,
  useInsert,
  useProviders,
  useRooms,
  useServices,
  useUpdate,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Clinic setup — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Manage the treatment menu, providers, treatment rooms and consent forms that power scheduling and charting.",
      },
      { property: "og:title", content: "Clinic setup — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Services, providers, rooms and consent form configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

type DialogKind = "service" | "provider" | "room" | "consent" | null;

function SettingsPage() {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const services = useServices();
  const providers = useProviders();
  const rooms = useRooms();
  const consents = useConsentTemplates();

  const addService = useInsert("services");
  const addProvider = useInsert("providers");
  const addRoom = useInsert("rooms");
  const addConsent = useInsert("consent_templates");

  const updateService = useUpdate("services");
  const updateProvider = useUpdate("providers");
  const updateRoom = useUpdate("rooms");
  const updateConsent = useUpdate("consent_templates");

  const close = () => {
    setDialog(null);
    setEditingService(null);
  };
  const saving =
    addService.isPending ||
    addProvider.isPending ||
    addRoom.isPending ||
    addConsent.isPending ||
    updateService.isPending;
  const ok = (msg: string) => {
    toast.success(msg);
    close();
  };
  const fail = (e: Error) => toast.error(e.message);


  return (
    <AppShell title="Clinic setup" subtitle="Treatment menu, team, rooms and consent forms">
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="clinic">Clinic</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="consents">Consent forms</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="lead-capture">Lead capture</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-4">
          <ClinicProfileTab />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <PackagesTab />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <AddonsTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab />
        </TabsContent>
        <TabsContent value="lead-capture" className="mt-4">
          <LeadCaptureTab />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamTab />
        </TabsContent>



        <TabsContent value="services" className="mt-4">
          <Panel
            title="Treatment menu"
            action={
              <button
                className={primaryButton}
                onClick={() => {
                  setEditingService(null);
                  setDialog("service");
                }}
              >
                <Plus className="size-3.5" /> New service
              </button>
            }
          >
            {services.data?.length === 0 ? (
              <EmptyState>No services yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {services.data?.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${s.active ? "" : "opacity-60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{s.name}</p>
                        {s.active ? null : <Chip>Archived</Chip>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.category ?? "General"} · {s.duration_min} min · SAC {s.sac_code} · GST {s.gst_rate}% ·{" "}
                        {s.followup_days ? `${s.followup_days}d follow-up` : "no follow-up"}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums">{money(s.price)}</span>
                    <button
                      type="button"
                      className={ghostButton}
                      aria-label={`Edit ${s.name}`}
                      title="Edit service"
                      onClick={() => {
                        setEditingService(s);
                        setDialog("service");
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {s.active ? (
                      <button
                        type="button"
                        className={ghostButton}
                        aria-label={`Archive ${s.name}`}
                        title="Archive service"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive "${s.name}"? It will be hidden from booking and billing, but past records are kept.`,
                            )
                          ) {
                            updateService.mutate(
                              { id: s.id, values: { active: false } },
                              { onSuccess: () => toast.success("Service archived"), onError: fail },
                            );
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={ghostButton}
                        aria-label={`Restore ${s.name}`}
                        title="Restore service"
                        onClick={() =>
                          updateService.mutate(
                            { id: s.id, values: { active: true } },
                            { onSuccess: () => toast.success("Service restored"), onError: fail },
                          )
                        }
                      >
                        <Undo2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <Panel
            title="Providers"
            action={
              <button className={primaryButton} onClick={() => setDialog("provider")}>
                <Plus className="size-3.5" /> New provider
              </button>
            }
          >
            {providers.data?.length === 0 ? (
              <EmptyState>No providers yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {providers.data?.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.title ?? "Provider"}
                        {p.email ? ` · ${p.email}` : ""}
                      </p>
                    </div>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(v) =>
                        updateProvider.mutate({ id: p.id, values: { active: v } })
                      }
                      aria-label="Toggle provider"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <Panel
            title="Treatment rooms"
            action={
              <button className={primaryButton} onClick={() => setDialog("room")}>
                <Plus className="size-3.5" /> New room
              </button>
            }
          >
            {rooms.data?.length === 0 ? (
              <EmptyState>No rooms yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {rooms.data?.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.kind ?? "Treatment room"}</p>
                    </div>
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) => updateRoom.mutate({ id: r.id, values: { active: v } })}
                      aria-label="Toggle room"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="consents" className="mt-4">
          <Panel
            title="Consent forms"
            action={
              <button className={primaryButton} onClick={() => setDialog("consent")}>
                <Plus className="size-3.5" /> New form
              </button>
            }
          >
            {consents.data?.length === 0 ? (
              <EmptyState>No consent forms yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {consents.data?.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.active ? null : <Chip>Archived</Chip>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.body}</p>
                    </div>
                    <Switch
                      checked={c.active}
                      onCheckedChange={(v) =>
                        updateConsent.mutate({ id: c.id, values: { active: v } })
                      }
                      aria-label="Toggle consent form"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog !== null} onOpenChange={(o) => (o ? null : close())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog === "service"
                ? editingService
                  ? "Edit service"
                  : "New service"
                : dialog === "provider"
                  ? "New provider"
                  : dialog === "room"
                    ? "New treatment room"
                    : "New consent form"}
            </DialogTitle>
          </DialogHeader>

          <form
            key={`${dialog ?? "none"}-${editingService?.id ?? "new"}`}
            id="setup-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (saving) return;

              const fd = new FormData(e.currentTarget);
              if (dialog === "service") {
                const values = {
                  name: String(fd.get("name")),
                  category: String(fd.get("category")) || null,
                  duration_min: Number(fd.get("duration_min")) || 30,
                  price: Number(fd.get("price")) || 0,
                  followup_days: Number(fd.get("followup_days")) || null,
                  sac_code: String(fd.get("sac_code")) || "999722",
                  gst_rate: Number(fd.get("gst_rate")) || 18,
                  default_product: String(fd.get("default_product")) || null,
                  default_units: fd.get("default_units") ? Number(fd.get("default_units")) : null,
                  default_device_settings: String(fd.get("default_device_settings")) || null,
                  consent_template_id: String(fd.get("consent_template_id")) || null,
                };
                if (editingService) {
                  updateService.mutate(
                    { id: editingService.id, values },
                    { onSuccess: () => ok("Service updated"), onError: fail },
                  );
                } else {
                  addService.mutate(
                    { ...values, active: true },
                    { onSuccess: () => ok("Service added"), onError: fail },
                  );
                }
              } else if (dialog === "provider") {
                const name = String(fd.get("name")).trim();
                const dupe = (providers.data ?? []).some(
                  (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
                );
                if (dupe) {
                  toast.error(`Provider "${name}" already exists`);
                  return;
                }
                addProvider.mutate(
                  {
                    name,
                    title: String(fd.get("title")) || null,
                    email: String(fd.get("email")) || null,
                    phone: String(fd.get("phone")) || null,
                    active: true,
                  },
                  { onSuccess: () => ok("Provider added"), onError: fail },
                );
              } else if (dialog === "room") {
                const name = String(fd.get("name")).trim();
                const dupe = (rooms.data ?? []).some(
                  (r) => r.name.trim().toLowerCase() === name.toLowerCase(),
                );
                if (dupe) {
                  toast.error(`Room "${name}" already exists`);
                  return;
                }
                addRoom.mutate(
                  {
                    name,
                    kind: String(fd.get("kind")) || null,
                    active: true,
                  },
                  { onSuccess: () => ok("Room added"), onError: fail },
                );
              } else {
                addConsent.mutate(
                  {
                    name: String(fd.get("name")),
                    body: String(fd.get("body")),
                    active: true,
                  },
                  { onSuccess: () => ok("Consent form added"), onError: fail },
                );
              }
            }}
          >
            <Field label="Name" className="sm:col-span-2">
              <input name="name" required defaultValue={editingService?.name ?? ""} className={inputClass} />
            </Field>

            {dialog === "service" ? (
              <>
                <Field label="Category">
                  <input
                    name="category"
                    defaultValue={editingService?.category ?? ""}
                    className={inputClass}
                    placeholder="Injectables"
                  />
                </Field>
                <Field label="Duration (min)">
                  <input
                    name="duration_min"
                    type="number"
                    defaultValue={editingService?.duration_min ?? 30}
                    className={inputClass}
                  />
                </Field>
                <Field label="Price">
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingService?.price ?? 0}
                    className={inputClass}
                  />
                </Field>
                <Field label="Follow-up after (days)">
                  <input
                    name="followup_days"
                    type="number"
                    defaultValue={editingService?.followup_days ?? 14}
                    className={inputClass}
                  />
                </Field>
                <Field label="SAC code">
                  <input
                    name="sac_code"
                    defaultValue={editingService?.sac_code ?? "999722"}
                    className={inputClass}
                  />
                </Field>
                <Field label="GST rate (%)">
                  <input
                    name="gst_rate"
                    type="number"
                    step="0.1"
                    defaultValue={editingService?.gst_rate ?? 18}
                    className={inputClass}
                  />
                </Field>
                <Field label="Default product">
                  <input
                    name="default_product"
                    defaultValue={editingService?.default_product ?? ""}
                    className={inputClass}
                    placeholder="Botox Cosmetic"
                  />
                </Field>
                <Field label="Default units">
                  <input
                    name="default_units"
                    type="number"
                    step="0.5"
                    defaultValue={editingService?.default_units ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Default device settings" className="sm:col-span-2">
                  <input
                    name="default_device_settings"
                    defaultValue={editingService?.default_device_settings ?? ""}
                    className={inputClass}
                    placeholder="Fluence, pulse width…"
                  />
                </Field>
                <Field label="Required consent form" className="sm:col-span-2">
                  <select
                    name="consent_template_id"
                    defaultValue={editingService?.consent_template_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">None</option>
                    {consents.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {dialog === "provider" ? (
              <>
                <Field label="Title">
                  <input name="title" className={inputClass} placeholder="Nurse Injector" />
                </Field>
                <Field label="Email">
                  <input name="email" type="email" className={inputClass} />
                </Field>
                <Field label="Phone" className="sm:col-span-2">
                  <input name="phone" className={inputClass} />
                </Field>
              </>
            ) : null}

            {dialog === "room" ? (
              <Field label="Kind" className="sm:col-span-2">
                <input name="kind" className={inputClass} placeholder="Laser suite" />
              </Field>
            ) : null}

            {dialog === "consent" ? (
              <Field label="Body" className="sm:col-span-2">
                <textarea name="body" required className={textareaClass} />
              </Field>
            ) : null}
          </form>

          <DialogFooter>
            <button type="button" className={ghostButton} onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              form="setup-form"
              className={primaryButton}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
