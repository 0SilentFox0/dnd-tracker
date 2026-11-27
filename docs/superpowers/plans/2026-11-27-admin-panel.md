# Адмін-панель власника — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` з вкладками Огляд · Юзери · Безпека · Ops: аналітика продукту, керування юзерами (бан, сесії, видалення), виявлення мультиакаунтів.

**Architecture:** Нові таблиці `user_access`, `user_activity_days`, `account_deletions`, `admin_actions`; активність пишеться з `updateSession` (proxy) раз на добу на пристрій. Read-API `/api/admin/*` віддає агрегати SQL; шар `lib/api/admin.ts` → `lib/hooks/admin/` → `components/admin/*`. Ops-дашборд лише переїжджає сторінкою.

**Tech Stack:** Next.js 16 App Router, Prisma 6 + raw SQL, Supabase Admin (`@supabase/supabase-js`), TanStack Query, uPlot (`UplotChart`), next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-admin-panel-design.md` — читати перед кожною задачею.

**Робоча папка:** worktree `../dnd-tracker-admin`, гілка `feat/admin-panel` (від main 25d51ae58). Основну папку не чіпати.

## Global Constraints

- Міграції expand-only; кожен `CREATE TABLE` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`, без політик.
- Доступ: `isAdmin` = `OPS_ADMIN_EMAILS` (email, case-insensitive) або `PLATFORM_ADMIN_USER_IDS`. Не-адмін → 404 на сторінках і API.
- Кожен `/api/admin/*` route: `export const dynamic = 'force-dynamic'`, `requirePlatformAdmin()` першим рядком, `privateJson`, Zod через `parseBody`/`safeParse` query, помилки `{ error }` з `API_ERRORS`, `handleApiError` у catch.
- Компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch` (ESLint); query keys лише з `adminKeys`.
- Без Cyrillic у коді й коментарях (тексти в `messages/{uk,en}/admin.json`); коментарі англійською, мінімальні.
- IP ніколи не логувати; у логах лише `errorName(e)`.
- Ретеншн: `user_access` 180 днів за `lastSeen`, `user_activity_days` 400 днів за `day`.
- Cookie маркера: `cn_seen`, значення `<userId>:<YYYY-MM-DD UTC>`, httpOnly, sameSite lax, secure у prod, `maxAge` до кінця доби UTC.
- Polling у адмінці нема; лише запит при відкритті + «Оновити».
- Тести: агенти пишуть тести й запускають лише свої файли (`pnpm test:run <file>`); повний `pnpm test:run` — один раз у Task 15. Лінт: `pnpm exec eslint --fix <touched files>`, repo-wide lint не запускати.
- Дані до деплою не існують: UI підписує «дані з <дата першого рядка>».

## Review Focus

1. **Локальна БД без схеми `auth`** (prodcopy, CI): списки/картки не мають падати — `banned_until`/`last_sign_in_at` = null, сесії не чіпаються. Тест у Task 9 (`readAuthMeta` повертає порожню мапу, коли `to_regclass` = null) і Task 11 (signout без `auth.sessions` → ok без SQL-помилки).
2. **Дії над самим собою й над іншим адміном**: ban/delete/signout себе → 400 `ADMIN_SELF_ACTION`. Тест у Task 11.
3. **Кілька IP у `x-forwarded-for`, IPv6, сміття в заголовку**: беремо перший валідний, обрізаємо до 45 символів, невалідне → null (пишемо лише активність). Тест у Task 3.
4. **Повторна навігація того ж дня / зміна акаунта в тому ж браузері**: другий запис не робиться; інший `userId` з тим самим cookie-днем → пишемо. Тест у Task 3 (`shouldTouch`) і Task 4 (ідемпотентний upsert, `days` не росте в межах доби).
5. **Видалення, заблоковане шаблонами, з адмінки**: 409 і список блокуючих шаблонів, `account_deletions`/`admin_actions` не пишуться. Тест у Task 11.

---

## Файлова структура

```
app/admin/layout.tsx, page.tsx, overview-client.tsx
app/admin/users/page.tsx, users-client.tsx
app/admin/users/[id]/page.tsx, user-client.tsx
app/admin/campaigns/[id]/page.tsx, campaign-client.tsx
app/admin/security/page.tsx, security-client.tsx
app/admin/ops/page.tsx                      (переїзд app/ops/page.tsx + ops-client.tsx)
app/ops/page.tsx                            (лише redirect)
app/api/admin/overview/route.ts
app/api/admin/users/route.ts, [id]/route.ts, [id]/{ban,unban,signout}/route.ts
app/api/admin/campaigns/[id]/route.ts
app/api/admin/security/route.ts
lib/utils/api/admin-access.ts               (isAdmin; ops-access.ts → re-export)
lib/server/admin/page-guard.ts              (assertAdmin; ops/page-guard re-export)
lib/server/admin/record-activity.ts
lib/server/admin/admin-actions.ts
lib/server/admin/auth-meta.ts
lib/server/admin/auth-admin.ts              (ban/unban/signout)
lib/server/admin/overview.ts
lib/server/admin/users-list.ts, user-detail.ts, campaign-summary.ts
lib/server/admin/security.ts
lib/server/admin/prune.ts
lib/utils/admin/{client-ip,device,seen-cookie,email-hash,series,cohorts,shared-ip}.ts
lib/schemas/admin.ts
types/admin.ts
lib/api/admin.ts
lib/hooks/admin/{keys,index,useAdminOverview,useAdminUsers,useAdminUser,useAdminCampaign,useAdminSecurity,useAdminUserActions}.ts
components/admin/{AdminTabs,KpiTile,OverviewCharts,CohortTable,BreakdownTable,UsersTable,UserFilters,UserHeader,UserCampaigns,UserAccessTable,UserActions,ActivityStrip,CampaignSummary,SharedIpGroups,AdminActionFeed}.tsx
messages/{uk,en}/admin.json
scripts/admin/seed-fake-activity.ts
docs/architecture/admin.md
```

---

# Ч1 — каркас, дані, збір (деплоїти першою)

### Task 1: Доступ `isAdmin`, каркас `/admin`, переїзд Ops

**Files:**
- Create: `lib/utils/api/admin-access.ts`, `lib/server/admin/page-guard.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx` (тимчасово: заголовок + «скоро», замінить Task 8), `app/admin/ops/page.tsx`, `components/admin/AdminTabs.tsx`, `messages/{uk,en}/admin.json`
- Modify: `lib/utils/api/ops-access.ts` (→ `export { isAdmin as isOpsAdmin } from './admin-access'`), `lib/server/ops/page-guard.ts` (→ re-export `assertAdmin as assertOpsAdmin`), `lib/utils/api/require-platform-admin.ts` (імпорт `isAdmin`), `app/ops/page.tsx` (→ `redirect('/admin/ops')` з `next/navigation`, `permanentRedirect`), видалити `app/ops/layout.tsx`, перенести `app/ops/ops-client.tsx` → `app/admin/ops/ops-client.tsx`, `app/robots.ts` (+`'/admin'`), `components/profile/ProfileQuickSettings.tsx` (href `/admin`, ключ `profile.adminLink` в обох `messages/*/profile.json`), `lib/i18n/core-namespaces.ts` (`OPS_NAMESPACES = ['ops', 'admin']`), `app/profile/page.tsx` (імпорт `isAdmin`)
- Test: `app/admin/__tests__/guard.test.tsx` (перенести й розширити `app/ops/__tests__/guard.test.tsx`), `lib/__tests__/` i18n-тест ключів підхопить `admin.json` автоматично — перевірити.

**Interfaces:**
- Produces: `isAdmin(user: { id: string; email: string | null }): boolean`; `assertAdmin(): Promise<void>` (404 через `notFound()`); `AdminTabs` (client, `usePathname`, items: overview `/admin`, users `/admin/users`, security `/admin/security`, ops `/admin/ops`; active = точний збіг для `/admin`, `startsWith` для інших).

- [ ] Step 1: Перенести guard-тест у `app/admin/__tests__/guard.test.tsx`, імпортувати `assertAdmin`; додати кейс robots: `disallow` містить `/admin`; кейс `app/ops/page.tsx` викликає `permanentRedirect('/admin/ops')` (mock `next/navigation`). Запустити — FAIL.
- [ ] Step 2: Реалізувати `admin-access.ts` (тіло з `ops-access.ts`), re-exports, `assertAdmin`.
- [ ] Step 3: `app/admin/layout.tsx`: `metadata` (`title: 'Admin'`, `robots: { index: false, follow: false }`), `dynamic = 'force-dynamic'`, `await assertAdmin()`, `<LocaleScope namespaces={['common', 'admin', 'ops']}>`, всередині `HudPage` з `HudPageHeader` (`t('title')`) і `<AdminTabs />` над `children`. `ops-client.tsx` прибрати власні `HudPage`/header, лишити `TestNotifyButton` у верхньому рядку вкладки.
- [ ] Step 4: Кожна сторінка `/admin/**` першим рядком `await assertAdmin()` (правило ops.md: layout і page паралельні).
- [ ] Step 5: `admin.json` (uk/en): `title`, `tabs.{overview,users,security,ops}`, `dataSince` («Дані з {date}» / «Data since {date}»), `common.{refresh,na,none}`. Решту ключів додають наступні задачі.
- [ ] Step 6: Тести guard + i18n keys PASS; `pnpm exec eslint --fix` по змінених файлах; `pnpm exec tsc --noEmit -p .` (довго — один раз тут).
- [ ] Step 7: Commit `feat(admin): admin shell with tabs, ops moved to /admin/ops`.

### Task 2: Міграція й моделі

**Files:**
- Create: `prisma/migrations/20261227000000_admin_panel/migration.sql`
- Modify: `prisma/schema/core.prisma` (4 моделі + зворотні relation-поля в `User`: `access UserAccess[]`, `activityDays UserActivityDay[]`)
- Test: `prisma/__tests__/` — якщо є тест «кожна таблиця має RLS», він має пройти.

**Interfaces — Produces (Prisma):**
```prisma
model UserAccess {
  userId    String
  ip        String
  country   String?
  device    String?
  firstSeen DateTime @default(now())
  lastSeen  DateTime @default(now())
  days      Int      @default(1)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, ip])
  @@index([ip])
  @@index([lastSeen])
  @@map("user_access")
}
model UserActivityDay {
  userId String
  day    DateTime @db.Date
  user   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, day])
  @@index([day])
  @@map("user_activity_days")
}
model AccountDeletion {
  id             String   @id @default(cuid())
  deletedAt      DateTime @default(now())
  by             String   // 'self' | 'admin'
  accountAgeDays Int
  campaigns      Int
  emailHash      String?
  @@index([deletedAt])
  @@index([emailHash])
  @@map("account_deletions")
}
model AdminAction {
  id           String   @id @default(cuid())
  at           DateTime @default(now())
  adminUserId  String
  action       String   // 'ban' | 'unban' | 'signout' | 'delete'
  targetUserId String
  meta         Json     @default("{}")
  @@index([targetUserId, at])
  @@index([at])
  @@map("admin_actions")
}
```
(Коментарі `// 'self' | 'admin'` у schema — англійські, ок.)

- [ ] Step 1: Додати моделі, `pnpm exec prisma migrate dev --name admin_panel --create-only`, перейменувати теку на `20261227000000_admin_panel` (порядок після `20261226000000_battle_map_art`), дописати 4 рядки `ENABLE ROW LEVEL SECURITY`.
- [ ] Step 2: `pnpm exec prisma migrate dev` на локальній БД; `pnpm exec prisma generate`.
- [ ] Step 3: Запустити тести з `prisma/__tests__/` (RLS/міграції) — PASS.
- [ ] Step 4: Commit `feat(admin): access, activity, deletion and admin action tables`.

### Task 3: Pure-утиліти збору

**Files:**
- Create: `lib/utils/admin/client-ip.ts`, `device.ts`, `seen-cookie.ts`, `email-hash.ts`
- Test: `lib/utils/admin/__tests__/{client-ip,device,seen-cookie,email-hash}.test.ts`

**Interfaces — Produces:**
- `parseClientIp(h: { get(name: string): string | null }): string | null` — перший елемент `x-forwarded-for` (trim), інакше `x-real-ip`; валідація `net.isIP(v) !== 0` (з `node:net`; файл серверний — не імпортувати з клієнта); `> 45` символів → null.
- `parseCountry(h): string | null` — `x-vercel-ip-country`, лише `/^[A-Z]{2}$/`.
- `parseDevice(ua: string | null): string | null` — `"<Browser> · <OS>"`; браузери: Edge (`Edg/`), Opera (`OPR/`), Chrome, Firefox, Safari (Safari без Chrome), інакше `Other`; ОС: iOS (`iPhone|iPad`), Android, Windows, macOS (`Mac OS X`), Linux, інакше `Other`; null/порожній → null. Без бібліотек.
- `SEEN_COOKIE = 'cn_seen'`; `utcDay(now: Date): string` (`YYYY-MM-DD`); `seenValue(userId, now)`; `shouldTouch(cookie: string | undefined, userId: string, now: Date): boolean` (= `cookie !== seenValue(userId, now)`); `secondsUntilUtcMidnight(now): number` (≥ 60).
- `hashEmail(email: string, secret: string | undefined): string | null` — HMAC-SHA256 hex від `email.trim().toLowerCase()`; без секрету → null (`node:crypto`).

- [ ] Step 1: Тести: XFF `"203.0.113.5, 10.0.0.1"` → `203.0.113.5`; IPv6 `"2001:db8::1"` ок; `"garbage"` → null; лише `x-real-ip` → він; нічого → null. Country `"UA"` ок, `"ua"`/`"XX1"` → null. UA: Chrome на Windows, Safari на iPhone, Edge на macOS, Firefox Linux, null. `shouldTouch`: undefined → true; той самий день+user → false; той самий день, інший user → true; вчорашній → true; `secondsUntilUtcMidnight` о 23:59:30 → 60. `hashEmail(' A@B.com ', 's') === hashEmail('a@b.com','s')`; без секрету → null.
- [ ] Step 2: FAIL → реалізація → PASS.
- [ ] Step 3: Commit `feat(admin): pure helpers for client ip, device, seen cookie, email hash`.

### Task 4: Запис активності з proxy

**Files:**
- Create: `lib/server/admin/record-activity.ts`
- Modify: `lib/supabase/middleware.ts` (у `updateSession` після `getClaims`, перед `return supabaseResponse`)
- Test: `lib/server/admin/__tests__/record-activity.integration.test.ts` (локальна БД, за зразком `lib/server/account/__tests__/delete-account.integration.test.ts`), `lib/supabase/__tests__/` — тест middleware на cookie (знайти наявний тест `updateSession`; якщо нема — створити `middleware-touch.test.ts` з mock `@supabase/ssr`).

**Interfaces:**
- Consumes: Task 3 утиліти, моделі Task 2.
- Produces: `recordActivity(input: { userId: string; ip: string | null; country: string | null; device: string | null; now?: Date }): Promise<void>` — ніколи не кидає (catch → `console.warn('[admin] activity write failed', errorName(e))`).

SQL (raw, один round trip на таблицю):
```sql
INSERT INTO user_activity_days ("userId", day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING;
INSERT INTO user_access AS a ("userId", ip, country, device, "firstSeen", "lastSeen", days)
VALUES ($1, $3, $4, $5, $6, $6, 1)
ON CONFLICT ("userId", ip) DO UPDATE SET
  "lastSeen" = EXCLUDED."lastSeen",
  country = COALESCE(EXCLUDED.country, a.country),
  device = COALESCE(EXCLUDED.device, a.device),
  days = a.days + CASE WHEN a."lastSeen"::date < EXCLUDED."lastSeen"::date THEN 1 ELSE 0 END;
```
Другий insert — лише коли `ip` не null. Обидва в `prisma.$transaction([...])` не потрібні — незалежні. Юзера ще нема в `users` (FK) → помилка ловиться, cookie все одно ставимо (наступного дня спробує знову).

Middleware (лише навігації сторінок, `user` не null, не `/api`, не `SIGN_OUT_PATH` — ці гілки вже вийшли раніше):
```ts
const seen = request.cookies.get(SEEN_COOKIE)?.value;
if (user && shouldTouch(seen, user, new Date())) {
    const now = new Date();
    const task = import('@/lib/server/admin/record-activity').then((m) =>
        m.recordActivity({ userId: user, ip: parseClientIp(request.headers), country: parseCountry(request.headers), device: parseDevice(request.headers.get('user-agent')), now })
    );
    waitUntil(task); // from '@vercel/functions'; outside Vercel it is a no-op and the promise still runs
    supabaseResponse.cookies.set(SEEN_COOKIE, seenValue(user, now), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: secondsUntilUtcMidnight(now) });
}
```
Важливо: cookie ставити на фінальний `supabaseResponse` (після `setAll` він перестворюється). Також для редиректу `/sign-in` → `/campaigns` не пишемо (повертається раніше — ок). Динамічний import тримає Prisma поза гарячим шляхом proxy; після реалізації перевірити `pnpm build` (Task 15) — proxy має збиратися.

- [ ] Step 1: Інтеграційний тест: два виклики в один день → 1 рядок `user_activity_days`, `user_access.days = 1`; виклик наступного дня (`now` +1d) → `days = 2`, 2 рядки днів; `ip: null` → лише день; неіснуючий `userId` → не кидає.
- [ ] Step 2: Тест middleware: залогінений, без cookie → відповідь має `cn_seen`, `recordActivity` викликано один раз (mock модуля); з актуальним cookie → не викликано; `/api/x` → не викликано.
- [ ] Step 3: FAIL → реалізація → PASS.
- [ ] Step 4: Додати в `app/(legal)/cookies` (і `messages/*/legal.json`) рядок про `cn_seen` (технічна, до кінця доби, без трекінгу третіх сторін); у `legal.json` → `privacy` «Technical data» дописати речення: «We keep the IP address, approximate country and browser/OS type of signed-in visits for 180 days to protect accounts against abuse and multi-account fraud.» (+ uk переклад).
- [ ] Step 5: Commit `feat(admin): record daily activity and access from the proxy`.

### Task 5: `account_deletions`, `admin_actions`, prune

**Files:**
- Create: `lib/server/admin/admin-actions.ts`, `lib/server/admin/prune.ts`
- Modify: `lib/server/account/delete-account.ts`, `app/api/ops/collect/route.ts` (або місце, де викликається `rollupAndPrune` — викликати `pruneAdminData` поруч, той самий годинний крок)
- Test: `lib/server/account/__tests__/delete-account.integration.test.ts` (+кейси), `lib/server/admin/__tests__/prune.integration.test.ts`

**Interfaces — Produces:**
- `deleteAccount(userId, deps?, opts?: { by?: 'self' | 'admin' })` — default `'self'`. Усередині транзакції перед `tx.user.deleteMany`: прочитати `createdAt`, `email` юзера; `tx.accountDeletion.create({ data: { by, accountAgeDays: floor((now - createdAt)/DAY_MS), campaigns: owned.length, emailHash: hashEmail(email, process.env.ADMIN_HASH_SECRET) } })`. Юзера в `users` нема (вже видалений/не існує) → не писати.
- `logAdminAction(input: { adminUserId: string; action: 'ban' | 'unban' | 'signout' | 'delete'; targetUserId: string; meta?: Record<string, unknown> }, db = prisma): Promise<void>`.
- `pruneAdminData(now = new Date()): Promise<void>` — `deleteMany` `user_access` з `lastSeen < now-180d`, `user_activity_days` з `day < now-400d`.

- [ ] Step 1: Тести: самовидалення → 1 рядок `account_deletions` з `by='self'`, `campaigns` = кількість власних, `emailHash` з секретом (stubEnv) / null без; `opts.by='admin'` → `'admin'`; блокування шаблоном → рядків нема. Prune: рядок 181 д тому видаляється, 179 д — лишається; день 401 д — видаляється.
- [ ] Step 2: FAIL → реалізація → PASS.
- [ ] Step 3: Commit `feat(admin): deletion log, admin action log, retention prune`.

---

# Ч2 — Огляд

### Task 6: Pure-аналітика

**Files:**
- Create: `lib/utils/admin/series.ts`, `lib/utils/admin/cohorts.ts`
- Test: `lib/utils/admin/__tests__/{series,cohorts}.test.ts`

**Interfaces — Produces:**
- `type DayCount = { day: string; n: number }` (`day` = `YYYY-MM-DD`).
- `fillDays(rows: DayCount[], from: string, to: string): number[]` — по одному значенню на день включно, пропуски = 0.
- `dayRange(from: string, to: string): string[]`.
- `rollingDistinct(activity: { day: string; userId: string }[], days: string[], window: number): number[]` — для кожного дня кількість унікальних юзерів у `[day-window+1, day]` (WAU=7, MAU=30).
- `delta(current: number, previous: number): number | null` — відносна зміна, `previous = 0` → null.
- `cohortRetention(signups: { userId: string; createdAt: string }[], activity: { userId: string; day: string }[], weeks: number[] /* [1,2,4] */, today: string): { cohortWeek: string; size: number; rates: (number | null)[] }[]` — когорта = понеділок тижня реєстрації (UTC); `rate[w]` = частка юзерів когорти, активних у тиждень `w` після реєстраційного; тиждень у майбутньому → null.

- [ ] Step 1: Тести: `fillDays` з пропуском; `rollingDistinct` — юзер активний у день 1 рахується в WAU днів 1–7, не в день 8; `delta(10,5)=1`, `delta(1,0)=null`; когорти — 2 юзери тижня W, один активний у W+1 → `rates[0]=0.5`; тиждень W+4 після `today` → null.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): pure series and cohort math`.

### Task 7: Overview API + клієнтський шар

**Files:**
- Create: `lib/schemas/admin.ts`, `types/admin.ts`, `lib/server/admin/overview.ts`, `app/api/admin/overview/route.ts`, `lib/api/admin.ts`, `lib/hooks/admin/{keys,index,useAdminOverview}.ts`
- Test: `app/api/admin/__tests__/overview-route.test.ts` (mock `buildOverview`, перевірити 404 не-адміну, 400 на `range=1y`), `lib/server/admin/__tests__/overview.integration.test.ts` (сід 3 юзерів, 1 видалення, активності — числа плиток)

**Interfaces — Produces:**
- `adminRangeSchema = z.enum(['7d','30d','90d'])`.
- `type AdminOverview = { range: AdminRange; dataSince: string | null; tiles: { usersTotal: number; usersNew: Tile; usersDeleted: Tile; netGrowth: number; dau: number; wau: number; mau: number; stickiness: number | null; campaignsTotal: number; campaignsNew: Tile; templatesTotal: number; battles: Tile; withAiKey: number; activationRate: number | null }; series: { days: string[]; signups: number[]; deletions: number[]; usersTotal: number[]; dau: number[]; wau: number[]; mau: number[]; campaigns: number[]; battles: number[]; characters: number[] }; cohorts: ReturnType<typeof cohortRetention>; breakdowns: { locale: Row[]; system: Row[]; country: Row[] } }`, де `Tile = { value: number; delta: number | null }`, `Row = { key: string; n: number }`.
- `buildOverview(range: AdminRange, now = new Date()): Promise<AdminOverview>`.
- `getAdminOverview(range)` у `lib/api/admin.ts`; `adminKeys = { all: ['admin'], overview: (r) => ['admin','overview',r], users: (p) => ['admin','users',p], user: (id) => ['admin','user',id], campaign: (id) => ['admin','campaign',id], security: (d) => ['admin','security',d] } as const`; `useAdminOverview(range)` — `staleTime: Infinity`, без `refetchInterval`, `refetchOnWindowFocus: false`; рефреш = `refetch()`.

Запити в `buildOverview` (усі `$queryRaw`, у `Promise.all`):
- щоденні counts `date_trunc('day', "createdAt")` для `users`, `campaigns` (`kind`), `battle_scenes`, `characters`, `account_deletions."deletedAt"` за `[from - range, now]` (подвійне вікно для дельти);
- `user_activity_days` за `max(range, 30d) + 30d` (для MAU) → `rollingDistinct`;
- `usersTotal` по днях = total зараз − кумулятив реєстрацій після дня + кумулятив видалень після дня (рахувати в TS);
- `withAiKey` = `count(distinct "userId") from ai_credentials`;
- activation = юзери, зареєстровані в періоді, у яких є `campaigns.dmUserId` або `campaign_members.userId` з `createdAt <= users.createdAt + 7d` (у `campaign_members` використати її `createdAt`/`joinedAt` — перевірити назву поля в схемі);
- cohorts: реєстрації за 12 тижнів + активність за той же період;
- breakdowns: `users.locale` (null → `'none'`), `campaigns.rules->'system'->>'key'` (null → `'none'`), `user_access.country` за 30 днів (distinct userId);
- `dataSince` = `min(day) from user_activity_days`.

- [ ] Step 1: Тести роуту й інтеграції (сід: юзер A створений 40 д тому активний сьогодні й вчора, B створений 3 д тому з кампанією через 1 д → activation, C 10 д тому; 1 `account_deletions` 2 д тому). Очікування для `range=7d`: `usersNew.value=1`, `usersDeleted.value=1`, `dau=1`, `activationRate=1`.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): overview api and hooks`.

### Task 8: Overview UI

**Files:**
- Create: `app/admin/page.tsx` (замінити заглушку: `assertAdmin`, `buildOverview('30d')` → `PrefetchedQuery queryKey={adminKeys.overview('30d')}`), `app/admin/overview-client.tsx`, `components/admin/{KpiTile,OverviewCharts,CohortTable,BreakdownTable}.tsx`
- Modify: `messages/{uk,en}/admin.json` (`overview.*`)
- Test: `components/admin/__tests__/KpiTile.test.tsx` (happy-dom: дельта `+12%` зелена, `null` → без дельти), `app/admin/__tests__/overview-client.test.tsx` (рендер без сирих ключів з фікстурою `AdminOverview`)

Поведінка: `HudSegmented` 7/30/90 днів; «Оновити» (`HudButton`) → `refetch`; рядок `dataSince`; плитка «Дохід» — статична «Не підключено». Графіки через наявний `UplotChart` (`next/dynamic`, `ssr: false` — як у `components/ops/OpsChartGroup`): (1) signups ↑ / deletions ↓ (deletions як від'ємні значення) + usersTotal на правій осі; (2) dau/wau/mau; (3) campaigns/battles/characters. `CohortTable` — відсотки, null → «—». Мобільна ширина: плитки `grid-cols-2`, таблиці з `overflow-x-auto`.

- [ ] Step 1: Тести → FAIL → реалізація → PASS; eslint на файли.
- [ ] Step 2: Commit `feat(admin): overview tab`.

---

# Ч3 — Юзери

### Task 9: Список юзерів

**Files:**
- Create: `lib/server/admin/auth-meta.ts`, `lib/server/admin/users-list.ts`, `app/api/admin/users/route.ts`, `lib/hooks/admin/useAdminUsers.ts`
- Modify: `lib/schemas/admin.ts`, `types/admin.ts`, `lib/api/admin.ts`, `lib/hooks/admin/index.ts`
- Test: `lib/server/admin/__tests__/auth-meta.test.ts` (mock prisma), `lib/server/admin/__tests__/users-list.integration.test.ts`, `app/api/admin/__tests__/users-route.test.ts`

**Interfaces — Produces:**
- `readAuthMeta(ids: string[]): Promise<Map<string, { bannedUntil: string | null; lastSignInAt: string | null }>>` — спершу `SELECT to_regclass('auth.users') IS NOT NULL AS ok` (кешувати результат у модульній змінній), потім `SELECT id::text, banned_until, last_sign_in_at FROM auth.users WHERE id = ANY($1::uuid[])`. Нема схеми або помилка → порожня мапа (`console.warn` з `errorName`).
- `adminUsersQuerySchema = z.object({ q: z.string().trim().max(100).optional(), sort: z.enum(['created','active','campaigns']).default('created'), filter: z.enum(['all','banned','sharedIp','inactive','noCampaigns','aiKey']).default('all'), cursor: z.string().optional() })`.
- `type AdminUserRow = { id; email; displayName; avatar: string | null; createdAt: string; lastActiveAt: string | null; lastSignInAt: string | null; bannedUntil: string | null; campaignsDm: number; templates: number; memberships: number; characters: number; country: string | null; sharedIp: boolean; subscription: null }`; відповідь `{ rows: AdminUserRow[]; next: string | null; authMetaAvailable: boolean }`.
- `listAdminUsers(query): Promise<...>` — один `$queryRaw` з CTE: агрегати по `campaigns` (kind), `campaign_members`, `characters` (`controlledBy`), `max(day)` з `user_activity_days`, остання країна з `user_access`, `sharedIp` = `EXISTS (SELECT 1 FROM user_access a2 WHERE a2.ip = a.ip AND a2."userId" <> u.id AND a2."lastSeen" > now() - interval '30 days')`. Пошук `ILIKE` по `email`, `"displayName"`, точний по `id`. Пагінація: `LIMIT 51`, курсор = base64url JSON `{ v: <sort value>, id }` (keyset `(sortValue, id) < (...)`), sort `active` — `NULLS LAST`. Фільтр `banned` — після `readAuthMeta` неможливо в SQL; тому для `banned` обирати кандидатів з `auth.users WHERE banned_until > now()` (якщо схема є; інакше порожній результат). `inactive` = `lastActiveAt` null або < now-30d.
- `useAdminUsers(query)` — `placeholderData: keepPreviousData`, `useInfiniteQuery` з `next`.

- [ ] Step 1: Тести: `readAuthMeta` з `to_regclass` false → порожня мапа й без другого запиту; список — пошук по частині email, сортування `campaigns`, пагінація (сід 55 юзерів → 50 + `next`, друга сторінка 5), `sharedIp` true для двох юзерів зі спільним IP за 30 д і false, якщо IP старший; роут — 404 не-адміну, 400 на `sort=x`.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): users list api`.

### Task 10: Картка юзера та зведення кампанії (API)

**Files:**
- Create: `lib/server/admin/user-detail.ts`, `lib/server/admin/campaign-summary.ts`, `app/api/admin/users/[id]/route.ts` (GET), `app/api/admin/campaigns/[id]/route.ts`, `lib/hooks/admin/{useAdminUser,useAdminCampaign}.ts`
- Modify: types/api/hooks index
- Test: `lib/server/admin/__tests__/{user-detail,campaign-summary}.integration.test.ts`, роут-тест 404 для неіснуючого id і не-адміна

**Interfaces — Produces:**
- `type AdminUserDetail = { user: AdminUserRow & { locale: string | null; timeZone: string | null }; owned: { id; name; kind; system: string | null; players: number; createdAt; updatedAt }[]; joined: { id; name; dm: { id; displayName } }[]; templates: { id; name; versions: number; clones: number; blocksDeletion: boolean }[]; activityDays: string[] /* last 90 */; access: { ip; country; device; firstSeen; lastSeen; days; otherAccounts: { id; displayName; email }[] }[]; actions: { at; action; adminUserId; meta }[] }`.
- `getAdminUserDetail(id): Promise<AdminUserDetail | null>`; `blocksDeletion` через `findBlockingTemplates(id)` (повертає id блокуючих шаблонів).
- `type AdminCampaignSummary = { id; name; kind; status; system: string | null; createdAt; updatedAt; owner: { id; displayName; email }; members: { id; displayName; role: string }[]; counts: { characters; battles; maps; scenarioPages; units; spells }; storageBytes: number | null; template: { versions: number; clones: number } | null }`.
- `getAdminCampaignSummary(id)`. `storageBytes`: перевикористати лістинг із `lib/server/account/storage-cleanup.ts` — винести з нього pure-функцію/функцію лістингу префіксів кампанії, якщо вона там є; якщо підрахунок розміру вимагає нових Storage-запитів на кожен файл — повертати `null` і не робити (YAGNI). Версії шаблону й клони — з тих самих полів, що `template-guard.ts` (`createdFromId`, `baseSourceId`, `sourceSync`) і моделі версій шаблону (знайти `TemplateVersion`/`publish` у `lib/server/campaigns/template`).

- [ ] Step 1: Тести: юзер з 1 кампанією, 1 шаблоном з чужим клоном (`blocksDeletion: true`), участю в чужій кампанії, 2 IP, один з яких спільний з іншим юзером (`otherAccounts` = 1); неіснуючий → null → 404. Зведення: лічильники відповідають сіду.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): user detail and campaign summary api`.

### Task 11: Дії: ban / unban / signout / delete

**Files:**
- Create: `lib/server/admin/auth-admin.ts`, `app/api/admin/users/[id]/{ban,unban,signout}/route.ts`, DELETE у `app/api/admin/users/[id]/route.ts`, `lib/hooks/admin/useAdminUserActions.ts`
- Modify: `lib/constants/api-errors.ts` (`ADMIN_SELF_ACTION: 'errors.adminSelfAction'`, `ADMIN_AUTH_UNAVAILABLE: 'errors.adminAuthUnavailable'`) + тексти в `messages/*/errors.json` (знайти namespace, де лежить `errors.accountDeleteBlocked`), `lib/schemas/admin.ts`
- Test: `app/api/admin/__tests__/user-actions-route.test.ts`, `lib/server/admin/__tests__/auth-admin.test.ts`

**Interfaces — Produces:**
- `banUser(id, hours: 24 | 168 | 876000, deps?)`, `unbanUser(id, deps?)`, `signOutUser(id, deps?)` — `deps.client` за замовчуванням `createAdminClient()`; `createAdminClient` кидає без env → обгорнути в `AdminAuthUnavailableError`. Ban = `auth.admin.updateUserById(id, { ban_duration: \`${hours}h\` })`, потім `signOutUser`. Unban = `ban_duration: 'none'`. SignOut = `prisma.$executeRaw\`DELETE FROM auth.sessions WHERE user_id = ${id}::uuid\`` під тією ж перевіркою `to_regclass('auth.sessions')` (нема → no-op). Помилка Supabase → `AdminAuthUnavailableError`.
- Схеми: `banSchema = z.object({ hours: z.union([z.literal(24), z.literal(168), z.literal(876000)]) })`; `adminDeleteSchema = z.object({ email: z.string().email() })`.
- Роут-логіка (спільний хелпер `lib/server/admin/run-user-action.ts`, якщо дублюється): `requirePlatformAdmin` → `id === auth.userId` → 400 `ADMIN_SELF_ACTION` → юзер існує (`prisma.user.findUnique`) інакше 404 → дія → `logAdminAction` → `privateJson({ ok: true })`. `AdminAuthUnavailableError` → 503 `ADMIN_AUTH_UNAVAILABLE`, лог дії не пишеться. DELETE: `email` ≠ email юзера → 400 `ACCOUNT_EMAIL_MISMATCH`; `deleteAccount(id, {}, { by: 'admin' })`; `AccountDeleteBlockedError` → 409 `ACCOUNT_DELETE_BLOCKED` з `templateIds` у відповіді (`errorResponse` приймає extra? якщо ні — `NextResponse.json({ error, templateIds }, { status: 409 })`); `logAdminAction` з `meta: { email }` ПІСЛЯ успіху.
- Хук: `useAdminUserActions(id)` → `{ ban, unban, signOut, remove }` (mutations), `onSuccess` інвалідує `adminKeys.user(id)` і `adminKeys.all` для списку; `remove` після успіху — `router.push('/admin/users')` робить компонент.

- [ ] Step 1: Тести: self-action на кожен з 4 → 400; не-адмін → 404; ban без env → 503 і `admin_actions` порожній; ban ок → `updateUserById` з `'168h'`, signout викликано, 1 рядок `admin_actions`; signout без `auth.sessions` → ok; delete з неправильним email → 400; delete заблокований → 409 + `templateIds`, `account_deletions` і `admin_actions` порожні; delete ок → `deleteAccount` викликано з `{ by: 'admin' }`.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): ban, unban, sign out and delete user actions`.

### Task 12: Users UI

**Files:**
- Create: `app/admin/users/{page,users-client}.tsx`, `app/admin/users/[id]/{page,user-client}.tsx`, `app/admin/campaigns/[id]/{page,campaign-client}.tsx`, `components/admin/{UsersTable,UserFilters,UserHeader,UserCampaigns,UserAccessTable,UserActions,ActivityStrip,CampaignSummary}.tsx`
- Modify: `messages/{uk,en}/admin.json` (`users.*`, `user.*`, `campaign.*`, `actions.*`)
- Test: `components/admin/__tests__/UserActions.test.tsx` (happy-dom: delete-кнопка підтвердження неактивна, доки введений email не збігається; підпис «набуде чинності протягом години» видно в діалозі бану; кнопок нема для власного id), `app/admin/__tests__/users-client.test.tsx` (рядок «спільний IP» бейдж, «—» у колонці підписки, «n/a» коли `authMetaAvailable=false`)

Поведінка: пошук з debounce 300 мс (знайти наявний `useDebounce`/`useDebouncedValue` у `lib/hooks` — не писати новий), `HudSegmented`/select для sort і filter, «Показати ще» для `next`. Таблиця на мобільному: `overflow-x-auto`, перша колонка sticky. Картка: секції через `HudPanel` + `HudSectionTitle`; IP-таблиця з посиланнями на інші акаунти; кампанії → `/admin/campaigns/[id]`; `ActivityStrip` — 90 клітинок (CSS grid, без uPlot). Діалоги — `ConfirmDialog` з `components/ui/confirm-dialog.tsx`; delete-діалог з полем email (`components/ui/input`). Помилка 409 → список блокуючих шаблонів з назвами з `detail.templates`. Сторінки prefetch-ять через `PrefetchedQuery` (`getAdminUserDetail`, `getAdminCampaignSummary`; null → `notFound()`).

- [ ] Step 1: Тести → FAIL → реалізація → PASS; eslint.
- [ ] Step 2: Commit `feat(admin): users tab, user card, campaign summary`.

---

# Ч4 — Безпека

### Task 13: Security API

**Files:**
- Create: `lib/utils/admin/shared-ip.ts`, `lib/server/admin/security.ts`, `app/api/admin/security/route.ts`, `lib/hooks/admin/useAdminSecurity.ts`
- Modify: schemas/types/api/hooks index
- Test: `lib/utils/admin/__tests__/shared-ip.test.ts`, `lib/server/admin/__tests__/security.integration.test.ts`, роут-тест (404, 400 `days=5`)

**Interfaces — Produces:**
- `groupSharedIps(rows: { ip; userId; country; device; days: string[] }[], minAccounts = 2, crowdAt = 5): { ip; country: string | null; accounts: { userId; device; days: number }[]; sharedDays: number; crowd: boolean }[]` — sharedDays = кількість днів, коли ≥ 2 акаунти групи були активні (через перетин `user_activity_days`); сортування за `accounts.length` desc, потім `sharedDays` desc.
- `adminSecurityQuerySchema = z.object({ days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30) })`.
- `type AdminSecurity = { days; groups: ReturnType<typeof groupSharedIps> & { accounts: { displayName; email }[] }; reRegistrations: { userId; displayName; email; createdAt; deletedAt }[]; actions: { at; action; adminUserId; targetUserId; meta }[] }` (accounts збагачуються іменами/email).
- `buildSecurity(days)`: SQL — IP з `count(distinct "userId") >= 2` за `lastSeen > now - days`; дні активності цих юзерів за період; `reRegistrations`: для кожного юзера з `createdAt > account_deletions.deletedAt` порівняти `hashEmail(email)` з `account_deletions.emailHash` (хешувати в TS юзерів, створених після найстарішого видалення; без `ADMIN_HASH_SECRET` → порожній список); останні 50 `admin_actions`.

- [ ] Step 1: Тести pure: 3 акаунти на IP → група з 3, `crowd` false; 5 → `crowd` true; 1 акаунт → не група; sharedDays рахує лише дні з ≥ 2. Інтеграція: видалений email + нова реєстрація з тим самим email (секрет застаблений) → 1 `reRegistrations`.
- [ ] Step 2: FAIL → реалізація → PASS. Commit `feat(admin): security api (shared ips, re-registrations, actions)`.

### Task 14: Security UI

**Files:**
- Create: `app/admin/security/{page,security-client}.tsx`, `components/admin/{SharedIpGroups,AdminActionFeed}.tsx`
- Modify: `messages/{uk,en}/admin.json` (`security.*`)
- Test: `app/admin/__tests__/security-client.test.tsx` (мітка «ймовірно NAT/VPN» для `crowd`, порожні стани для всіх трьох секцій, посилання на `/admin/users/[id]`)

- [ ] Step 1: Тести → FAIL → реалізація → PASS; eslint. Commit `feat(admin): security tab`.

### Task 15: Сід, документація, ворота, live-перевірка

**Files:**
- Create: `scripts/admin/seed-fake-activity.ts` (за зразком `scripts/ops/seed-fake-metrics.ts`: відмовляє, якщо хост не `localhost`/`127.0.0.1`; для 20 наявних юзерів генерує 60 днів активності, IP з 3 спільними групами, 3 `account_deletions`, 5 `admin_actions`; `--clean` лише чистить 4 таблиці), `docs/architecture/admin.md`
- Modify: `docs/architecture/README.md` (рядок admin), `docs/architecture/ops.md` (розділ Dashboard: шлях `/admin/ops`, доступ `isAdmin`), `docs/STATUS.md`, `package.json` (скрипт `admin:seed` за прикладом ops)

- [ ] Step 1: Сід-скрипт + запуск на локальній БД.
- [ ] Step 2: `docs/architecture/admin.md` (англійською, як ops.md): таблиці й ретеншн, збір у proxy (cookie, динамічний import, `waitUntil`), API-перелік, дії та обмеження JWT ≤ 1 год, `auth`-схема з фолбеком, env `ADMIN_HASH_SECRET`, «Extending».
- [ ] Step 3: Ворота: `pnpm exec tsc --noEmit`, `pnpm test:run` (повний, один раз), `pnpm cycles`, `pnpm lint:dirs --changed main`, `pnpm build` (proxy збирається з динамічним import).
- [ ] Step 4: Live (субагент Sonnet, `next start`, локальна БД із сідом, Chrome-розширення): вкладки без сирих ключів і помилок консолі; `/ops` → `/admin/ops`; не-адмін → 404 на `/admin` і `/api/admin/users`; перемикання 7/30/90; пошук/фільтри/пагінація юзерів; картка → зведення кампанії; бан тестового юзера (локально без service key очікувано 503 з текстом помилки), delete тестового юзера; вкладка Безпека з групами; ширина 390 px без горизонтального скролу сторінки. Після кожного кроку — рядок у таблиці прогресу.
- [ ] Step 5: Commit `docs(admin): architecture, status, seed script`.
- [ ] Step 6 (після мерджу й деплою, з власником): на проді перевірити read-only, що `auth.users` читається (`authMetaAvailable: true` у `/api/admin/users`), що `user_activity_days` наповнюється; задати `ADMIN_HASH_SECRET` у Vercel (`openssl rand -base64 32`); бан/розбан тестового акаунта.
