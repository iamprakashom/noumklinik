import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DELIVERABLE_LABELS,
  type Campaign,
  type Person,
  type Stage,
} from "@/data/crm";

export type CrmData = { people: Person[]; campaigns: Campaign[] };

async function fetchCrm(): Promise<CrmData> {
  const [peopleRes, campaignRes, deliverableRes] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("campaigns").select("*").order("created_at"),
    supabase.from("deliverables").select("*").order("position"),
  ]);
  if (peopleRes.error) throw peopleRes.error;
  if (campaignRes.error) throw campaignRes.error;
  if (deliverableRes.error) throw deliverableRes.error;

  const people: Person[] = (peopleRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as Person["role"],
    active: p.active,
  }));

  const campaigns: Campaign[] = (campaignRes.data ?? []).map((c) => ({
    id: c.id,
    client: c.client,
    song: c.song,
    stage: c.stage as Stage,
    pm: c.pm_id ?? "",
    executor: c.executor_id ?? "",
    deadline: c.deadline,
    deliverables: (deliverableRes.data ?? [])
      .filter((d) => d.campaign_id === c.id)
      .map((d) => ({ id: d.id, label: d.label, done: d.done })),
  }));

  return { people, campaigns };
}

export function useCrm() {
  return useQuery({ queryKey: ["crm"], queryFn: fetchCrm });
}

function useCrmMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm"] }),
  });
}

export type NewCampaignInput = {
  client: string;
  song: string;
  pm: string;
  executor: string;
  deadline: string;
};

export function useCreateCampaign() {
  return useCrmMutation(async (input: NewCampaignInput) => {
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        client: input.client,
        song: input.song,
        stage: "Created",
        pm_id: input.pm || null,
        executor_id: input.executor || null,
        deadline: input.deadline,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: dErr } = await supabase.from("deliverables").insert(
      DELIVERABLE_LABELS.map((label, i) => ({
        campaign_id: data.id,
        label,
        done: false,
        position: i + 1,
      })),
    );
    if (dErr) throw dErr;
    return data.id;
  });
}

export function useSaveCampaign() {
  return useCrmMutation(async (campaign: Campaign) => {
    const { error } = await supabase
      .from("campaigns")
      .update({
        client: campaign.client,
        song: campaign.song,
        stage: campaign.stage,
        pm_id: campaign.pm || null,
        executor_id: campaign.executor || null,
        deadline: campaign.deadline,
      })
      .eq("id", campaign.id);
    if (error) throw error;

    for (const d of campaign.deliverables) {
      const { error: dErr } = await supabase
        .from("deliverables")
        .update({ done: d.done, label: d.label })
        .eq("id", d.id);
      if (dErr) throw dErr;
    }
  });
}

export function useInvitePerson() {
  return useCrmMutation(
    async (person: { name: string; email: string; role: Person["role"] }) => {
      const { error } = await supabase.from("people").insert({
        name: person.name,
        email: person.email,
        role: person.role,
        active: true,
      });
      if (error) throw error;
    },
  );
}

export function useUpdatePerson() {
  return useCrmMutation(async (person: { id: string; active: boolean }) => {
    const { error } = await supabase
      .from("people")
      .update({ active: person.active })
      .eq("id", person.id);
    if (error) throw error;
  });
}
