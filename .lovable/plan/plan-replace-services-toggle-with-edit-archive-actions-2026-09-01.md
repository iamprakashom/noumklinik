# Plan: Replace Services toggle with Edit / Archive actions

In Settings → Services, each treatment currently has an on/off toggle that is easy to hit accidentally and gives no way to edit a service after creating it. We will replace it with two explicit icon actions: Edit (pencil) and Archive (trash), with archive being a soft delete.

## Changes

### 1. Services list rows (Settings → Services)
- Remove the `Switch` toggle from each service row.
- Add two icon buttons at the right of each row:
  - **Pencil (Edit)** — opens the service dialog pre-filled with that service's values.
  - **Trash (Archive)** — opens a small confirmation, then sets `active: false` (soft delete; history, invoices, and treatment records that reference the service stay intact).
- Inactive/archived services show muted with an "Archived" chip, and their trash icon is replaced by a **Restore** action (sets `active: true`) so nothing is ever lost permanently.

### 2. Edit dialog
- Reuse the existing service dialog in `settings.tsx` for both create and edit:
  - When editing, the dialog title becomes "Edit service" and every field (name, category, duration, price, follow-up days, SAC code, GST rate, default product/units/device settings, consent form) is pre-filled from the selected service via `defaultValue`s keyed to the dialog state.
  - Submitting calls `updateService` when editing and `addService` when creating.
- The `active` flag is no longer editable from the dialog — it is managed only via Archive/Restore.

### 3. Confirmation for archive
- A lightweight confirm step (window confirm or small dialog) before archiving, with copy like: "Archive {name}? It will be hidden from booking and billing, but past records are kept."

## Scope notes
- Only the **Services** tab changes. Providers, Rooms, and Consent forms keep their existing toggles unless you want the same treatment there — say the word and it is a 5-minute follow-up.
- No database changes needed: soft delete uses the existing `active` column.
- Services already filter to active-only in booking/billing dropdowns, so archived services disappear from those flows automatically.

## Technical details
- File: `src/routes/_authenticated/settings.tsx`
  - Dialog state changes from `dialog: "service" | ... | null` to also carry the record being edited (e.g. `{ kind: "service", editing?: Service }`).
  - Form fields get `defaultValue` from `editing` when present; `key` on the form resets values between opens.
  - Row actions use `lucide-react` `Pencil` / `Trash2` / `Undo2` icons with `aria-label`s.
- Mutations `updateService` / `addService` already exist via `useServices` hooks.

## Verification
- Edit a service: change price, save, confirm the row updates and the new price appears in billing dropdowns.
- Archive a service: confirm it shows muted with "Archived" chip and disappears from the New Appointment service list; then restore it.
- Create flow still works unchanged.
