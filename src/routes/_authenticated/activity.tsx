import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/clinic/AppShell";
import { EmptyState, Panel } from "@/components/clinic/bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/activity")({
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [
    { title: "Activity history — Noum Klinik" },
    { name: "description", content: "Review important staff and clinic account changes." },
    { property: "og:title", content: "Activity history — Noum Klinik" },
    { property: "og:description", content: "Review important staff and clinic account changes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ActivityPage,
});

function ActivityPage() {
  const activity = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("id, action, entity_type, summary, created_at").order("created_at", { ascending: false }).limit(250);
      if (error) throw error;
      return data ?? [];
    },
  });
  return <AppShell title="Activity history" subtitle="Important access and team changes">
    <Panel title="Recent activity">
      {!activity.data?.length ? <EmptyState>No activity has been recorded yet.</EmptyState> : (
        <ul className="divide-y divide-border">
          {activity.data.map((item) => <li key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.summary}</p><p className="text-xs capitalize text-muted-foreground">{item.entity_type.replace("_", " ")} · {item.action.replace("_", " ")}</p></div>
            <time className="text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-IN")}</time>
          </li>)}
        </ul>
      )}
    </Panel>
  </AppShell>;
}