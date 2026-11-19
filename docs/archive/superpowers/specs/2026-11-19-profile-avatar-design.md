# Profile page and avatar

## Problem

Users who register by email have no avatar (the header shows a grey `User` icon), and the user menu items (help, password, preferences, AI keys, switch account, sign out) live only in the header dropdown. A "Subscription" item is coming.

## Decisions (approved 2026-11-19)

- Avatar fallback: initials on a colour derived from the user id.
- Users can upload their own photo; stored in Supabase Storage (not in the DB).
- New hub page `/profile`; `/settings/*` pages stay untouched.
- Out of scope: showing avatars to other campaign members, a crop UI (centred square only).

## Reused

`ImageUpload` / `resizeImageToDataUrl` (`components/common/fields`, `lib/utils/common/image-resize`), `useSessionUser` (`lib/hooks/auth`), `HudPage` / `HudPageHeader` / `HudPanel`, `useNotify`, `useConfirm`, `getSessionUserId` redirect pattern from `app/settings/*/page.tsx`, hash-addressed 1-year-cache upload convention from `lib/constants/storage.ts`. New: avatar utils, `avatars` bucket, profile menu registry.

## Design

### Avatar resolution

`SessionUser` becomes `{ id, email, name, avatarUrl }`. `avatarUrl` order: `user_metadata.custom_avatar_url` (own upload), then Google `avatar_url`/`picture`, then `null` (initials). The custom field is separate because Google sign-in overwrites `avatar_url`.

`lib/utils/auth/avatar.ts` (pure, unit-tested): `avatarInitials(name, email)` (1-2 letters, falls back to the email local part, `?` if empty), `avatarHue(id)` (stable hash to 0-359). `UserAvatar` moves from `Header.tsx` to a shared component (check `components/ui`/`common` for an existing avatar first) and renders photo or initials; used by the header trigger, dropdown row and `/profile`.

### Upload

Hook `lib/hooks/auth/useAvatar` (components only call it): validates type (jpeg/png/webp/gif) and size (<= 15 MB), centre-crops to a square and resizes to 256x256 WebP, uploads to `avatars/{userId}/{sha8}.webp` (`cacheControl` 1 year, `upsert: false`), then `auth.updateUser({ data: { custom_avatar_url } })` and a session refresh so the header updates at once. Remove sets `custom_avatar_url` to `null` and deletes the user's old object(s). Errors go through `useNotify` with i18n keys. The path/hash helper is pure and tested.

### Bucket

`avatars`: public read, 512 KB limit, `image/webp` only; RLS allows insert/delete only when the first path segment equals `auth.uid()`. Created the same way as the existing buckets (idempotent script, run once on prod, runbook line in `docs/STATUS.md`); the exact mechanism is confirmed when writing the plan. Not an icon bucket, so the icon immutability test does not apply.

### Profile hub and menu registry

`components/layout/profile-menu.ts` is the single registry: entries `{ id, icon, labelKey, href | action }` for help, password, preferences, AI keys, switch account, sign out (existing `common.header.*` keys). The header dropdown and `/profile` both render it; Subscription is one new entry. `/profile` shows the large avatar with change/remove, the email and name, then the registry as sections. The dropdown gets "Profile" as its first item. Unauthenticated users go to `/sign-in?next=/profile`.

## Tests and verification

Unit: avatar utils, upload path helper. Hook/component (happy-dom): initials fallback, photo precedence, upload/remove success and error, `/profile` renders every registry entry. User-facing feature: `whats-new.ts` entry plus `whatsNew.<id>` in both `messages/*/whatsNew.json`; update `docs/STATUS.md` and `docs/architecture/platform.md`. Before done: preview deploy in the browser: email sign-up shows initials, upload a photo, header updates, reload keeps it, remove returns to initials, all `/profile` entries work.

## Risks

- Bucket and policies must exist on prod before the feature is used (deploy ordering).
- `custom_avatar_url` is client-writable metadata; it only affects the user's own display, and the bucket limits bound abuse.
- Egress: one small immutable file per user, browser-cached.
