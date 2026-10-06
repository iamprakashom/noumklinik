# Run Noum Klinik under `/app`

## Outcome

- Keep the public landing page at `/`.
- Move sign-in, onboarding, invitations, clinic screens, booking, and patient forms under `/app`.
- Examples: `/app/auth`, `/app/dashboard`, `/app/billing`, `/app/book`, and `/app/p/:token`.
- Keep external webhook endpoints under `/api/public/hooks/*` so payment and messaging providers continue working.

## Implementation

1. Reorganize the TanStack route files beneath an `/app` parent while preserving the existing authenticated layout and access checks.
2. Update every internal link, redirect, command-menu destination, permission path, booking URL, patient-form URL, invite URL, and sign-in callback to use the `/app` prefix.
3. Keep `/` as the public landing page and change its sign-in action and signed-in redirect to `/app/*`.
4. Add redirects from the former browser-facing paths to their new `/app/*` equivalents so existing bookmarks and shared links continue working.
5. Update route-specific metadata and the root fallback metadata where needed.
6. Verify route generation, tests, type checks, the public landing page, sign-in redirect, authenticated navigation, public booking, and patient links.

## Technical notes

- `/api/public/hooks/*` will not move because those are provider callback endpoints, not application pages.
- OAuth callbacks remain at their current API endpoint; the post-login destination changes to `/app`.
- The route-tree file remains generated and will not be edited manually.
