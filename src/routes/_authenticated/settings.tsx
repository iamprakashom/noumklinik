import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { ClinicProfileTab } from "@/components/clinic/ClinicProfileTab";
import { AddonsTab } from "@/components/clinic/AddonsTab";
import { PaymentsTab } from "@/components/clinic/PaymentsTab";
import { LeadCaptureTab } from "@/components/clinic/LeadCaptureTab";
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

  const close = () => setDialog(null);
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
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="lead-capture">Lead capture</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-4">
          <ClinicProfileTab />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <AddonsTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="lead-capture" className="mt-4">
          <LeadCaptureTab />
        </TabsContent>



        <TabsContent value="services" className="mt-4">
          <Panel
            title="Treatment menu"
            action={
              <button className={primaryButton} onClick={() => setDialog("service")}>
                <Plus className="size-3.5" /> New service
              </button>
            }
          >
            {services.data?.length === 0 ? (
              <EmptyState>No services yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {services.data?.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.category ?? "General"} · {s.duration_min} min ·{" "}
                        {s.followup_days ? `${s.followup_days}d follow-up` : "no follow-up"}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums">{money(s.price)}</span>
                    <Switch
                      checked={s.active}
                      onCheckedChange={(v) =>
                        updateService.mutate({ id: s.id, values: { active: v } })
                      }
                      aria-label="Toggle service"
                    />
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
                ? "New service"
                : dialog === "provider"
                  ? "New provider"
                  : dialog === "room"
                    ? "New treatment room"
                    : "New consent form"}
            </DialogTitle>
          </DialogHeader>

          <form
            id="setup-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              if (dialog === "service") {
                addService.mutate(
                  {
                    name: String(fd.get("name")),
                    category: String(fd.get("category")) || null,
                    duration_min: Number(fd.get("duration_min")) || 30,
                    price: Number(fd.get("price")) || 0,
                    followup_days: Number(fd.get("followup_days")) || null,
                    active: true,
                  },
                  { onSuccess: () => ok("Service added"), onError: fail },
                );
              } else if (dialog === "provider") {
                addProvider.mutate(
                  {
                    name: String(fd.get("name")),
                    title: String(fd.get("title")) || null,
                    email: String(fd.get("email")) || null,
                    phone: String(fd.get("phone")) || null,
                    active: true,
                  },
                  { onSuccess: () => ok("Provider added"), onError: fail },
                );
              } else if (dialog === "room") {
                addRoom.mutate(
                  {
                    name: String(fd.get("name")),
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
              <input name="name" required className={inputClass} />
            </Field>

            {dialog === "service" ? (
              <>
                <Field label="Category">
                  <input name="category" className={inputClass} placeholder="Injectables" />
                </Field>
                <Field label="Duration (min)">
                  <input name="duration_min" type="number" defaultValue={30} className={inputClass} />
                </Field>
                <Field label="Price">
                  <input name="price" type="number" step="0.01" defaultValue={0} className={inputClass} />
                </Field>
                <Field label="Follow-up after (days)">
                  <input name="followup_days" type="number" defaultValue={14} className={inputClass} />
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
            <button type="submit" form="setup-form" className={primaryButton}>
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
