# Improve the Noum Klinik sign-in page

## Direction
Build the selected **Modern clinical split** composition while preserving the chosen Noum Klinik styling:

- **Palette:** Ocean Deep — `#F4F8FA`, `#5CBDB9`, `#1A4A6E`, `#0C2340`
- **Typography:** Space Grotesk for headings and DM Sans for interface text
- **Layout:** full-height split welcome panel and focused authentication panel
- **Character:** calm clinical confidence, premium SaaS precision, minimal decoration

## What will change

1. **Create a stronger brand welcome panel**
   - Give Noum Klinik a clear first-viewport presence.
   - Use a deep Ocean navy surface, concise clinic-operations messaging, and restrained security/trust details.
   - Avoid fabricated patient counts, testimonials, stock photography, or marketing claims.

2. **Refine the sign-in form**
   - Increase form scale, spacing, label clarity, and focus visibility.
   - Add a show/hide password control with an accessible label.
   - Keep email/password sign-in, account creation, Google sign-in, loading states, errors, and invite-aware redirects unchanged.
   - Present Google sign-in and the sign-in/sign-up switch with clearer hierarchy.

3. **Make authentication states feel complete**
   - Adapt the heading and supporting copy when switching between sign-in and account creation.
   - Keep button widths and form dimensions stable while requests are running.
   - Ensure keyboard focus, disabled states, autocomplete attributes, and screen-reader labels are correct.

4. **Responsive behavior**
   - Keep the split composition on large screens.
   - Collapse to a focused single-column screen on mobile, retaining the Noum Klinik identity without forcing the decorative panel above the form.
   - Confirm the form remains fully visible on short screens without overlap.

5. **Design-system updates**
   - Add scoped Ocean Deep authentication tokens in the global design system using OKLCH values.
   - Load Space Grotesk and DM Sans through the document head, not CSS imports.
   - Use existing input and button components with semantic colors and restrained 6–8px corner radii.

## Verification

- Test sign-in and sign-up mode switching, password visibility, Google action, submit loading, and error feedback.
- Check keyboard navigation and visible focus states.
- Visually verify desktop and mobile layouts against the selected direction.
- Run the existing automated tests and type checks.
