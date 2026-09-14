import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Facebook, Instagram, MessageCircle, RefreshCw, Unplug } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, Panel } from "@/components/clinic/bits";
import { Switch } from "@/components/ui/switch";
import { startMetaConnect } from "@/lib/meta-leads.functions";
import {
  connectMessaging,
  disconnectMessaging,
  getMessagingChannels,
  setMessagingChannelEnabled,
} from "@/lib/messaging-channels.functions";

type Tone = "completed" | "overdue" | "progress" | "idle";

function ChannelCard({
  icon,
  title,
  subtitle,
  avatar,
  tone,
  statusLabel,
  unread,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  avatar?: string | null;
  tone: Tone;
  statusLabel: string;
  unread?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="size-9 shrink-0 rounded-full" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {unread ? <Chip tone="progress">{unread} unread</Chip> : null}
          <Chip tone={tone}>{statusLabel}</Chip>
        </div>
      </div>
      {children ? <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/** One place to connect WhatsApp, Facebook Messenger and Instagram Direct. */
export function MessagingTab() {
  const qc = useQueryClient();
  const load = useServerFn(getMessagingChannels);
  const startConnect = useServerFn(startMetaConnect);
  const turnOn = useServerFn(connectMessaging);
  const toggle = useServerFn(setMessagingChannelEnabled);
  const disconnect = useServerFn(disconnectMessaging);

  const status = useQuery({ queryKey: ["messaging-channels"], queryFn: () => load() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["messaging-channels"] });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { source?: string; ok?: boolean } | null;
      if (data?.source !== "meta-connect") return;
      if (data.ok) {
        toast.success("Facebook connected — now turn on messaging");
        refresh();
      } else toast.error("Facebook connection was cancelled");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectFacebook = useMutation({
    mutationFn: () => startConnect({ data: { origin: window.location.origin } }),
    onSuccess: (res) => window.open(res.url, "meta-connect", "width=600,height=720"),
    onError: (e: Error) => toast.error(e.message),
  });

  const enableMessaging = useMutation({
    mutationFn: () => turnOn({}),
    onSuccess: (r) => {
      toast.success(
        r.instagram
          ? `${r.page} and @${r.instagram} are now in your inbox`
          : `${r.page} is now in your inbox`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setEnabled = useMutation({
    mutationFn: (v: { channel: "messenger" | "instagram"; enabled: boolean }) =>
      toggle({ data: v }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const doDisconnect = useMutation({
    mutationFn: () => disconnect({}),
    onSuccess: () => {
      toast.success("Messenger and Instagram disconnected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (status.isLoading) return <Panel title="Messaging channels">Loading…</Panel>;
  if (status.error)
    return (
      <Panel title="Messaging channels">
        <p className="text-sm text-muted-foreground">{(status.error as Error).message}</p>
      </Panel>
    );

  const s = status.data!;
  const meta = s.meta;
  const pageConnected = Boolean(meta.page_id);
  const messagingLive = meta.messaging_status === "connected";

  const waTone: Tone =
    s.whatsapp.status === "Connected" && s.whatsapp.enabled
      ? "completed"
      : s.whatsapp.status === "Error"
        ? "overdue"
        : "idle";

  const messengerTone: Tone = meta.messaging_error
    ? "overdue"
    : messagingLive && meta.messenger_enabled
      ? "completed"
      : pageConnected
        ? "idle"
        : "idle";

  const igTone: Tone = !meta.instagram_account_id
    ? "idle"
    : meta.instagram_enabled
      ? "completed"
      : "idle";

  return (
    <div className="grid gap-4">
      <Panel
        title="Messaging channels"
        action={
          messagingLive ? (
            <div className="flex gap-2">
              <button
                className={ghostButton}
                onClick={() => enableMessaging.mutate()}
                disabled={enableMessaging.isPending}
              >
                <RefreshCw className="size-3.5" /> Reconnect
              </button>
              <button className={ghostButton} onClick={() => doDisconnect.mutate()}>
                <Unplug className="size-3.5" /> Disconnect
              </button>
            </div>
          ) : null
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Patient messages from WhatsApp, your Facebook page and Instagram all land in one Inbox.
          Connect each channel once — your team then replies from the same screen.
        </p>

        <div className="grid gap-3">
          <ChannelCard
            icon={<MessageCircle className="size-4" />}
            title="WhatsApp"
            subtitle={
              s.whatsapp.phone_number
                ? `${s.whatsapp.display_name ?? "Business"} · ${s.whatsapp.phone_number}`
                : "Set up in the WhatsApp tab"
            }
            tone={waTone}
            statusLabel={
              s.whatsapp.status === "Connected" && !s.whatsapp.enabled
                ? "Paused"
                : s.whatsapp.status
            }
            unread={s.whatsapp.unread}
          >
            {s.whatsapp.error_message ? (
              <p className="text-xs text-status-overdue">{s.whatsapp.error_message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Numbers, tokens and templates live in the WhatsApp tab.
              </p>
            )}
          </ChannelCard>

          <ChannelCard
            icon={<Facebook className="size-4" />}
            title="Facebook Messenger"
            subtitle={meta.page_name ?? "No Facebook page connected"}
            avatar={meta.page_picture_url}
            tone={messengerTone}
            statusLabel={
              meta.messaging_error
                ? "Needs attention"
                : !pageConnected
                  ? "Not connected"
                  : !messagingLive
                    ? "Ready to turn on"
                    : meta.messenger_enabled
                      ? "Live"
                      : "Paused"
            }
            unread={meta.messenger_unread}
          >
            {!pageConnected ? (
              <button
                className={primaryButton}
                onClick={() => connectFacebook.mutate()}
                disabled={connectFacebook.isPending || !s.configured}
              >
                <Facebook className="size-3.5" /> Connect Facebook
              </button>
            ) : !messagingLive ? (
              <button
                className={primaryButton}
                onClick={() => enableMessaging.mutate()}
                disabled={enableMessaging.isPending}
              >
                {enableMessaging.isPending ? "Turning on…" : "Turn on messaging"}
              </button>
            ) : (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={meta.messenger_enabled}
                  onCheckedChange={(v) => setEnabled.mutate({ channel: "messenger", enabled: v })}
                  aria-label="Receive Messenger conversations"
                />
                Receive Messenger conversations
              </label>
            )}
            {meta.messaging_error ? (
              <p className="text-xs text-status-overdue">{meta.messaging_error}</p>
            ) : null}
            {!s.configured && !pageConnected ? (
              <p className="text-xs text-amber-600">
                Waiting on the Facebook app credentials for this CRM.
              </p>
            ) : null}
          </ChannelCard>

          <ChannelCard
            icon={<Instagram className="size-4" />}
            title="Instagram Direct"
            subtitle={
              meta.instagram_username
                ? `@${meta.instagram_username}`
                : "Link an Instagram professional account to your Facebook page"
            }
            avatar={meta.instagram_picture_url}
            tone={igTone}
            statusLabel={
              !meta.instagram_account_id
                ? "Not linked"
                : meta.instagram_enabled
                  ? "Live"
                  : "Paused"
            }
            unread={meta.instagram_unread}
          >
            {meta.instagram_account_id ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={meta.instagram_enabled}
                  onCheckedChange={(v) => setEnabled.mutate({ channel: "instagram", enabled: v })}
                  aria-label="Receive Instagram messages"
                />
                Receive Instagram messages
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                In the Instagram app: Settings → Account type → switch to a professional account and
                link it to your Facebook page, then hit Reconnect here.
              </p>
            )}
          </ChannelCard>
        </div>
      </Panel>
    </div>
  );
}
