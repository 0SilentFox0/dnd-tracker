# Сповіщення «нове» (частина B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Гравець отримує тост і золотистий піл «new», коли отримав рівень, предмет, заклинання (і пізніше — знайомство); непрочитані зберігаються в БД, live-оновлення через Pusher.

**Architecture:** Таблиця `player_notifications` (одна непрочитана/прочитана подія на `userId+type+refId`), серверний модуль `lib/server/notifications` (`notifyPlayers` / `notifyCharacterOwners` / `notifyCampaignPlayers`) пише рядки й шле Pusher-сигнал «змінилось» на приватний канал `private-notify-<userId>`; клієнт лише інвалідує ключ запиту. Події виводяться чистими функціями з `lib/utils/notifications` у трьох наявних точках запису (`writeInventoryLog`, `level-up.ts`, `patch.ts`). UI: `useToasts` + `ToastHost` + `NewPill` (на `HudPill tone="gold"`), `NotificationsHost` у новому `app/campaigns/[id]/layout.tsx`.

**Tech Stack:** Next.js 16 App Router, Prisma 6 / PostgreSQL, Pusher (`lib/pusher/*`), TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-acquaintances-design.md` (розділи «Рішення», «Дані», «Частина B»).

## Global Constraints

- Міграція expand-only; `CREATE TABLE` + `ALTER TABLE "player_notifications" ENABLE ROW LEVEL SECURITY` (тест `prisma/__tests__/migrations-rls.test.ts`).
- Типи подій рівно чотири: `level` | `item` | `spell` | `acquaintance`.
- Сповіщення лише гравцям (не DM; не автору дії).
- Тост закривається/ігнорується без впливу на «прочитано»; прочитаним стає лише при відкритті цільового місця (`POST …/notifications/read` за типом/`refId`). Повторно в сесії тост не показується (`sessionStorage`).
- Retention: прочитані видаляються через 30 днів у наявному cron `app/api/cron/assistant-cleanup/route.ts`.
- Без Pusher лишається полінг. Жодної нової залежності (toast-бібліотеку не додаємо).
- Шари: `route.ts` тонкі → handler у `lib/server/notifications`; клієнт тільки через `lib/api/notifications.ts` → `lib/hooks/notifications`; ключі запитів у `keys.ts` без `"use client"`.
- i18n: `components/common/**`, `components/hud/**`, `lib/hooks/common/**` — у `i18n-migrated.json` (кирилиця в літералах заборонена ESLint). Тексти тостів/пілу — ключі `common.notifications.*` у `messages/{uk,en}/common.json`. Нові каталоги `components/notifications/**` і `lib/hooks/notifications/**` одразу дописати в `i18n-migrated.json` (вони малі, тексти лише через `t()`). `components/campaigns/**`, `components/character-profile/**` не мігровані — нових рядків там не додаємо, лише компоненти.
- Тести: під час роботи `pnpm test:related <files>`; повний `pnpm test:run` — один раз у фінальному завданні.

## Review Focus

- Гравець водночас на сторінці бою: `usePusherBattleSync` підписаний на `private-user-<id>` і при unmount робить `pusher.unsubscribe(name)` — тому сповіщення йдуть окремим каналом `private-notify-<id>`, інакше вихід із бою вбив би live-оновлення (тест у Task 3: channel-access дозволяє `private-notify-<own>` і відхиляє чужий).
- DM видає предмет власному NPC-герою або гравець сам переносить предмет між своїми героями — сповіщення не створюється (тест у Task 3: `notifyCharacterOwners` пропускає `controlledBy === actorUserId`, `type !== player`, `status === pending`).
- Повторна видача того самого артефакту після прочитання — сповіщення знову непрочитане, без дубля рядка (тест у Task 3: delete + `createMany({ skipDuplicates: true })`).
- Виклик `notifyPlayers` поза request scope (`tsx`-скрипти, battle-sweep) — `after()` кидає; має бути fallback без падіння (тест у Task 3).
- Тости на сторінці бою перекривали б керування — `NotificationsHost` не показує тости на шляхах `/battles/` (пілі й лічильники лишаються) (тест у Task 9).

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261110000000_player_notifications/migration.sql` | модель `PlayerNotification` |
| `lib/constants/notifications.ts` | `NOTIFICATION_TYPES`, `NOTIFICATION_RETENTION_DAYS`, `NOTIFICATIONS_LIST_LIMIT`, `NOTIFICATION_TILE_TYPES` |
| `types/notifications.ts` | `NotificationType`, `PlayerNotification`, `MarkNotificationsReadData`, `NotificationsChangedEvent` |
| `lib/utils/notifications/href.ts`, `events.ts`, `select.ts` | чисті: href за типом; події з логів/рівня/заклинань; вибірки з кешу |
| `lib/pusher/channels.ts`, `app/api/pusher/auth/channel-access.ts` | канал `private-notify-<userId>` |
| `lib/server/notifications/notify.ts`, `handlers.ts`, `cleanup.ts` | запис + Pusher; GET/POST handler-и; retention |
| `lib/schemas/notifications.ts` | Zod `markNotificationsReadSchema` |
| `app/api/campaigns/[id]/notifications/route.ts`, `…/read/route.ts` | тонкі маршрути |
| `lib/api/notifications.ts`, `lib/hooks/notifications/*` | клієнт |
| `lib/hooks/common/useToasts.ts`, `components/common/ToastHost.tsx`, `components/common/NewPill.tsx` | спільний UI |
| `components/notifications/NotificationsHost.tsx`, `app/campaigns/[id]/layout.tsx` | склейка тостів для кампанії |

**Reuse:** `HudPill tone="gold"` (вже показує «Новий рівень» у `PlayerHeroCard`) → основа `NewPill`; `usePusherChannel` (`lib/hooks/common`); `safePusherTrigger` + `after()` як у `lib/server/world/world-events.ts`; `requireCampaignAccess`, `parseBody`, `handleApiError`, `errorResponse`; `useCrudMutation`; `cleanupAssistantData` cron. Нове, бо аналога немає: таблиця, `useToasts`/`ToastHost` (є лише `useBattleToast` на один рядок без посилань — не узагальнюємо, щоб не чіпати бій).

---

### Task 1: Схема, константи, типи, href

**Files:**
- Modify: `prisma/schema.prisma` (модель + зворотні зв'язки в `User`, `Campaign`)
- Create: `prisma/migrations/20261110000000_player_notifications/migration.sql`
- Create: `lib/constants/notifications.ts`, `types/notifications.ts`, `lib/utils/notifications/href.ts`
- Test: `lib/utils/notifications/__tests__/href.test.ts`

**Interfaces:**
- Produces:
  - `NOTIFICATION_TYPES = ["level", "item", "spell", "acquaintance"] as const`; `NOTIFICATION_RETENTION_DAYS = 30`; `NOTIFICATIONS_LIST_LIMIT = 50`; `NOTIFICATION_TILE_TYPES: Readonly<Record<string, readonly NotificationType[]>> = { "my-character": ["level", "item", "spell"] }` (частина A додає `acquaintances`).
  - `type NotificationType = (typeof NOTIFICATION_TYPES)[number]`
  - `interface PlayerNotification { id: string; type: NotificationType; refId: string; href: string; createdAt: string }`
  - `interface MarkNotificationsReadData { types?: NotificationType[]; refIds?: string[] }`
  - `interface NotificationsChangedEvent { campaignId: string }`
  - `notificationHref(campaignId: string, type: NotificationType, refId: string): string`

- [ ] **Step 1: Модель Prisma**

```prisma
model PlayerNotification {
  id         String    @id @default(cuid())
  userId     String
  campaignId String
  type       String
  refId      String
  href       String
  createdAt  DateTime  @default(now())
  readAt     DateTime?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign   Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@unique([userId, type, refId])
  @@index([userId, campaignId, readAt])
  @@index([readAt])
  @@map("player_notifications")
}
```
`User.playerNotifications PlayerNotification[]`, `Campaign.playerNotifications PlayerNotification[]`.

- [ ] **Step 2: Міграція.** `pnpm db:local` (якщо не піднята), `pnpm exec prisma migrate dev --create-only --name player_notifications`, перейменувати теку в `20261110000000_player_notifications` (порядок після `20261109000000_user_locale`), дописати після `CREATE TABLE`: `ALTER TABLE "player_notifications" ENABLE ROW LEVEL SECURITY;`. Потім `pnpm exec prisma migrate dev` (застосувати) і `pnpm exec prisma generate`.

- [ ] **Step 3: Тест href (падає)** — `href.test.ts`:
  - `level` → `/campaigns/c1/character`
  - `item` → `/campaigns/c1/character?tab=items`
  - `spell` → `/campaigns/c1/character?tab=magic`
  - `acquaintance` → `/campaigns/c1/acquaintances?focus=a1` (refId енкодиться `encodeURIComponent`)

- [ ] **Step 4: Реалізація** `notificationHref` (switch по типу; вкладки — id з `components/character-profile/ProfileTabs.tsx`: `items`, `magic`), константи, типи.

- [ ] **Step 5: Перевірка**

Run: `pnpm test:related lib/utils/notifications/href.ts prisma/schema.prisma && pnpm test:run prisma/__tests__/migrations-rls.test.ts && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit** — `git add prisma lib/constants/notifications.ts types/notifications.ts lib/utils/notifications && git commit -m "feat(notifications): player_notifications table, types, href"`

---

### Task 2: Чисті функції подій

**Files:**
- Create: `lib/utils/notifications/events.ts`
- Test: `lib/utils/notifications/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `NotificationType` (Task 1), `InventoryLogKind` (`lib/constants/inventory.ts`).
- Produces:
  - `interface CharacterNotificationEvent { characterId: string; type: NotificationType; refId: string }`
  - `inventoryNotificationEvents(entries: { characterId: string; kind: string; delta: Record<string, unknown> }[]): CharacterNotificationEvent[]`
  - `levelNotificationEvents(characterId: string, fromLevel: number, toLevel: number): CharacterNotificationEvent[]` — refId `${characterId}:${toLevel}`
  - `spellNotificationEvents(characterId: string, before: unknown, after: readonly string[] | undefined): CharacterNotificationEvent[]` — `before` — сирий JSON `knownSpells`

- [ ] **Step 1: Тести (падають)**
  - `inventoryNotificationEvents`: `artifact_grant` з `delta.artifactId: "a1"` → `[{ characterId, type: "item", refId: "a1" }]`; `artifact_transfer` з `delta.fromCharacterId` (отримувач) → item-подія; `artifact_transfer` з `delta.toCharacterId` (відправник) → нічого; `artifact_equip`, `item_add`, `money_gain` → нічого; без рядкового `artifactId` → нічого.
  - `levelNotificationEvents(c, 3, 4)` → `[{ c, "level", "c:4" }]`; `(c, 4, 4)` і `(c, 5, 4)` → `[]`.
  - `spellNotificationEvents(c, ["s1"], ["s1", "s2"])` → лише `s2`; `after === undefined` → `[]`; `before` не масив (`null`, `{}`) → усі з `after` нові; дублікати в `after` → одна подія.

- [ ] **Step 2: Run** `pnpm test:related lib/utils/notifications/events.ts` → FAIL.
- [ ] **Step 3: Реалізація** (порівняння через `Set`; `delta.artifactId` перевіряти `typeof === "string"`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(notifications): derive events from inventory log, level and spells`

---

### Task 3: Канал Pusher і `notify*`

**Files:**
- Modify: `lib/pusher/channels.ts`, `app/api/pusher/auth/channel-access.ts`
- Create: `lib/server/notifications/notify.ts`
- Test: `lib/server/notifications/__tests__/notify.test.ts`, `app/api/pusher/auth/__tests__/channel-access.test.ts` (новий: наявного тесту `isChannelAllowedForUser` немає)

**Interfaces:**
- Consumes: `notificationHref`, `CharacterNotificationEvent`, `NotificationType`.
- Produces (частина A їх викликає):
  - `NOTIFY_CHANNEL_PREFIX = "private-notify-"`, `notifyChannelName(userId: string): string`, `NOTIFICATIONS_CHANGED_EVENT = "notifications-changed"`
  - `type NotifyDb = Pick<Prisma.TransactionClient, "playerNotification">`
  - `interface NotificationItem { type: NotificationType; refId: string; href: string }`
  - `notifyPlayers(input: { campaignId: string; userIds: string[]; items: NotificationItem[] }, db?: NotifyDb): Promise<number>` — кількість записаних рядків
  - `notifyCharacterOwners(input: { campaignId: string; actorUserId: string | null; events: CharacterNotificationEvent[] }, db?: NotifyDb & Pick<Prisma.TransactionClient, "character">): Promise<number>`
  - `notifyCampaignPlayers(input: { campaignId: string; items: NotificationItem[]; exceptUserId?: string }, db?: NotifyDb & Pick<Prisma.TransactionClient, "campaignMember">): Promise<number>` — **узагальнений вхід для частини A**: усі члени з `role === CampaignRole.PLAYER`.

- [ ] **Step 1: Тести (падають)** — мок `@/lib/db`, `next/server` (`after` збирає колбеки, як у `lib/server/world/__tests__/world-events.test.ts`), `@/lib/pusher/server`, `@/lib/pusher/safe-trigger`.
  - `notifyPlayers` з порожніми `userIds` або `items` → 0, жодних викликів БД/Pusher.
  - `notifyPlayers` для 2 користувачів × 1 item: `deleteMany` з `OR` по `(userId, type, refId)`, потім `createMany({ data: 2 рядки, skipDuplicates: true })`; після `flush` — `safePusherTrigger` по разу на `notifyChannelName(u)` з `{ campaignId }`.
  - дублікати `userIds` → по одному тригеру й рядку на користувача.
  - `after` кидає (`vi.mocked(after).mockImplementationOnce(() => { throw new Error("outside request") })`) → `notifyPlayers` не кидає, тригер все одно викликано.
  - `notifyCharacterOwners`: `character.findMany` повертає player/active (`u1`), player/active (`actor`), `npc_hero` (`dm`), player/pending (`u2`) → записано лише для `u1`, href із `notificationHref`; порожні `events` → БД не чіпається.
  - `notifyCampaignPlayers`: бере `campaignMember.findMany({ where: { campaignId, role: "player" } })`, `exceptUserId` виключено.
  - channel-access: `private-notify-u1` для `u1` → true, для `u2` → false; `private-notify-` → false.

- [ ] **Step 2: Run** `pnpm test:related lib/server/notifications/notify.ts app/api/pusher/auth/channel-access.ts` → FAIL.

- [ ] **Step 3: Реалізація.** Ключові частини:

```ts
function publish(campaignId: string, userIds: string[]) {
  const send = () => Promise.all(userIds.map((u) => safePusherTrigger(pusherServer, notifyChannelName(u), NOTIFICATIONS_CHANGED_EVENT, { campaignId } satisfies NotificationsChangedEvent, { action: "notify players" })));

  try {
    after(send);
  } catch {
    // outside a request scope (tsx scripts): fire and forget
    void send();
  }
}
```
Запис: `db.playerNotification.deleteMany({ where: { OR: pairs } })` + `createMany({ data, skipDuplicates: true })` (видалення повертає прочитаний рядок у стан «непрочитано» без дубля). `notifyCharacterOwners` — `character.findMany({ where: { id: { in }, campaignId }, select: { id, controlledBy, type, status } })`, фільтр `type === CharacterType.PLAYER && status === CharacterStatus.ACTIVE && controlledBy !== actorUserId`, далі групування в `notifyPlayers` по користувачу (кожен користувач — лише свої items: виклик `notifyPlayers` на кожного власника або загальний `createMany` з парами — на вибір, тест перевіряє рядки). У `channel-access.ts` гілка `NOTIFY_CHANNEL_PREFIX` — та сама перевірка, що й для `USER_CHANNEL_PREFIX`. Файл `import "server-only"`.

- [ ] **Step 4: Run** → PASS; `pnpm lint lib/server/notifications lib/pusher app/api/pusher`.
- [ ] **Step 5: Commit** — `feat(notifications): notifyPlayers/notifyCharacterOwners with per-user pusher channel`

---

### Task 4: API — список непрочитаних і mark-read

**Files:**
- Create: `lib/schemas/notifications.ts`, `lib/server/notifications/handlers.ts`, `app/api/campaigns/[id]/notifications/route.ts`, `app/api/campaigns/[id]/notifications/read/route.ts`
- Test: `app/api/__tests__/notifications-api.test.ts`

**Interfaces:**
- Consumes: `NOTIFICATION_TYPES`, `NOTIFICATIONS_LIST_LIMIT`, `PlayerNotification`.
- Produces:
  - `markNotificationsReadSchema = z.object({ types: z.array(z.enum(NOTIFICATION_TYPES)).max(4).optional(), refIds: z.array(z.string().min(1).max(200)).max(200).optional() }).refine((d) => !!d.types?.length || !!d.refIds?.length)`
  - `listNotificationsHandler(campaignId: string): Promise<NextResponse>` → `PlayerNotification[]`
  - `markNotificationsReadHandler(req: Request, campaignId: string): Promise<NextResponse>` → `{ count: number }`
  - `GET /api/campaigns/[id]/notifications`, `POST /api/campaigns/[id]/notifications/read`

- [ ] **Step 1: Тести (падають)** — стиль `app/api/__tests__/world-notes-api.test.ts` (мок `requireCampaignAccess`, `@/lib/db`).
  - GET: `findMany` з `where: { userId: "u1", campaignId: "c1", readAt: null }`, `orderBy: { createdAt: "desc" }`, `take: 50`; `createdAt` серіалізовано ISO-рядком; поле `readAt` у відповіді відсутнє.
  - GET не-член → відповідь `requireCampaignAccess` (403) пробрасується.
  - POST `{ types: ["item"] }` → `updateMany({ where: { userId, campaignId, readAt: null, type: { in: ["item"] } }, data: { readAt: <Date> } })`, відповідь `{ count }`.
  - POST `{ refIds: ["a1"] }` → `refId: { in: ["a1"] }`; обидва поля разом — обидві умови.
  - POST `{}` → 400; `{ types: ["bogus"] }` → 400; зламаний JSON → 400.

- [ ] **Step 2: Run** `pnpm test:related lib/server/notifications/handlers.ts` → FAIL.
- [ ] **Step 3: Реалізація** — handler-и з `requireCampaignAccess`, `parseBody`, `handleApiError(error, { action })`; `route.ts` лише `await params` і делегування (як `app/api/campaigns/[id]/world/notes/route.ts`).
- [ ] **Step 4: Run** → PASS; `pnpm lint app/api/campaigns/[id]/notifications lib/server/notifications lib/schemas/notifications.ts`.
- [ ] **Step 5: Commit** — `feat(notifications): list unread and mark-read routes`

---

### Task 5: Retention у наявному cron

**Files:**
- Create: `lib/server/notifications/cleanup.ts`
- Modify: `app/api/cron/assistant-cleanup/route.ts`
- Test: `lib/server/notifications/__tests__/cleanup.test.ts`, `app/api/__tests__/assistant-cleanup-cron.test.ts`

**Interfaces:**
- Produces: `cleanupReadNotifications(now?: Date, db?: Pick<Prisma.TransactionClient, "playerNotification">): Promise<{ notificationsDeleted: number }>`

- [ ] **Step 1: Тести (падають)**
  - `cleanupReadNotifications(new Date("2026-11-30T00:00:00Z"))` → `deleteMany({ where: { readAt: { lt: new Date("2026-10-31T00:00:00Z") } } })`; непрочитані (`readAt: null`) не потрапляють в умову (перевірити, що `where` не містить `OR`/`null`).
  - cron: успішна відповідь містить `notificationsDeleted` поряд із полями `cleanupAssistantData`; збій `cleanupReadNotifications` → 500, як і для асистента (мок обох модулів).
- [ ] **Step 2: Run** `pnpm test:related lib/server/notifications/cleanup.ts app/api/cron/assistant-cleanup/route.ts` → FAIL.
- [ ] **Step 3: Реалізація** — у route: `const result = await cleanupAssistantData(); const notifications = await cleanupReadNotifications(); return NextResponse.json({ ok: true, ...result, ...notifications });` (послідовно: на Vercel `connection_limit = 1`). Шлях cron у `vercel.json` не змінюється.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(notifications): 30-day retention of read notifications in daily cron`

---

### Task 6: Підключити рівень, предмет, заклинання

**Files:**
- Modify: `lib/server/inventory/log.ts` (`writeInventoryLog` — спільна точка видачі й передачі), `lib/server/characters/operations/level-up.ts`, `lib/server/characters/operations/patch.ts`
- Test: `app/api/__tests__/stash-api.test.ts`, `app/api/__tests__/artifact-transfer-api.test.ts`, `app/api/__tests__/character-level-up-api.test.ts`, `app/api/__tests__/character-patch-fields.test.ts` (або `character-patch-level-api.test.ts` для рівня)

**Interfaces:**
- Consumes: `notifyCharacterOwners` (Task 3), `inventoryNotificationEvents` / `levelNotificationEvents` / `spellNotificationEvents` (Task 2).

Рішення щодо точок (перевірено в коді):
- Предмет: усі три виклики `writeInventoryLog` (`stash-update.ts:188` — `artifact_grant`, `transfer.ts:70` — обидві сторони, `inventory-update.ts:144` — equip) проходять через `lib/server/inventory/log.ts`. Сповіщення додається туди одним рядком; події виникають лише для `artifact_grant` і отримувача `artifact_transfer`, тож для equip додаткового запиту немає. `actorUserId` — з першого запису.
- Рівень: `level-up.ts` — DM-only (`dmCharacterGate`), обидві гілки (класова в транзакції, раса без транзакції); `patch.ts` — DM міняє `level`/`classes`. XP рівень не піднімає (`persist-xp.ts`), тому там нічого.
- Заклинання: `patch.ts`, поле `knownSpells` (DM). Вивчення гравцем через прогресію — власна дія, сповіщення не потрібне (`notifyCharacterOwners` все одно відкине actor = owner).

- [ ] **Step 1: Тести (падають)** — у кожному файлі `vi.mock("@/lib/server/notifications/notify", () => ({ notifyCharacterOwners: vi.fn().mockResolvedValue(0) }))`.
  - stash: DM видає артефакт `a1` героєві → `notifyCharacterOwners` з `{ campaignId, actorUserId: dm, events: [{ characterId, type: "item", refId: "a1" }] }`; дія `equip` → виклик не відбувся або з порожніми подіями (у `log.ts` порожні події не викликають notify — перевірити `not.toHaveBeenCalled()`).
  - transfer: подія лише для `toCharacterId`.
  - level-up: DM піднімає 3→4 → подія `{ type: "level", refId: "<id>:4" }`, виклик із `tx` у класовій гілці (перевірити другий аргумент — об'єкт транзакції з моку `$transaction`).
  - patch: DM `{ level: 5 }` з 4 → level-подія; DM `{ knownSpells: ["s1","s2"] }` при наявних `["s1"]` → spell-подія `s2`; гравець патчить свого героя → виклик із `actorUserId` = гравець (відкидання — відповідальність `notifyCharacterOwners`, протестовано в Task 3).
- [ ] **Step 2: Run** `pnpm test:related lib/server/inventory/log.ts lib/server/characters/operations/level-up.ts lib/server/characters/operations/patch.ts` → FAIL.
- [ ] **Step 3: Реалізація**

`lib/server/inventory/log.ts`:
```ts
export async function writeInventoryLog(tx: Prisma.TransactionClient, entries: LogInput[]) {
  const result = await tx.inventoryLog.createMany({ data: entries.map((e) => ({ ...e, delta: e.delta as Prisma.InputJsonValue })) });

  const events = inventoryNotificationEvents(entries);

  if (events.length) await notifyCharacterOwners({ campaignId: entries[0].campaignId, actorUserId: entries[0].actorUserId, events }, tx);

  return result;
}
```
`level-up.ts`: після `tx.character.update` у класовій гілці — `await notifyCharacterOwners({ campaignId: id, actorUserId: access.userId, events: levelNotificationEvents(characterId, row.level, fresh.level) }, tx)`; у расовій гілці після `prisma.character.update` — те саме з `prisma` і `character.level → newLevel`.
`patch.ts` (`patchCore`, перед `return updatedCharacter`): `await notifyCharacterOwners({ campaignId, actorUserId: userId, events: [...levelNotificationEvents(characterId, character.level, updatedCharacter.level), ...spellNotificationEvents(characterId, character.knownSpells, data.knownSpells)] })`. Наявні тести, що вже мокають `$transaction`/`tx` без `playerNotification`, мають отримати мок модуля `notify` (інакше реальний виклик зламає мок `tx`).
- [ ] **Step 4: Run** → PASS; `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(notifications): notify players on level-up, artifact grant/transfer and new spells`

---

### Task 7: Клієнт — API і хуки

**Files:**
- Create: `lib/api/notifications.ts`, `lib/hooks/notifications/{keys.ts,index.ts,useNotifications.ts,useNotificationsSync.ts,useMarkRead.ts,useSeenOnOpen.ts}`, `lib/utils/notifications/select.ts`
- Modify: `i18n-migrated.json` (+ `"lib/hooks/notifications/**"`)
- Test: `lib/utils/notifications/__tests__/select.test.ts`, `lib/hooks/notifications/__tests__/notifications-hooks.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: routes з Task 4; `notifyChannelName`, `NOTIFICATIONS_CHANGED_EVENT` (Task 3).
- Produces:
  - `getNotifications(campaignId: string): Promise<PlayerNotification[]>`; `markNotificationsRead(campaignId: string, data: MarkNotificationsReadData): Promise<{ count: number }>` (`campaignGet`/`campaignPost` з `lib/api/client.ts`)
  - `notificationKeys = { list: (campaignId: string) => ["notifications", campaignId] as const }` (файл без `"use client"`)
  - `useNotifications(campaignId: string, options?: { enabled?: boolean }): UseQueryResult<PlayerNotification[]>` — `staleTime: 60_000`; `refetchInterval: 60_000` лише без `NEXT_PUBLIC_PUSHER_KEY`
  - `useNotificationsSync(campaignId: string, userId: string | null): void` — `usePusherChannel(userId ? notifyChannelName(userId) : null, { [NOTIFICATIONS_CHANGED_EVENT]: (d) => d.campaignId === campaignId && invalidate })`
  - `useMarkRead(campaignId: string)` → `{ markRead(data: MarkNotificationsReadData): Promise<void> }` — оптимістично прибирає відповідні елементи з кешу, на помилку інвалідує; без `errorText` (тихий збій)
  - `useSeenOnOpen(campaignId: string, filter: { types: readonly NotificationType[]; enabled?: boolean }): ReadonlySet<string>` — при першій появі даних фіксує `refId`-и непрочитаних цих типів, один раз викликає `markRead({ types })`, повертає зафіксований набір (піли живуть до кінця візиту)
  - чисті: `unreadOfTypes(list: PlayerNotification[] | undefined, types: readonly NotificationType[]): PlayerNotification[]`, `hasUnread(list, types): boolean`, `matchesRead(n: PlayerNotification, data: MarkNotificationsReadData): boolean`

- [ ] **Step 1: Тести (падають)**
  - `select.test.ts`: `matchesRead` — збіг за типом, за refId, за обома (AND), порожній фільтр → false; `hasUnread(undefined, ["item"])` → false.
  - хуки (QueryClient у wrapper, мок `@/lib/api/notifications`, мок `usePusherChannel` з захопленням handlers):
    - `useSeenOnOpen` з даними `[item a1, item a2, level c:4]` і `types: ["item"]` → повертає `{a1, a2}`, `markNotificationsRead` викликано рівно раз з `{ types: ["item"] }`; після оптимістичного видалення набір не порожніє.
    - `useSeenOnOpen` з `enabled: false` → порожній набір, без виклику.
    - `useSeenOnOpen` без непрочитаних цих типів → без виклику API.
    - `useNotificationsSync`: подія з `campaignId: "c1"` інвалідує `notificationKeys.list("c1")`; з `"c2"` — ні; `userId: null` → канал `null`.
- [ ] **Step 2: Run** `pnpm test:related lib/hooks/notifications/index.ts lib/utils/notifications/select.ts` → FAIL.
- [ ] **Step 3: Реалізація** (barrel `index.ts` експортує `notificationKeys` і всі хуки).
- [ ] **Step 4: Run** → PASS; `pnpm lint lib/hooks/notifications lib/api/notifications.ts`.
- [ ] **Step 5: Commit** — `feat(notifications): client api, query hooks, pusher sync, seen-on-open`

---

### Task 8: Спільний UI — `useToasts`, `ToastHost`, `NewPill`, бейдж плитки

**Files:**
- Create: `lib/hooks/common/useToasts.ts` (+ експорт у `lib/hooks/common/index.ts`), `components/common/ToastHost.tsx`, `components/common/NewPill.tsx`
- Modify: `components/hud/page/HudTile.tsx` (опційний `badge?: ReactNode`), `messages/uk/common.json`, `messages/en/common.json`
- Test: `lib/hooks/common/__tests__/use-toasts.test.tsx`, `components/common/__tests__/toast-host.test.tsx`, `components/common/__tests__/new-pill.test.tsx`

**Interfaces:**
- Produces:
  - `interface Toast { id: string; icon?: ReactNode; text: ReactNode; href?: string }`
  - `useToasts(options?: { durationMs?: number }): { toasts: Toast[]; push(toast: Toast): void; dismiss(id: string): void }` — default `TOAST_MS = 6_000`; `push` з наявним `id` не дублює; максимум 3 одночасно (старіший витісняється)
  - `ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void })` — `role="status"`, `aria-live="polite"`, fixed bottom-right (на телефоні — на всю ширину з відступом 16px), посилання `next/link` з текстом `t("notifications.open")`, кнопка закриття `aria-label={t("ui.close")}`; клік по посиланню теж викликає `onDismiss`
  - `NewPill({ count, className }: { count?: number; className?: string })` → `<HudPill tone="gold">{count > 1 ? t("notifications.newCount", { count }) : t("notifications.new")}</HudPill>`
  - ключі `common.notifications`: `new` («нове» / «new»), `newCount` («нове: {count}» / «new: {count}»), `open` («Відкрити» / «Open»), `region` («Сповіщення» / «Notifications»), `level` («Новий рівень» / «New level»), `item` («Новий предмет» / «New item»), `spell` («Нове заклинання» / «New spell»), `acquaintance` («Нове знайомство» / «New acquaintance»)

- [ ] **Step 1: Тести (падають)** — глобальний мок `t` повертає ключ (`"common.notifications.new"`), перевіряємо ключі.
  - `useToasts` (fake timers): `push` → 1 тост; через 6000 мс — 0; `dismiss` до таймера — 0 і таймер не кидає; повторний `push` того ж `id` → 1; четвертий тост витісняє перший.
  - `ToastHost`: рендерить текст і `href`; клік «закрити» → `onDismiss(id)`; порожній список → без контейнера.
  - `NewPill`: без `count` → `common.notifications.new`; `count: 3` → ключ `newCount` з параметром.
  - `HudTile` з `badge` рендерить бейдж (додати кейс у наявний тест hud, якщо є, інакше в `new-pill.test.tsx`).
- [ ] **Step 2: Run** `pnpm test:related lib/hooks/common/useToasts.ts components/common/ToastHost.tsx components/common/NewPill.tsx components/hud/page/HudTile.tsx` → FAIL.
- [ ] **Step 3: Реалізація** (таймери в `useRef<Map<string, Timeout>>`, очищення в cleanup ефекту).
- [ ] **Step 4: Run** → PASS; `pnpm test:run lib/i18n/__tests__/parity.test.ts`; `pnpm lint components/common components/hud lib/hooks/common`.
- [ ] **Step 5: Commit** — `feat(ui): toast host, useToasts, gold NewPill, HudTile badge`

---

### Task 9: Склейка — `NotificationsHost`, плитки, аркуш героя

**Files:**
- Create: `components/notifications/NotificationsHost.tsx`, `app/campaigns/[id]/layout.tsx`
- Modify: `i18n-migrated.json` (+ `"components/notifications/**"`), `components/campaigns/dashboard/DashboardGroups.tsx`, `components/character-profile/CharacterProfile.tsx`, `components/character-profile/inventory/InventoryTab.tsx`, `components/character-profile/inventory/BackpackGrid.tsx`, `components/character-profile/inventory/InventoryCell.tsx`, `components/character-profile/MagicTab.tsx`
- Test: `components/notifications/__tests__/notifications-host.test.tsx`, `components/campaigns/dashboard/__tests__/DashboardGroups.test.tsx` (додати кейси), `components/character-profile/inventory/__tests__/inventory-grids.test.tsx`

**Interfaces:**
- Consumes: `useNotifications`, `useNotificationsSync`, `useSeenOnOpen`, `hasUnread`, `useToasts`, `ToastHost`, `NewPill`, `NOTIFICATION_TILE_TYPES`.
- Produces:
  - `NotificationsHost({ campaignId, userId }: { campaignId: string; userId: string | null })`
  - `app/campaigns/[id]/layout.tsx` — серверний layout: `const userId = await getSessionUserId();` (локальна перевірка JWT, без запиту в БД) → `<>{children}<NotificationsHost campaignId={id} userId={userId} /></>`
  - `InventoryCell` новий опційний проп `isNew?: boolean` (рендер `NewPill` у куті); `BackpackGrid` — `newIds?: ReadonlySet<string>`
  - `DashboardGroups`: для гравця `NewPill` на плитці, якщо `hasUnread(list, NOTIFICATION_TILE_TYPES[s.key] ?? [])`; для DM запит вимкнено (`enabled: !isDM`)

- [ ] **Step 1: Тести (падають)**
  - `NotificationsHost` (мок хуків): дані `[item a1]` → один тост з текстом `common.notifications.item` і `href`; `sessionStorage["notifications-toasted"]` містить `a1`-id → тост не показано; закриття тосту → `markNotificationsRead` не викликано; `usePathname()` = `/campaigns/c1/battles/b1` → тостів немає; `sessionStorage` кидає → тост показано, без падіння.
  - `DashboardGroups`: гравець з непрочитаним `item` → піл на «Мій персонаж»; DM → пілу немає й `useNotifications` з `enabled: false`.
  - `BackpackGrid` з `newIds = {a1}` → піл лише на клітинці `a1`.
- [ ] **Step 2: Run** `pnpm test:related components/notifications/NotificationsHost.tsx components/campaigns/dashboard/DashboardGroups.tsx components/character-profile/inventory/BackpackGrid.tsx` → FAIL.
- [ ] **Step 3: Реалізація**
  - `NotificationsHost`: `useNotificationsSync`; `useNotifications`; `useEffect` по даних: для кожного непоказаного (`id` не в наборі з `sessionStorage`, ключ `notifications-toasted`, усе в `try/catch`) → `push({ id, icon: <TypeIcon/>, text: t(\`notifications.${type}\`), href })` і дописати id у набір. Іконки: `TrendingUp` (level), `Gem` (item), `Sparkles` (spell), `UserRound` (acquaintance) з `lucide-react`. На `/battles/` — `ToastHost` не рендериться.
  - `CharacterProfile`: `useSeenOnOpen(campaignId, { types: ["level"], enabled: sheet.viewer.isOwner && !sheet.viewer.isDM })` (оверлей рівня вже є — `useLevelUpCelebration`; піл не потрібен).
  - `InventoryTab`: `const newIds = useSeenOnOpen(campaignId, { types: ["item"], enabled: isOwner && !isDM })` → `BackpackGrid newIds`. Предмет у слоті екіпірування піл не отримує (видача кладе в рюкзак).
  - `MagicTab`: `useSeenOnOpen(…, { types: ["spell"] })` → `NewPill count={set.size}` у заголовку вкладки, якщо `size > 0`.
  - `campaignId`/`viewer` — з `useProfile()` (`components/character-profile/ProfileContext.tsx`).
- [ ] **Step 4: Run** → PASS; `pnpm lint components/notifications components/campaigns components/character-profile "app/campaigns/[id]/layout.tsx"`; `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(notifications): toasts host in campaign layout, pills on tiles and hero sheet`

---

### Task 10: Документація, «Що нового», фінальна перевірка

**Files:**
- Create: `docs/architecture/notifications.md`
- Modify: `docs/architecture/README.md` (рядок таблиці), `docs/STATUS.md` (рядок «Знайомства + сповіщення» — гілка `feat/acquaintances`, частина B готова), `lib/onboarding/whats-new.ts`

- [ ] **Step 1:** `docs/architecture/notifications.md` (укр., ≤ 40 рядків): таблиця й унікальність `userId+type+refId` (повторна подія повертає «непрочитано»), точки виклику (`writeInventoryLog`, `level-up.ts`, `patch.ts`; частина A — розкриття знайомств), канал `private-notify-<userId>` і чому не `private-user-*`, mark-read лише при відкритті цільового місця (`useSeenOnOpen`), `sessionStorage`-ключ тостів, retention 30 днів у `assistant-cleanup` cron, «як додати тип» (константа → `notificationHref` → ключ `common.notifications.<type>` → іконка в `NotificationsHost`).
- [ ] **Step 2:** запис на початок `WHATS_NEW`: `{ id: "2026-10-28-notifications", date: "2026-10-28", audience: "player", title: "Сповіщення «нове»", body: "Коли ДМ підвищує рівень, видає предмет чи заклинання, з'являється сповіщення, а на плитці й предметі — золота позначка «нове». Вона зникає, щойно відкриєш відповідну вкладку." }`.
- [ ] **Step 3: Повна перевірка**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm test:run`
Expected: 0 errors, усі тести PASS.

- [ ] **Step 4: Commit** — `docs(notifications): architecture note, whats-new, status`

---

## Self-review

- Spec coverage: таблиця + RLS (T1), `notifyPlayers` + Pusher + полінг (T3, T7), API (T4), retention (T5), рівень/предмет/заклинання (T6), `ToastHost`/`useToasts`/`sessionStorage`/закриття без «прочитано» (T8, T9), `NewPill` на плитках і предметах (T8, T9), узагальнений вхід для A — `notifyCampaignPlayers` (T3), тип `acquaintance` і його href (T1), whats-new (T10).
- Типи: `NotificationType`, `NotificationItem`, `CharacterNotificationEvent`, `notifyChannelName`, `NOTIFICATIONS_CHANGED_EVENT`, `useSeenOnOpen` — однакові назви в T1–T9.
