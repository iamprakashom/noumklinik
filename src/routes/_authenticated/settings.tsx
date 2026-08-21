import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, Panel, inputClass, textareaClass } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
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
  component: SettingsPage;
});

function SettingsPage() {
  return null;
}
