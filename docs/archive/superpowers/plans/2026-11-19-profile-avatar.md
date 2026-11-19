# Profile page and avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avatar (own photo or initials) for every user and a `/profile` hub page that shares one menu registry with the header dropdown.

**Architecture:** Photo is uploaded to a new public Supabase bucket `user-avatars` through the repo's existing signed-upload-ticket flow (`imageBucketStorage`, server admin client, lazily created bucket); a commit route validates ownership of the uploaded URL and writes `user_metadata.custom_avatar_url` with the admin client. `useSessionUser` derives `{ id, email, name, avatarUrl }` and re-derives on `onAuthStateChange`. A pure `PROFILE_MENU` registry feeds both the header dropdown and `/profile`.

**Tech Stack:** Next.js 16, React 19, Supabase Auth + Storage, TanStack-free (auth hooks use plain state), next-intl, Vitest (+ happy-dom).

**Spec:** `docs/superpowers/specs/2026-11-19-profile-avatar-design.md`

## Deviations from the spec (decided while planning)

- **Bucket name `user-avatars`**, not `avatars`: `avatars` already exists (campaign character avatars, `lib/supabase/avatar-storage.ts`) and `ensureBucket` would `updateBucket` it with the new limits and break those images.
- **No RLS policies / no setup script.** The repo has no `storage.objects` policy precedent; every bucket is created lazily by `ensureBucket` with the service key. We follow that: ticket route → direct `uploadToSignedUrl` from the browser. This removes the "bucket must exist before deploy" risk.
- **Commit via server route**, not client `auth.updateUser`: the server accepts only a URL inside `user-avatars/<own userId>/`, so a client cannot point the avatar at an arbitrary host. Object names are random UUIDs (unique ⇒ immutable 1-year cache is safe) instead of sha8.
- **Subscription entry not added**: there is no page yet; the registry makes it one row later.

## Global Constraints

- Components and `app/**` never import `@/lib/api/*` or call `fetch`; they call hooks (ESLint-enforced). Hooks are imported from the `@/lib/hooks/auth` barrel.
- Routes: `requireAuth` → `parseBody(schema, req)` → helper; errors via `errorResponse`/`handleApiError`, texts from `lib/constants/api-errors.ts`.
- i18n: no Cyrillic in code; keys in `messages/{uk,en}/*.json`, both locales. English-only code comments, minimal (global rule).
- Alias `@/…`, never `../../`. No full-suite runs per task: `pnpm test:run <file>` / `pnpm exec eslint --fix <files>`; one `pnpm test:run` + `pnpm cycles` at the end.
- Egress: avatar ≤ 512 KB, 256×256 WebP, `cacheControl` = `YEAR_CACHE_SECONDS`.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- User with no name and no email local part (phone/OAuth edge) → initials `?`, no crash.
- Name with emoji / combining marks / Cyrillic / a single word → one or two sane initials, uppercase.
- Google user who then uploads a photo → custom wins; after remove, Google photo returns (not initials).
- Upload of a non-image, a >15 MB file, an animated GIF, or a tiny (< 256 px) image → clear error or valid square output, never a broken avatar.
- Ticket for user A cannot be committed by user B (URL under another `userId/` is rejected 400).
- Remove when no custom avatar is set, and double-click on Upload/Remove → idempotent, no stale object left, no unhandled rejection.
- Unauthenticated `/profile` → redirect `/sign-in?next=/profile`; API routes → 401.

---

### Task 1: Pure avatar utils and SessionUser mapping

**Files:**
- Create: `lib/utils/auth/avatar.ts`, `lib/utils/auth/session-user.ts`
- Test: `lib/utils/auth/__tests__/avatar.test.ts`, `lib/utils/auth/__tests__/session-user.test.ts`
- Modify: `lib/hooks/auth/useSessionUser.ts`, `lib/hooks/auth/index.ts` (export unchanged name; type gains fields)

**Interfaces:**
- Produces:
  `avatarInitials(name: string | null | undefined, email: string | null | undefined): string`
  `avatarHue(id: string): number` (0–359, stable)
  `type SessionUser = { id: string; email: string | null; name: string | null; avatarUrl: string | null }`
  `toSessionUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): SessionUser | null`
  `useSessionUser(): SessionUser | null` (now live: re-derives on `onAuthStateChange`)

- [ ] **Step 1: Write failing tests**

```ts
// avatar.test.ts
import { describe, expect, it } from 'vitest';
import { avatarHue, avatarInitials } from '@/lib/utils/auth/avatar';

describe('avatarInitials', () => {
    it.each([
        ['Anna Kovalenko', null, 'AK'],
        ['anna', null, 'A'],
        ['  Іван  Петрович  Сидоренко ', null, 'ІП'],
        [null, 'john.smith@x.com', 'J'],
        ['', 'zed@x.com', 'Z'],
        [null, null, '?'],
        ['', '', '?'],
        ['😀 Bob', null, '😀B'],
    ])('%s / %s → %s', (name, email, out) => {
        expect(avatarInitials(name, email)).toBe(out);
    });
});

describe('avatarHue', () => {
    it('is stable and within 0..359', () => {
        const h = avatarHue('3f1c-user');
        expect(h).toBe(avatarHue('3f1c-user'));
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
    });
    it('differs for different ids', () => {
        expect(avatarHue('a')).not.toBe(avatarHue('b'));
    });
});
```

```ts
// session-user.test.ts
import { describe, expect, it } from 'vitest';
import { toSessionUser } from '@/lib/utils/auth/session-user';

const base = { id: 'u1', email: 'a@b.c' };

describe('toSessionUser', () => {
    it('returns null without a user', () => expect(toSessionUser(null)).toBeNull());
    it('prefers custom_avatar_url over Google photo', () => {
        const u = toSessionUser({ ...base, user_metadata: {
            custom_avatar_url: 'https://x.supabase.co/own.webp',
            avatar_url: 'https://lh3.googleusercontent.com/g',
        } });
        expect(u?.avatarUrl).toBe('https://x.supabase.co/own.webp');
    });
    it('falls back to avatar_url, then picture, then null', () => {
        expect(toSessionUser({ ...base, user_metadata: { avatar_url: 'https://g/1' } })?.avatarUrl).toBe('https://g/1');
        expect(toSessionUser({ ...base, user_metadata: { picture: 'https://g/2' } })?.avatarUrl).toBe('https://g/2');
        expect(toSessionUser(base)?.avatarUrl).toBeNull();
    });
    it('treats custom_avatar_url null (removed) as absent and ignores non-https', () => {
        expect(toSessionUser({ ...base, user_metadata: { custom_avatar_url: null, avatar_url: 'https://g/1' } })?.avatarUrl).toBe('https://g/1');
        expect(toSessionUser({ ...base, user_metadata: { custom_avatar_url: 'javascript:alert(1)' } })?.avatarUrl).toBeNull();
    });
    it('reads name from full_name then name', () => {
        expect(toSessionUser({ ...base, user_metadata: { full_name: 'F N' } })?.name).toBe('F N');
        expect(toSessionUser({ ...base, user_metadata: { name: 'N' } })?.name).toBe('N');
    });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/auth/__tests__/avatar.test.ts lib/utils/auth/__tests__/session-user.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement**

```ts
// avatar.ts
const letters = (s: string) => Array.from(s.trim()).slice(0, 1).join('').toUpperCase();

export function avatarInitials(name?: string | null, email?: string | null): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (letters(words[0]) + letters(words[1]));
    if (words.length === 1) return letters(words[0]);
    const local = (email ?? '').split('@')[0]?.trim() ?? '';
    return local ? letters(local) : '?';
}

export function avatarHue(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 360;
}
```

```ts
// session-user.ts
export type SessionUser = { id: string; email: string | null; name: string | null; avatarUrl: string | null };

type AuthUserLike = { id: string; email?: string | null; user_metadata?: Record<string, unknown> };

const httpsUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('https://');
const text = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export function toSessionUser(u: AuthUserLike | null | undefined): SessionUser | null {
    if (!u) return null;
    const m = u.user_metadata ?? {};
    return {
        id: u.id,
        email: u.email ?? null,
        name: [m.full_name, m.name].find(text) ?? null,
        avatarUrl: [m.custom_avatar_url, m.avatar_url, m.picture].find(httpsUrl) ?? null,
    };
}
```

Export both from `lib/utils/auth/index.ts` only if that barrel already re-exports siblings; otherwise import by file path (utils have no barrel rule).

Rewrite `useSessionUser.ts`:

```ts
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type SessionUser, toSessionUser } from '@/lib/utils/auth/session-user';

export type { SessionUser };

// display only: getSession reads the cookie without a network round trip, the server still verifies every request
export function useSessionUser(): SessionUser | null {
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        const supabase = createClient();
        let alive = true;

        supabase.auth.getSession().then(({ data }) => {
            if (alive) setUser(toSessionUser(data.session?.user));
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (alive) setUser(toSessionUser(session?.user));
        });

        return () => { alive = false; sub.subscription.unsubscribe(); };
    }, []);

    return user;
}
```

- [ ] **Step 4:** rerun the two tests → PASS. Also `pnpm test:related lib/hooks/auth/useSessionUser.ts` (existing mocks of `createClient` may lack `onAuthStateChange` — add `onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })` to those mocks).
- [ ] **Step 5:** `pnpm exec eslint --fix lib/utils/auth lib/hooks/auth` then commit `feat(auth): avatar initials/hue utils and live SessionUser with custom avatar`.

---

### Task 2: Server — bucket, ticket, commit, remove

**Files:**
- Create: `lib/constants/profile.ts`, `lib/supabase/user-avatar-storage.ts`, `lib/server/users/avatar.ts`, `lib/schemas/profile.ts`, `app/api/profile/avatar/ticket/route.ts`, `app/api/profile/avatar/route.ts`
- Test: `lib/server/users/__tests__/avatar.test.ts`, `app/api/profile/avatar/__tests__/route.test.ts`

**Interfaces:**
- Produces (constants): `USER_AVATARS_BUCKET = 'user-avatars'`, `USER_AVATAR_SIZE = 256`, `MAX_USER_AVATAR_BYTES = 512 * 1024`, `USER_AVATAR_FORMATS = { 'image/webp': 'webp' } as const`, `USER_AVATAR_BUCKET_TYPES = ['image/webp'] as const`.
- Produces (server): `createUserAvatarTicket(userId): Promise<Result<SlideUploadTicket>>`; `commitUserAvatar(userId, url): Promise<Result<{ avatarUrl: string }>>`; `removeUserAvatar(userId): Promise<Result<{ ok: true }>>`.
- Produces (HTTP): `POST /api/profile/avatar/ticket` → `SlideUploadTicket`; `PUT /api/profile/avatar` body `{ url }` → `{ avatarUrl }`; `DELETE /api/profile/avatar` → `{ ok: true }`.
- Consumes: `imageBucketStorage` (`lib/supabase/image-bucket-storage.ts`; `createTicket(ownerId, contentType)`, `ownedPath(ownerId, url)`, `remove(ownerId, urls)` — `ownerId` is the first path segment, here the user id), `createAdminClient`, `requireAuth`, `parseBody`.

- [ ] **Step 1: Write failing tests.** Service test (mock `@/lib/supabase/admin` and `@/lib/supabase/image-bucket-storage` pattern from `lib/supabase/__tests__/image-bucket-storage.test.ts`): 
  - `commitUserAvatar('u1', '<publicBase>/user-avatars/u2/<32hex>.webp')` → `{ ok:false }`, admin `updateUserById` not called.
  - valid own URL → `updateUserById('u1', { user_metadata: { custom_avatar_url: url } })` called once, then storage `list('u1')` and `remove` of every object except the new one.
  - `removeUserAvatar('u1')` → `updateUserById` with `custom_avatar_url: null`, `list`+`remove` of all `u1/*`; with an empty folder it still returns ok.
  - `updateUserById` error → `{ ok:false, message: API_ERRORS.INTERNAL }` and the new object is NOT removed.
  Route test: 401 without session; PUT with invalid body → 400; PUT with another user's URL → 400.
- [ ] **Step 2:** run both files → FAIL.
- [ ] **Step 3: Implement.**

```ts
// lib/supabase/user-avatar-storage.ts
const avatars = imageBucketStorage({
    bucket: USER_AVATARS_BUCKET,
    maxBytes: MAX_USER_AVATAR_BYTES,
    formats: USER_AVATAR_FORMATS,
    bucketTypes: USER_AVATAR_BUCKET_TYPES,
    logTag: 'user-avatars',
});
export const userAvatars = avatars;
```

```ts
// lib/server/users/avatar.ts (sketch — keep Result<T> shapes from types/common)
export const createUserAvatarTicket = (userId: string) =>
    userAvatars.createTicket(userId, 'image/webp');

async function listObjectUrls(userId: string, except?: string) {
    const storage = createAdminClient().storage.from(USER_AVATARS_BUCKET);
    const { data } = await storage.list(userId);
    return (data ?? [])
        .map((o) => storage.getPublicUrl(`${userId}/${o.name}`).data.publicUrl)
        .filter((u) => u !== except);
}

async function setAvatarMetadata(userId: string, url: string | null) {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
        user_metadata: { custom_avatar_url: url },
    });
    return !error;
}

export async function commitUserAvatar(userId: string, url: string) {
    if (!userAvatars.ownedPath(userId, url)) return { ok: false as const, message: API_ERRORS.VALIDATION };
    if (!(await setAvatarMetadata(userId, url))) return { ok: false as const, message: API_ERRORS.INTERNAL };
    await userAvatars.remove(userId, await listObjectUrls(userId, url));
    return { ok: true as const, value: { avatarUrl: url } };
}

export async function removeUserAvatar(userId: string) {
    if (!(await setAvatarMetadata(userId, null))) return { ok: false as const, message: API_ERRORS.INTERNAL };
    await userAvatars.remove(userId, await listObjectUrls(userId));
    return { ok: true as const, value: { ok: true as const } };
}
```

Check `API_ERRORS` for the right validation key name and `ownedPath` behaviour (`ownerId` there is named `campaignId`; rename the parameter to `ownerId` in `imageBucketStorage` for clarity — pure rename, no behaviour change). Schema: `avatarCommitSchema = z.object({ url: z.string().url().max(2000) })`. Routes follow `app/api/theme/route.ts` (`requireAuth`, `parseBody`, `handleApiError`, `PRIVATE_NO_STORE_HEADERS`); ticket route calls `createUserAvatarTicket(auth.userId)` and maps `!ok` → `errorResponse(message, 500)`.

- [ ] **Step 4:** tests PASS. **Step 5:** eslint on touched dirs; commit `feat(profile): user avatar ticket/commit/remove routes on a user-avatars bucket`.

---

### Task 3: Client crop helper, API wrapper and `useAvatar` hook

**Files:**
- Modify: `lib/utils/common/image-resize.ts` (add `cropSquareToBlob`), `lib/hooks/auth/index.ts`
- Create: `lib/api/profile.ts`, `lib/hooks/auth/useAvatar.ts`
- Test: `lib/utils/common/__tests__/image-resize.test.ts` (extend; pure `squareCrop` math), `lib/hooks/auth/__tests__/useAvatar.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Produces: `squareCrop(w: number, h: number): { sx: number; sy: number; side: number }` (centred); `cropSquareToBlob(file: File, size: number, quality?: number): Promise<Blob>` (WebP; throws `ImageResizeError('validation.image.compressFailed')` when the browser returns non-WebP); `profileApi = { avatarTicket(): Promise<SlideUploadTicket>; commitAvatar(url): Promise<{ avatarUrl: string }>; removeAvatar(): Promise<{ ok: true }> }`; `useAvatar(): { upload(file: File): Promise<void>; remove(): Promise<void>; pending: boolean }`.
- Consumes: `decodeBitmap`, `request` from `lib/api/client`, `createClient().storage.from(...).uploadToSignedUrl`, `useNotify`, `useTranslator`.

- [ ] **Step 1: Failing tests.** `squareCrop(400,200)` → `{sx:100,sy:0,side:200}`; `squareCrop(100,300)` → `{sx:0,sy:100,side:100}`; `squareCrop(50,50)` → `{0,0,50}`. Hook tests (mock `@/lib/api/profile` is forbidden for components but fine for hook tests; mock `createClient` storage and `cropSquareToBlob`): non-image type → notify `profile.avatar.badType`, no API call; file > 15 MB → notify `profile.avatar.tooLarge`; success path order: ticket → `uploadToSignedUrl(path, token, blob, { contentType: 'image/webp', cacheControl: YEAR_CACHE_SECONDS })` → `commitAvatar(publicUrl)` → `auth.refreshSession()`; upload error → notify `profile.avatar.failed`, `commitAvatar` not called; `pending` true during the run and a second `upload` call while pending is ignored; `remove` → `removeAvatar` then `refreshSession`.
- [ ] **Step 2:** FAIL. **Step 3: Implement.**

```ts
// image-resize.ts
export function squareCrop(w: number, h: number) {
    const side = Math.min(w, h);
    return { sx: Math.floor((w - side) / 2), sy: Math.floor((h - side) / 2), side };
}

export async function cropSquareToBlob(file: File, size: number, quality = 0.85): Promise<Blob> {
    const bitmap = await decodeBitmap(file);
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); throw new ImageResizeError('validation.image.tooLarge'); }
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    bitmap.close();
    const blob = await toBlob(canvas, 'image/webp', quality);
    // the bucket accepts webp only; Safari may hand back PNG
    if (blob?.type !== 'image/webp') throw new ImageResizeError('validation.image.compressFailed');
    return blob;
}
```

`useAvatar`: accepted types `image/jpeg|png|webp|gif`, limit 15 MB (reuse the constants from `ImageUpload.tsx` by exporting `MAX_RESIZABLE_SIZE_BYTES` from `lib/constants/profile.ts` and importing it there too if trivial; otherwise define `MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024` in `lib/constants/profile.ts`). Use a `useRef` guard for the pending lock (state alone is racy on double click). Errors: `console.error` + `void notify(t('profile.avatar.failed'))`. `refreshSession()` after commit/remove triggers `onAuthStateChange` → header updates.

- [ ] **Step 4:** PASS. **Step 5:** eslint; commit `feat(profile): square-crop helper, profile api wrapper and useAvatar hook`.

---

### Task 4: `UserAvatar` component, profile menu registry, header refactor

**Files:**
- Create: `components/common/UserAvatar.tsx`, `components/layout/profile-menu.ts`, `lib/hooks/auth/useProfileActions.ts`
- Modify: `components/layout/Header.tsx`, `lib/hooks/auth/index.ts`
- Test: `components/common/__tests__/UserAvatar.test.tsx`, `components/layout/__tests__/profile-menu.test.ts`

**Interfaces:**
- Produces: `<UserAvatar user={SessionUser | null} className? sizes? />` (photo `Image` with the existing props, else initials on `hsl(avatarHue(id) 45% 32%)` background with readable text; `aria-hidden`, `alt=""`; `null` user → neutral `User` icon as today);
  `PROFILE_MENU: readonly ProfileMenuEntry[]` where `type ProfileMenuEntry = { id: 'help'|'password'|'preferences'|'aiKeys'|'switchAccount'|'signOut'; icon: LucideIcon; labelKey: string } & ({ href: string } | { action: 'switchAccount' | 'signOut' })`; label keys are the existing `common.header.*` keys (`help`, `password`, `preferences`, `aiKeys`, `switchAccount`, `signOut`);
  `useProfileActions(): { switchAccount(): void; signOut(): void }` (`signOut` creates and submits a hidden `POST /auth/signout` form, replacing the `useRef` form in `Header`).
- Consumes: Task 1 `SessionUser`, `avatarInitials`, `avatarHue`; `useSwitchGoogleAccount`.

- [ ] **Step 1: Failing tests.** UserAvatar (happy-dom): with `avatarUrl` renders an `img` with that `src`; with `{ name:'Anna Kovalenko', avatarUrl:null }` renders text `AK` and no `img`; null user renders no text; background colour is the same across two renders of the same id. Registry: ids unique; every entry has exactly one of `href`/`action`; `href` entries start with `/`; the order is help, password, preferences, aiKeys, switchAccount, signOut.
- [ ] **Step 2:** FAIL. **Step 3: Implement** the three files, then in `Header.tsx`: delete the local `UserAvatar`, `User`/`Image` imports it no longer needs, the `signOutForm` ref and hidden `<form>`; render the dropdown as: (email row with `UserAvatar` + name/email) → new first item `<Link href="/profile">` with label `t('profile')` and a separator → `PROFILE_MENU.map(...)` (item = `Link` when `href`, else `onSelect` → `actions[entry.action]()`). Add `"profile"` icon `UserRound`.
- [ ] **Step 4:** run both new tests + `pnpm test:related components/layout/Header.tsx` (fix any existing Header test mocks of `useSessionUser`/`useSwitchGoogleAccount`). **Step 5:** eslint (`pnpm exec eslint --fix components/common components/layout lib/hooks/auth`); commit `feat(profile): shared UserAvatar, profile menu registry, header uses both`.

---

### Task 5: `/profile` page with avatar controls

**Files:**
- Create: `app/profile/layout.tsx`, `app/profile/page.tsx`, `app/profile/page-client.tsx`, `components/profile/AvatarEditor.tsx`
- Modify: `messages/en/common.json`, `messages/uk/common.json` (new `profile` object; keep existing `header.profile`), `docs/…` later in Task 6
- Test: `app/profile/__tests__/page-client.test.tsx`, `components/profile/__tests__/AvatarEditor.test.tsx` (happy-dom)

**Interfaces:**
- Consumes: `useSessionUser`, `useAvatar`, `useProfileActions`, `PROFILE_MENU`, `UserAvatar`, `HudPage`/`HudPageHeader`/`HudPanel`, `useConfirm`, `LoadingState`.
- i18n keys (add to both locales, `common.profile.*`): `title`, `subtitle`, `account`, `avatar.change`, `avatar.remove`, `avatar.removeConfirm`, `avatar.hint` ("JPEG, PNG, WebP or GIF up to 15 MB, cropped to a square"), `avatar.badType`, `avatar.tooLarge`, `avatar.failed`, `sections.account` (menu section heading). Ukrainian texts written in `messages/uk/common.json`.

- [ ] **Step 1: Failing tests.** `page-client`: with a mocked session user renders email, name and one link/button per `PROFILE_MENU` entry (assert by label text for every registry id); sign-out/switch entries call the corresponding action. `AvatarEditor`: Change opens a hidden file input (`accept` has the four types) and selecting a file calls `useAvatar().upload`; Remove button visible only when the user has a custom avatar (`user.avatarUrl` host is the Supabase project storage — use `isHostedOnProjectStorage`) and calls `remove` only after `useConfirm` resolves true; buttons disabled while `pending`.
- [ ] **Step 2:** FAIL. **Step 3: Implement.**

`layout.tsx`: copy `app/settings/layout.tsx` (`LocaleScope namespaces={['common','validation','auth']}`). `page.tsx`: copy `app/settings/password/page.tsx` with `redirect('/sign-in?next=/profile')` and `<ProfileClient />`. `page-client.tsx`: `HudPage width="md"`, header title/subtitle, a `HudPanel` with `AvatarEditor` (large `UserAvatar size-24`, name, email) and a second `HudPanel` listing `PROFILE_MENU` (`Link` rows / `button` rows, same icons and labels as the dropdown). While `useSessionUser()` is `null` show `LoadingState`.

- [ ] **Step 4:** PASS; add `pnpm exec eslint --fix app/profile components/profile` and the i18n key tests (`pnpm test:related messages/en/common.json` — the repo checks both locales have identical keys). **Step 5:** commit `feat(profile): /profile hub page with avatar change/remove`.

---

### Task 6: What's new, docs, end-of-branch checks, live verification

**Files:**
- Modify: `lib/onboarding/whats-new.ts` (add `{ id: '2026-11-19-profile-avatar', date: '2026-11-19', audience: 'all', href: '/profile' }` at the top of `CORE_WHATS_NEW`), `messages/{uk,en}/whatsNew.json` (`2026-11-19-profile-avatar` with `title`/`body`), `docs/architecture/platform.md` (avatar resolution order, `user-avatars` bucket + ticket flow, `/profile` + `PROFILE_MENU`), `docs/STATUS.md` (feature line: branch, deviations, no prod setup needed since the bucket is created lazily on the first upload), `docs/architecture/onboarding.md` only if it lists entries.
- Move spec and this plan to `docs/archive/superpowers/` only in the merge commit (not now).

- [ ] **Step 1:** add the entry + both locale texts; `pnpm test:related lib/onboarding/whats-new.ts` (the whats-new test checks keys in both locales).
- [ ] **Step 2:** docs edits (Ukrainian, matching surrounding text).
- [ ] **Step 3:** `/simplify` on the branch diff (1–2 agents), then one full `pnpm test:run` and `pnpm cycles`; fix cycles/ratchets (`ratchets/` files only shrink).
- [ ] **Step 4:** push the branch and open the Vercel preview; if the preview is unreachable say so — do not claim done. In the browser (live run via a Sonnet subagent per the global rules): email sign-up shows initials; upload a photo → header and `/profile` update at once; reload keeps it; the object exists under `user-avatars/<userId>/` and only one object remains after a second upload; remove → initials (and Google photo for a Google user); Network tab shows the PUT commit succeeds and a forged URL for another user returns 400; every `/profile` entry works (help, password, preferences, AI keys, switch account, sign out); unauthenticated `/profile` redirects to sign-in; mobile width layout.
- [ ] **Step 5:** commit `docs: profile avatar — whats-new, architecture, status`.

---

## Self-review

- Spec coverage: avatar resolution + utils (T1), upload/remove hook with validation and 256² WebP (T2–T3), bucket (T2, deviation noted), shared avatar component and registry (T4), `/profile` + redirect + dropdown "Profile" item (T4–T5), tests, whats-new, docs, live verification (T6). Subscription deliberately deferred (noted).
- Type names consistent: `SessionUser`, `toSessionUser`, `avatarInitials`, `avatarHue`, `PROFILE_MENU`, `useAvatar`, `useProfileActions`, `createUserAvatarTicket`/`commitUserAvatar`/`removeUserAvatar`.
- Open check for the implementer in T2: confirm `auth.admin.updateUserById` merges `user_metadata` shallowly (does not drop `full_name`/Google fields); if it replaces, read the user first and spread existing metadata.
