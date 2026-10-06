import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

// Old links (bookmarks, invites, patient forms, booking links) moved under /app.
const LEGACY = /^(auth|join|onboarding|dashboard|appointments|recalls|patients|leads|inbox|billing|reports|automations|settings|activity|access-denied|book|p)(\/|$)/;

export const Route = createFileRoute("/$")({
  beforeLoad: ({ params, location }) => {
    const path = params._splat ?? "";
    if (LEGACY.test(path)) {
      throw redirect({ href: `/app/${path}${location.searchStr ?? ""}`, replace: true });
    }
    throw notFound();
  },
});
