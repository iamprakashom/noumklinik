import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite, createClinic, getMyWorkspace } from "@/lib/team.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your clinic — Noum Klinik" },
      {
        name: "description",
        content: "Create your private clinic workspace or accept an invite from a colleague to get started.",
      },
      { property: "og:title", content: "Set up your clinic — Noum Klinik" },
      { property: "og:description", content: "Create a clinic workspace or join your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const loadWorkspace = useServerFn(getMyWorkspace);
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: () => loadWorkspace() });

  const createFn = useServerFn(createClinic);
  const acceptFn = useServerFn(acceptInvite);

  const done = () => {
    void qc.invalidateQueries();
    navigate({ to: "/dashboard", replace: true });
  };

  const create = useMutation({
    mutationFn: (clinicName: string) => createFn({ data: { name: clinicName } }),
    onSuccess: () => {
      toast.success("Clinic workspace created");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: (inviteId: string) => acceptFn({ data: { inviteId } }),
    onSuccess: () => {
      toast.success("You've joined the clinic");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invites = workspace.data?.invites ?? [];

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Set up your clinic</h1>
            <p className="text-xs text-muted-foreground">
              Your data stays private to your clinic workspace.
            </p>
          </div>
        </div>

        {invites.length > 0 ? (
          <section className="mb-6 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium">Invitations for you</h2>
            <ul className="mt-3 space-y-2">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.clinicName}</p>
                    <p className="text-xs text-muted-foreground">Role: {i.role.replace("_", " ")}</p>
                  </div>
                  <Button size="sm" disabled={join.isPending} onClick={() => join.mutate(i.id)}>
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form
          className="rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(name.trim());
          }}
        >
          <h2 className="text-sm font-medium">Create a new clinic</h2>
          <div className="mt-3 space-y-2">
            <Label htmlFor="clinic-name">Clinic name</Label>
            <Input
              id="clinic-name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Skin & Glow Clinic, Indiranagar"
            />
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create clinic"}
          </Button>
        </form>
      </div>
    </main>
  );
}
