/** Server-only helpers for Messenger / Instagram Direct inbox setup. */

const GRAPH = "https://graph.facebook.com/v20.0";

const MESSAGING_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_reactions",
  "messaging_optins",
].join(",");

/** Subscribes the page to messaging webhooks (keeps leadgen subscribed too). */
export async function subscribeMessaging(pageId: string, pageToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: `leadgen,${MESSAGING_FIELDS}`,
      access_token: pageToken,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Could not turn on message notifications");
  }
}

export type InstagramAccount = { id: string; username: string | null; picture: string | null };

/** The Instagram professional account linked to the page, if any. */
export async function fetchInstagramAccount(
  pageId: string,
  pageToken: string,
): Promise<InstagramAccount | null> {
  const url = new URL(`${GRAPH}/${pageId}`);
  url.searchParams.set("access_token", pageToken);
  url.searchParams.set(
    "fields",
    "instagram_business_account{id,username,profile_picture_url}",
  );
  const res = await fetch(url.toString());
  const json = (await res.json().catch(() => null)) as {
    instagram_business_account?: {
      id?: string;
      username?: string;
      profile_picture_url?: string;
    };
    error?: { message?: string };
  } | null;
  if (!res.ok || json?.error) return null;
  const ig = json?.instagram_business_account;
  if (!ig?.id) return null;
  return {
    id: ig.id,
    username: ig.username ?? null,
    picture: ig.profile_picture_url ?? null,
  };
}
