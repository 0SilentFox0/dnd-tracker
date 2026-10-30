# Знайомства (частина A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плитка кампанії «Знайомства»: повні NPC і мікро-NPC (ім'я, аватар, опис, журнал), які DM створює виділенням у тексті сценарію; гравці бачать їх, коли секцію зіграно, і отримують сповіщення частини B.

**Architecture:** Три таблиці (`acquaintances`, `acquaintance_entries`, `acquaintance_notes`) + `Campaign.acquaintancesEnabled`. Розкриття не зберігається — чиста функція видимості рахує його з `ScenarioSection.played` (через наявний `loadPlayedSections`). Сповіщення шле `notifyAcquaintanceReveal` після будь-якого запису контенту сценарію, що робить секцію зіграною (`section-handler.ts` і `writeScenarioContent`). Редактор отримує mention-тип `acquaintance` і діалог «Знайомство»; таб `app/campaigns/[id]/acquaintances` — серверна сторінка з `PrefetchedQuery`.

**Tech Stack:** Next.js 16 App Router, Prisma 6 / PostgreSQL, TipTap (mention), TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-acquaintances-design.md` (розділи «Рішення», «Дані», «Правило видимості», «Частина A»). **Залежить від плану** `docs/superpowers/plans/2026-10-28-notifications-part-b.md` — виконувати після нього.

## Global Constraints

- Міграції expand-only; кожна `CREATE TABLE` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (тест `prisma/__tests__/migrations-rls.test.ts`). `Campaign.acquaintancesEnabled Boolean @default(false)`.
- Одиниця розкриття — секція (`ScenarioSection.played`), без нових прапорців на рядках. Повний NPC розкривається так само, як мікро-NPC.
- Гравець бачить знайомство, якщо `acquaintancesEnabled` і секція `sourceSectionId` зіграна; запис журналу — якщо зіграна його секція. DM бачить усе (приховане з позначкою). Фільтр — на сервері. Вимкнений перемикач → 403 для гравців.
- Нотатки гравців: автор + DM бачать; інші гравці — ні.
- `sourceSectionId` фіксується при створенні; видалення чипа не видаляє знайомство; видалення — лише явно з `useConfirm`.
- Шари: `route.ts` тонкі → handler-и в `lib/server/acquaintances`; Zod у `lib/schemas/acquaintances.ts`; клієнт `lib/api/acquaintances.ts` → `lib/hooks/acquaintances` (barrel + `keys.ts` без `"use client"`); компоненти не імпортують `@/lib/api/*`.
- Діалоги — `ResponsiveDialog hud` (не Radix напряму); підтвердження — `useConfirm`.
- i18n: `lib/constants/api-errors.ts` мігрований — нові помилки лише ключами `errors.*` з текстами в `messages/{uk,en}/errors.json` (тест `api-errors-coverage`). `components/hud/**`, `components/common/**` мігровані — нових рядків там не додаємо. Нові `components/acquaintances/**`, `app/campaigns/[id]/acquaintances/**`, `lib/hooks/acquaintances/**`, а також `components/scenario/**`, `components/campaigns/**`, `lib/constants/{scenario,campaign-dashboard}.ts`, `lib/onboarding/**` **не** мігровані — українські літерали, як у сусідньому коді (перенесення — окремими частинами i18n-епіку). Не додавати ці каталоги в `i18n-migrated.json`.
- Тести: під час роботи `pnpm test:related <files>`; повний `pnpm test:run` — лише у фінальному завданні.

## Review Focus

- Секцію-джерело видалено зі сценарію або сторінку видалено — знайомство не повинно ні впасти, ні розкритися гравцям; DM бачить його з позначкою «приховано» (тест у Task 2: `played` для невідомої секції = false; Task 3: GET DM повертає `hidden: true`).
- DM знімає позначку «зіграно» і ставить знову — жодного дубля сповіщення (рядок один на `userId+type+refId`, Task 3 частини B) і жодного падіння PATCH, якщо сповіщення не вдалося (тест у Task 5: `notifyAcquaintanceReveal` ковтає помилку й логує).
- Перемикач вимкнено в момент розкриття — сповіщень немає; увімкнення пізніше сповіщень не шле (рішення: тихо) (тест у Task 5).
- Гравець відкриває `?focus=<id>` прихованого знайомства або PUT нотатки до нього — 404, без витоку імені (тест у Task 4).
- Повторне виділення того самого NPC у тексті — вставляється наявний чип, нового рядка не створюється (тест у Task 9: вибір із «Наявні» не викликає `create`).

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261111000000_acquaintances/migration.sql` | 3 моделі + прапорець кампанії |
| `lib/constants/acquaintances.ts`, `types/acquaintances.ts` | ліміти, `ACQUAINTANCE_KINDS`, view-типи |
| `lib/utils/acquaintances/visibility.ts` | чиста видимість/проєкція для глядача |
| `lib/utils/scenario/reveal.ts` | + `newlyPlayedSections(before, after)` |
| `lib/schemas/acquaintances.ts` | Zod |
| `lib/server/acquaintances/{store.ts,handlers.ts,entry-handlers.ts,note-handlers.ts,reveal.ts}` | читання, CRUD, розкриття |
| `app/api/campaigns/[id]/acquaintances/**/route.ts` | тонкі маршрути |
| `lib/api/acquaintances.ts`, `lib/hooks/acquaintances/*` | клієнт |
| `components/scenario/editor/{AcquaintanceDialog.tsx,ScenarioToolbar.tsx,ScenarioEditor.tsx}` | інструмент редактора |
| `app/campaigns/[id]/acquaintances/{page.tsx,page-client.tsx}`, `components/acquaintances/*` | таб |

**Reuse:** `loadPlayedSections` (`lib/server/scenario/page-store.ts`) + `PlayedLookup`/`playedLookup` (`lib/utils/scenario/reveal.ts`); mention-механізм (`MENTION_TYPES`, `MENTION_LABELS`, `mentionHref`, `ScenarioRichText`, `searchScenarioMentions`); `loadOwnedPage` + `readContentStrict`; `loadOwned`, `parseBody`, `requireDM`, `requireCampaignAccess`, `handleApiError`, `errorResponse`; `PUBLIC_USER_SELECT`; `CharacterSelect` (`components/scenario`), `IconUrlField` + `EntityIcon` (`components/common`) для аватара за URL; `HudPage`/`HudPageHeader`/`HudCard`/`HudPill`, `useSearch` + `SearchInput`/`SearchEmptyState`, `QueryState`, `ResponsiveDialog`, `useConfirm`, `useCrudMutation`, `PrefetchedQuery`; `DashboardGroups hiddenKeys`. Нове: таблиці, видимість, діалог редактора, картка знайомства.

**Consumes from part B (точні назви):**
- `notifyCampaignPlayers(input: { campaignId: string; items: NotificationItem[]; exceptUserId?: string }, db?): Promise<number>` — `lib/server/notifications/notify.ts`
- `NotificationItem { type: NotificationType; refId: string; href: string }`, `notificationHref(campaignId, "acquaintance", acquaintanceId)` → `/campaigns/<c>/acquaintances?focus=<id>` — `lib/utils/notifications/href.ts`
- `NOTIFICATION_TILE_TYPES` (`lib/constants/notifications.ts`) — додати `acquaintances: ["acquaintance"]`
- `useSeenOnOpen(campaignId, { types, enabled }): ReadonlySet<string>` — `lib/hooks/notifications`
- `NewPill({ count? })` — `components/common/NewPill.tsx`; `HudTile badge` (частина B, Task 8)

---

### Task 1: Схема, міграція, типи

**Files:**
- Modify: `prisma/schema.prisma` (3 моделі; `Campaign.acquaintancesEnabled` + `acquaintances Acquaintance[]`; `Character.acquaintances`; `User.acquaintanceNotes`)
- Create: `prisma/migrations/20261111000000_acquaintances/migration.sql`, `lib/constants/acquaintances.ts`, `types/acquaintances.ts`

**Interfaces:**
- Produces:
  - `ACQUAINTANCE_KINDS = ["micro", "character"] as const`; `ACQUAINTANCE_LIMITS = { name: 120, description: 4000, entry: 2000, note: 4000 }`
  - `type AcquaintanceKind`
  - `interface AcquaintanceEntryView { id: string; pageId: string; sectionId: string; text: string; sortOrder: number; hidden: boolean }`
  - `interface AcquaintanceNoteView { id: string; authorUserId: string; authorName: string; text: string; updatedAt: string; own: boolean }`
  - `interface AcquaintanceView { id: string; kind: AcquaintanceKind; characterId: string | null; name: string; avatarUrl: string | null; description: string; sourcePageId: string; sourceSectionId: string; hidden: boolean; entries: AcquaintanceEntryView[]; notes: AcquaintanceNoteView[] }`
  - `interface AcquaintancesResponse { isDM: boolean; enabled: boolean; items: AcquaintanceView[] }`
  - `CreateAcquaintanceData`, `UpdateAcquaintanceData`, `CreateAcquaintanceEntryData`, `UpdateAcquaintanceEntryData`, `SaveAcquaintanceNoteData` — `z.infer` відповідних схем (Task 3), реекспорт у `types/acquaintances.ts`

- [ ] **Step 1: Моделі**

```prisma
model Acquaintance {
  id              String              @id @default(cuid())
  campaignId      String
  kind            String
  characterId     String?
  name            String
  avatarUrl       String?
  description     String              @default("")
  sourcePageId    String
  sourceSectionId String
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  campaign        Campaign            @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  character       Character?          @relation(fields: [characterId], references: [id], onDelete: SetNull)
  entries         AcquaintanceEntry[]
  notes           AcquaintanceNote[]

  @@index([campaignId, sourcePageId])
  @@index([characterId])
  @@map("acquaintances")
}

model AcquaintanceEntry {
  id             String       @id @default(cuid())
  acquaintanceId String
  pageId         String
  sectionId      String
  text           String
  sortOrder      Int          @default(0)
  createdAt      DateTime     @default(now())
  acquaintance   Acquaintance @relation(fields: [acquaintanceId], references: [id], onDelete: Cascade)

  @@index([acquaintanceId])
  @@index([pageId])
  @@map("acquaintance_entries")
}

model AcquaintanceNote {
  id             String       @id @default(cuid())
  acquaintanceId String
  authorUserId   String
  text           String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  acquaintance   Acquaintance @relation(fields: [acquaintanceId], references: [id], onDelete: Cascade)
  author         User         @relation(fields: [authorUserId], references: [id], onDelete: Cascade)

  @@unique([acquaintanceId, authorUserId])
  @@map("acquaintance_notes")
}
```
Рішення: `sourcePageId`/`pageId` — рядки без FK (секції живуть у JSON сторінки; видалення сторінки не повинно стирати знайомства — вони просто лишаються прихованими). `name` зберігається і для `character` (fallback, якщо персонажа видалено). Одна нотатка на автора (`@@unique`) — PUT-upsert.

- [ ] **Step 2: Міграція.** `pnpm exec prisma migrate dev --create-only --name acquaintances` → тека `20261111000000_acquaintances` (після `20261110000000_player_notifications` з частини B); після кожного `CREATE TABLE` — `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` для `acquaintances`, `acquaintance_entries`, `acquaintance_notes`. `ALTER TABLE "campaigns" ADD COLUMN "acquaintancesEnabled" BOOLEAN NOT NULL DEFAULT false` — expand-only. Застосувати `pnpm exec prisma migrate dev`, `pnpm exec prisma generate`.
- [ ] **Step 3: Run** `pnpm test:run prisma/__tests__/migrations-rls.test.ts && pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `feat(acquaintances): tables, campaign toggle, types`

---

### Task 2: Чиста видимість і «нові зіграні секції»

**Files:**
- Create: `lib/utils/acquaintances/visibility.ts`
- Modify: `lib/utils/scenario/reveal.ts`
- Test: `lib/utils/acquaintances/__tests__/visibility.test.ts`, `lib/utils/scenario/__tests__/reveal.test.ts`

**Interfaces:**
- Consumes: `PlayedLookup` (`lib/utils/scenario/reveal.ts`), view-типи (Task 1).
- Produces:
  - `interface AcquaintanceRecord { id; campaignId; kind: string; characterId: string | null; name: string; avatarUrl: string | null; description: string; sourcePageId: string; sourceSectionId: string; character: { name: string; avatar: string | null } | null; entries: { id; pageId; sectionId; text; sortOrder; createdAt: Date }[]; notes: { id; authorUserId; text; updatedAt: Date; author: { displayName: string } }[] }` (форма `include` зі store, Task 3)
  - `isAcquaintanceRevealed(a: { sourcePageId: string; sourceSectionId: string }, played: PlayedLookup): boolean`
  - `viewAcquaintances(rows: AcquaintanceRecord[], viewer: { userId: string; isDM: boolean }, played: PlayedLookup): AcquaintanceView[]`
  - `revealedAcquaintanceIds(rows: Pick<AcquaintanceRecord, "id" | "sourcePageId" | "sourceSectionId">[], played: PlayedLookup): string[]`
  - `newlyPlayedSections(before: ScenarioContent, after: ScenarioContent): string[]` (у `reveal.ts`)

- [ ] **Step 1: Тести (падають)** — `visibility.test.ts`:
  - гравець: знайомство з незіграною секцією відсутнє; зіграною — присутнє з `hidden: false`.
  - гравець: записи журналу лише зіграних секцій (різних сторінок), відсортовані `sortOrder`, потім `createdAt`.
  - гравець: нотатки лише власні (`own: true`), чужі відсутні.
  - DM: усі знайомства й записи, незіграні з `hidden: true`; усі нотатки з `authorName` і `own` за `userId`.
  - `kind: "character"` з `character` → `name`/`avatarUrl` з персонажа; `character: null` → власні `name`/`avatarUrl`.
  - невідома секція/сторінка (`played` → false) → гравцю не видно, DM — `hidden: true`.
  - сортування карток за `name` (`localeCompare(…, "uk")`).
  - `reveal.test.ts`: `newlyPlayedSections` — `false→true` повертається; `true→true`, `true→false`, нова секція з `played: false` — ні; нова секція одразу `played: true` — так.
- [ ] **Step 2: Run** `pnpm test:related lib/utils/acquaintances/visibility.ts lib/utils/scenario/reveal.ts` → FAIL.
- [ ] **Step 3: Реалізація** (жодних запитів; `played(pageId, sectionId)`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(acquaintances): pure visibility rule and newly played sections`

---

### Task 3: API знайомств — список, створення, зміна, видалення

**Files:**
- Create: `lib/schemas/acquaintances.ts`, `lib/server/acquaintances/store.ts`, `lib/server/acquaintances/handlers.ts`, `app/api/campaigns/[id]/acquaintances/route.ts`, `app/api/campaigns/[id]/acquaintances/[acquaintanceId]/route.ts`
- Modify: `lib/constants/api-errors.ts`, `messages/uk/errors.json`, `messages/en/errors.json`
- Test: `app/api/__tests__/acquaintances-api.test.ts`

**Interfaces:**
- Consumes: `viewAcquaintances` (Task 2), `loadPlayedSections`, `playedLookup`, `loadOwnedPage`, `readContentStrict`, `OWNED_WITH_CONTENT_SELECT`.
- Produces:
  - Zod: `createAcquaintanceSchema = z.object({ kind: z.enum(ACQUAINTANCE_KINDS), characterId: z.string().min(1).nullable().optional(), name: z.string().trim().min(1).max(120), description: z.string().max(4000).default(""), avatarUrl: z.string().url().max(2000).nullable().optional(), sourcePageId: z.string().min(1), sourceSectionId: z.string().min(1) }).refine((d) => d.kind !== "character" || !!d.characterId, { path: ["characterId"] })`; `updateAcquaintanceSchema` — `name`/`description`/`avatarUrl`/`characterId`/`kind` optional (джерело не змінюється); `createAcquaintanceEntrySchema = { pageId, sectionId, text: 1..2000 }`; `updateAcquaintanceEntrySchema = { text?, sortOrder?: int ≥ 0 }`; `saveAcquaintanceNoteSchema = { text: string max 4000 }` (порожній після trim → видалення)
  - `API_ERRORS.ACQUAINTANCES_DISABLED = "errors.acquaintancesDisabled"` («ДМ ще не відкрив знайомства» / «The DM has not opened acquaintances yet»), `ACQUAINTANCE_NOT_FOUND = "errors.acquaintanceNotFound"` («Знайомство не знайдено» / «Acquaintance not found»), `ACQUAINTANCE_ENTRY_NOT_FOUND = "errors.acquaintanceEntryNotFound"` («Запис не знайдено» / «Entry not found»)
  - store: `ACQUAINTANCE_INCLUDE` (character `{ name, avatar }`, entries, notes з `author: { select: { displayName: true } }`); `readAcquaintances(campaignId: string, viewer: { userId: string; isDM: boolean }): Promise<AcquaintancesResponse>`; `readAcquaintancesEnabled(campaignId: string): Promise<boolean>`; `assertSectionInCampaign(campaignId: string, pageId: string, sectionId: string): Promise<NextResponse | null>` (404 `SCENARIO_SECTION_NOT_FOUND` / `SCENARIO_NOT_FOUND`); `ownedAcquaintance(campaignId: string, id: string)` через `loadOwned(…, API_ERRORS.ACQUAINTANCE_NOT_FOUND)`
  - handlers: `listAcquaintancesHandler(campaignId)`, `createAcquaintanceHandler(req, campaignId)`, `updateAcquaintanceHandler(req, campaignId, acquaintanceId)`, `deleteAcquaintanceHandler(campaignId, acquaintanceId)`
  - маршрути: `GET|POST /api/campaigns/[id]/acquaintances`, `PATCH|DELETE /api/campaigns/[id]/acquaintances/[acquaintanceId]`

- [ ] **Step 1: Тести (падають)** — стиль `app/api/__tests__/world-notes-api.test.ts` (мок `api-auth`, `@/lib/db`, `@/lib/server/scenario/page-store` для `loadPlayedSections`).
  - GET гравець, `acquaintancesEnabled: false` → 403 з `errorKey: "errors.acquaintancesDisabled"`.
  - GET гравець, увімкнено → лише розкриті (мок `loadPlayedSections` повертає зіграні); `loadPlayedSections` викликано з унікальними `pageId` джерел і записів.
  - GET DM при вимкненому прапорці → 200, `enabled: false`, усі з `hidden`.
  - POST гравцем → 403 (`requireDM`).
  - POST DM: невідома сторінка → 404; невідома секція → 404; `kind: "character"` без `characterId` → 400; `characterId` іншої кампанії → 403 (`loadOwned`); успіх → 201, `create` з `campaignId` і джерелом.
  - PATCH DM не змінює `sourcePageId`/`sourceSectionId` навіть якщо передані (Zod їх відкидає — `data` без цих ключів).
  - DELETE DM → `delete`; знайомство іншої кампанії → 403; невідоме → 404.
- [ ] **Step 2: Run** `pnpm test:related lib/server/acquaintances/handlers.ts` → FAIL.
- [ ] **Step 3: Реалізація** — `withAccess`-обгортка як у `lib/server/world/note-handlers.ts`; GET: `requireCampaignAccess` → `readAcquaintancesEnabled` → (гравець і вимкнено → 403) → `findMany({ where: { campaignId }, include: ACQUAINTANCE_INCLUDE })` → `loadPlayedSections(campaignId, pageIds)` → `viewAcquaintances`. Мутації — `requireDM`; характер — `loadOwned(prisma.character.findUnique({ where: { id }, select: { campaignId: true, name: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND)`; для `kind: "character"` `name` за замовчуванням — ім'я персонажа. Відповідь мутацій — `AcquaintanceView` (DM-проєкція одного рядка).
- [ ] **Step 4: Run** → PASS; `pnpm test:run lib/constants/__tests__/api-errors-coverage.test.ts`; `pnpm test:run lib/i18n/__tests__/parity.test.ts`; `pnpm lint lib/server/acquaintances lib/schemas/acquaintances.ts "app/api/campaigns/[id]/acquaintances"`.
- [ ] **Step 5: Commit** — `feat(acquaintances): list/create/update/delete API with server-side visibility`

---

### Task 4: API журналу й нотаток

**Files:**
- Create: `lib/server/acquaintances/entry-handlers.ts`, `lib/server/acquaintances/note-handlers.ts`, `app/api/campaigns/[id]/acquaintances/[acquaintanceId]/entries/route.ts`, `…/entries/[entryId]/route.ts`, `…/[acquaintanceId]/note/route.ts`
- Test: `app/api/__tests__/acquaintances-api.test.ts` (нові `describe`)

**Interfaces:**
- Consumes: store (Task 3), `isAcquaintanceRevealed` (Task 2).
- Produces:
  - `createEntryHandler(req, campaignId, acquaintanceId)` → 201 `AcquaintanceEntryView`; `updateEntryHandler(req, campaignId, acquaintanceId, entryId)`; `deleteEntryHandler(campaignId, acquaintanceId, entryId)` — усі `requireDM`
  - `saveNoteHandler(req, campaignId, acquaintanceId)` → `AcquaintanceNoteView | { deleted: true }` — будь-який член; `PUT /api/campaigns/[id]/acquaintances/[acquaintanceId]/note`
  - маршрути: `POST …/entries`, `PATCH|DELETE …/entries/[entryId]`, `PUT …/note`

- [ ] **Step 1: Тести (падають)**
  - entry POST: невідома секція → 404; `sortOrder` = max + 1; запис чужого знайомства → 403; гравець → 403.
  - entry PATCH/DELETE: `entryId` іншого знайомства → 404 `errors.acquaintanceEntryNotFound`.
  - note PUT гравцем: вимкнено → 403; знайомство не розкрите → 404 `errors.acquaintanceNotFound` (без імені в тілі); розкрите → `upsert` з `where: { acquaintanceId_authorUserId: { acquaintanceId, authorUserId: "u1" } }`; порожній `text` → `deleteMany` власної нотатки, `{ deleted: true }`.
  - note PUT DM → дозволено навіть для прихованого (author = DM).
  - інший гравець ніколи не бачить чужу нотатку (перевірено в Task 2; тут — GET після PUT `u1` від імені `u2` не містить її).
- [ ] **Step 2: Run** `pnpm test:related lib/server/acquaintances/entry-handlers.ts lib/server/acquaintances/note-handlers.ts` → FAIL.
- [ ] **Step 3: Реалізація** (видимість для PUT гравця — `loadPlayedSections(campaignId, [a.sourcePageId])` + `isAcquaintanceRevealed`).
- [ ] **Step 4: Run** → PASS; `pnpm lint lib/server/acquaintances "app/api/campaigns/[id]/acquaintances"`.
- [ ] **Step 5: Commit** — `feat(acquaintances): journal entries and per-author notes API`

---

### Task 5: Розкриття → сповіщення

**Files:**
- Create: `lib/server/acquaintances/reveal.ts`
- Modify: `app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/section-handler.ts`, `lib/server/scenario/action-service.ts` (`writeScenarioContent`)
- Test: `lib/server/acquaintances/__tests__/reveal.test.ts`, `app/api/__tests__/scenario-section-reveal.test.ts`

**Interfaces:**
- Consumes: `notifyCampaignPlayers`, `notificationHref` (частина B), `newlyPlayedSections`, `revealedAcquaintanceIds` (Task 2), `loadPlayedSections`.
- Produces:
  - `notifyAcquaintanceReveal(campaignId: string, pageId: string, sectionIds: string[]): Promise<void>` — ніколи не кидає (`try/catch` + `logger.error("[acquaintances] reveal notify failed", { campaignId, pageId }, err)`)
  - `notifyRevealForContentChange(campaignId: string, pageId: string, before: ScenarioContent, after: ScenarioContent): Promise<void>` — `newlyPlayedSections` → порожньо: нічого; інакше `notifyAcquaintanceReveal`

Рішення: обидві точки запису «зіграно» — `PATCH …/sections/[sectionId]` (власний `updateMany`) і `writeScenarioContent` (збереження редактора, `restore`, AI/MCP `section.patch`) — викликають `notifyRevealForContentChange` після успішного `updateMany` (count > 0). Діф за вмістом, а не за `body.played`, тож нічого не пропускається й повторне «зіграно» без зміни не шле.

- [ ] **Step 1: Тести (падають)** — мок `@/lib/db`, `notifyCampaignPlayers`, `loadPlayedSections`.
  - вимкнений `acquaintancesEnabled` → `notifyCampaignPlayers` не викликано.
  - секція `s1` стала зіграною: знайомство з `sourceSectionId: s1` → один item `{ type: "acquaintance", refId: a1, href: "/campaigns/c1/acquaintances?focus=a1" }`.
  - новий запис журналу в `s1` для знайомства, вже розкритого раніше (`s0` зіграна) → item `a2`; для ще прихованого знайомства (`s9` не зіграна) → нічого.
  - знайомство й запис у тій самій секції → один item (без дубля refId).
  - `notifyCampaignPlayers` кидає → `notifyAcquaintanceReveal` резолвиться, `logger.error` викликано.
  - `scenario-section-reveal.test.ts`: PATCH `{ played: true }` для незіграної секції → `notifyRevealForContentChange` з before/after, де `s1` змінилась; PATCH для вже зіграної → у діфі порожньо (перевірити, що `notifyAcquaintanceReveal` не викликано, якщо мокаємо нижчий рівень); конфлікт версії (count 0) → не викликано.
- [ ] **Step 2: Run** `pnpm test:related lib/server/acquaintances/reveal.ts "app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/section-handler.ts" lib/server/scenario/action-service.ts` → FAIL.
- [ ] **Step 3: Реалізація** — `notifyAcquaintanceReveal`: `campaign.findUnique({ select: { acquaintancesEnabled } })`; знайомства `where: { campaignId, OR: [{ sourcePageId: pageId, sourceSectionId: { in } }, { entries: { some: { pageId, sectionId: { in } } } }] }`, `select: { id, sourcePageId, sourceSectionId }`; `loadPlayedSections` для їхніх `sourcePageId` (після запису — вже свіжі) → `revealedAcquaintanceIds` → `notifyCampaignPlayers({ campaignId, items })`. У `section-handler.ts` перед `return NextResponse.json(...)`: `await notifyRevealForContentChange(campaignId, pageId, content, next)`; у `writeScenarioContent` після перевірки `changed.count`: `await notifyRevealForContentChange(actor.campaignId, id, readContentStrict(page.content), content)`.
- [ ] **Step 4: Run** → PASS; наявні `app/api/__tests__/scenario-pages-api.test.ts`, `scenario-aux-api.test.ts` — додати `vi.mock("@/lib/server/acquaintances/reveal", …)`, якщо падають через новий `prisma`-виклик; `pnpm lint lib/server lib/server/scenario`.
- [ ] **Step 5: Commit** — `feat(acquaintances): notify players when a played section reveals acquaintances`

---

### Task 6: Перемикач DM і плитка кампанії

**Files:**
- Modify: `lib/schemas/campaigns.ts` (`updateCampaignSchema.acquaintancesEnabled: z.boolean().optional()`), `lib/server/campaigns/action-service.ts` (`CAMPAIGN_SETTINGS_SELECT`), `types/campaigns.ts` (обидва інтерфейси з `critChoiceByDm`), `lib/api/campaigns.ts` (тип оновлення), `components/campaigns/settings/CampaignSettingsDialog.tsx`, `components/campaigns/dashboard/CampaignSummaryPanel.tsx`, `lib/constants/campaign-dashboard.ts`, `lib/constants/notifications.ts`, `app/campaigns/[id]/page.tsx`
- Test: `components/campaigns/settings/__tests__/CampaignSettingsDialog.test.tsx`, `components/campaigns/dashboard/__tests__/DashboardGroups.test.tsx`, `app/api/__tests__/campaigns-api.test.ts` (PATCH)

**Interfaces:**
- Produces:
  - секція `{ key: "acquaintances", href: (id) => \`/campaigns/${id}/acquaintances\`, icon: Contact, title: "Знайомства", subtitle: "NPC, яких зустріли герої", keywords: ["npc", "персонажі", "журнал"], group: "game" }` у `DM_DASHBOARD_SECTIONS` і `{ …, group: "player" }` у `PLAYER_DASHBOARD_SECTIONS`
  - `dmDashboardSectionsFor`: `acquaintances` видимий як `info` — лише не в шаблоні (`CAMPAIGN_LEVEL_KEYS = new Set(["info", "acquaintances"])`)
  - `NOTIFICATION_TILE_TYPES.acquaintances = ["acquaintance"]`
  - `app/campaigns/[id]/page.tsx`: `hiddenKeys` для гравця = `[...(player?.hasWorld ? [] : ["player-world"]), ...(campaign.acquaintancesEnabled ? [] : ["acquaintances"])]`

- [ ] **Step 1: Тести (падають)**
  - діалог: чекбокс «Знайомства доступні гравцям» з початковим значенням; зміна потрапляє в payload збереження як `acquaintancesEnabled`.
  - PATCH кампанії з `{ acquaintancesEnabled: true }` → `update` отримує поле; гравець → 403 (наявна логіка).
  - `DashboardGroups`: DM у шаблоні — без плитки; DM у кампанії — з плиткою в групі «Гра»; гравець із `hiddenKeys: ["acquaintances"]` — без плитки.
- [ ] **Step 2: Run** `pnpm test:related components/campaigns/settings/CampaignSettingsDialog.tsx lib/constants/campaign-dashboard.ts lib/schemas/campaigns.ts` → FAIL.
- [ ] **Step 3: Реалізація** (поле — поряд із `critChoiceByDm` в усіх місцях; `grep -rn critChoiceByDm lib/server/campaigns lib/schemas types lib/api components/campaigns` як чекліст; створення кампанії поле не приймає — за замовчуванням `false`).
- [ ] **Step 4: Run** → PASS; `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(acquaintances): DM toggle and campaign tile`

---

### Task 7: Mention-тип `acquaintance`

**Files:**
- Modify: `lib/constants/scenario.ts` (`MENTION_TYPES` + `"acquaintance"`, `MENTION_LABELS.acquaintance = "Знайомство"`), `lib/utils/scenario/mention-href.ts`, `lib/server/scenario/mentions.ts`
- Test: `lib/utils/scenario/__tests__/mention-href.test.ts`, `lib/utils/scenario/__tests__/markdown.test.ts`, `components/scenario/__tests__/scenario-rich-text.test.tsx`, `app/api/__tests__/scenario-aux-api.test.ts` (mentions)

**Interfaces:**
- Produces: `mentionHref(c, "acquaintance", id)` → `/campaigns/${c}/acquaintances?focus=${id}`; `searchScenarioMentions` повертає групу `"acquaintance"` з `prisma.acquaintance.findMany(args)` (поле `name` — те саме `args`). `MentionType` розширюється автоматично (`types/scenario.ts` виводить з константи).

- [ ] **Step 1: Тести (падають)**: href вище; `markdown.test.ts` — round-trip mention-вузла `{ type: "mention", attrs: { id: "a1", label: "Ярема", type: "acquaintance" } }` (як наявний кейс із `character`); `ScenarioRichText` з `linkMentions` рендерить посилання на `?focus=a1`; mentions-пошук повертає `{ type: "acquaintance", id, label }`.
- [ ] **Step 2: Run** `pnpm test:related lib/constants/scenario.ts lib/utils/scenario/mention-href.ts lib/server/scenario/mentions.ts` → FAIL.
- [ ] **Step 3: Реалізація** (у `mentionHref` гілка до мапи `dm/<section>`).
- [ ] **Step 4: Run** → PASS (у т.ч. `components/scenario/editor/__tests__/mention-suggestion.test.ts`).
- [ ] **Step 5: Commit** — `feat(scenario): acquaintance mention type`

---

### Task 8: Клієнт — API і хуки

**Files:**
- Create: `lib/api/acquaintances.ts`, `lib/hooks/acquaintances/{keys.ts,index.ts,useAcquaintances.ts,useAcquaintanceActions.ts,useAcquaintanceNote.ts}`
- Test: `lib/hooks/acquaintances/__tests__/acquaintance-hooks.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Produces:
  - API: `getAcquaintances(c): Promise<AcquaintancesResponse>`, `createAcquaintance(c, data: CreateAcquaintanceData): Promise<AcquaintanceView>`, `updateAcquaintance(c, id, data: UpdateAcquaintanceData)`, `deleteAcquaintance(c, id)`, `createAcquaintanceEntry(c, id, data)`, `updateAcquaintanceEntry(c, id, entryId, data)`, `deleteAcquaintanceEntry(c, id, entryId)`, `saveAcquaintanceNote(c, id, data: SaveAcquaintanceNoteData)` — через `campaignGet/Post/Patch/Put/Delete`
  - `acquaintanceKeys = { list: (campaignId: string) => ["acquaintances", campaignId] as const }`
  - `useAcquaintances(campaignId: string, options?: { enabled?: boolean })` → `UseQueryResult<AcquaintancesResponse>`
  - `useAcquaintanceActions(campaignId: string)` → `{ create, update, remove, addEntry, updateEntry, removeEntry }` (`useCrudMutation`, `invalidateKeys: [acquaintanceKeys.list(c)]`, `errorText` українською, `create.mutateAsync` повертає `AcquaintanceView`)
  - `useAcquaintanceNote(campaignId: string, acquaintanceId: string)` → `{ save(text: string): Promise<void>; isPending: boolean }` — оптимістично оновлює власну нотатку в кеші

- [ ] **Step 1: Тести (падають)** (мок `@/lib/api/acquaintances`): `create` інвалідує список; `save("")` прибирає власну нотатку з кешу оптимістично, на помилку повертає попередній стан; `useAcquaintances` використовує `acquaintanceKeys.list`.
- [ ] **Step 2–4:** Run `pnpm test:related lib/hooks/acquaintances/index.ts` → FAIL → реалізація → PASS; `pnpm lint lib/api/acquaintances.ts lib/hooks/acquaintances`.
- [ ] **Step 5: Commit** — `feat(acquaintances): client api and hooks`

---

### Task 9: Редактор — кнопка й діалог «Знайомство»

**Files:**
- Create: `components/scenario/editor/AcquaintanceDialog.tsx`
- Modify: `components/scenario/editor/ScenarioToolbar.tsx`, `components/scenario/editor/ScenarioEditor.tsx`
- Test: `components/scenario/editor/__tests__/acquaintance-dialog.test.tsx`, `components/scenario/editor/__tests__/scenario-editor.test.tsx`

**Interfaces:**
- Consumes: `useAcquaintances`, `useAcquaintanceActions` (Task 8), `CharacterSelect`, `IconUrlField`, `EntityIcon`, `ResponsiveDialog`, `useConfirm`.
- Produces:
  - `ScenarioToolbar({ editor, onAcquaintance }: { editor: Editor | null; onAcquaintance?: () => void })` — кнопка `Tool label="Знайомство"` з іконкою `Contact`; активна, коли курсор на mention з `type: "acquaintance"` (`e.isActive("mention", { type: "acquaintance" })`)
  - `type AcquaintanceDialogTarget = { mode: "create"; name: string; pageId: string; sectionId: string } | { mode: "edit"; id: string; pageId: string; sectionId: string }`
  - `AcquaintanceDialog({ campaignId, target, sections, onInsert, onClose }: { campaignId: string; target: AcquaintanceDialogTarget; sections: { id: string; title: string }[]; onInsert: (m: { id: string; label: string }) => void; onClose: () => void })`
  - `ScenarioEditor`: `ActiveCell` отримує `sectionId`; стан `acqTarget` + збережений діапазон `{ from, to }` виділення на момент відкриття

Поведінка:
- Відкриття: якщо курсор на чипі знайомства → `edit` з його `id`; інакше `create` з `name` = виділений текст (`state.doc.textBetween(from, to).trim()`), секція = активна.
- `create`: блок «Наявні» (пошук `useSearch` за `name` по `useAcquaintances(…).data.items`) — клік вставляє наявний чип; форма: «Мікро-NPC» / «Повний NPC» (`CharacterSelect`), ім'я, опис (`Textarea`), аватар (`IconUrlField`); «Створити» → `create.mutateAsync({ …, sourcePageId, sourceSectionId })` → `onInsert({ id, label: name })`.
- `edit`: ті самі поля + «Джерело: <назва секції або «інша сторінка»>» (тільки показ), журнал (список записів з назвою секції, «Видалити» через `useConfirm`), «Додати запис» (секція — select з `sections`, за замовчуванням поточна; текст), «Видалити знайомство» з `useConfirm` («Чипи в тексті лишаться, але не вестимуть нікуди»).
- `onInsert` у `ScenarioEditor`: `editor.chain().focus().insertContentAt({ from, to }, { type: "mention", attrs: { id, label, type: "acquaintance" } }).run()`.

- [ ] **Step 1: Тести (падають)** (мок хуків):
  - `create` з `name: "Ярема"` — поле імені заповнене; «Створити» → `create.mutateAsync` з `sourcePageId`/`sourceSectionId` і `kind: "micro"`, потім `onInsert({ id: "a1", label: "Ярема" })`.
  - «Повний NPC» без вибраного персонажа — «Створити» вимкнена.
  - клік по наявному в «Наявні» → `onInsert` з його `id`, `create` не викликано.
  - `edit`: «Додати запис» з секцією за замовчуванням = `target.sectionId` → `addEntry.mutateAsync({ pageId, sectionId, text })`; «Видалити знайомство» без підтвердження нічого не робить (`ConfirmProvider` з `render-with-confirm.tsx`).
  - `scenario-editor.test.tsx`: кнопка «Знайомство» вимкнена без активної клітинки; відкриває діалог із виділеним текстом.
- [ ] **Step 2: Run** `pnpm test:related components/scenario/editor/AcquaintanceDialog.tsx components/scenario/editor/ScenarioEditor.tsx` → FAIL.
- [ ] **Step 3: Реалізація** (`ResponsiveDialog hud`, кнопки у `footer`, submit з `form="acquaintance-form"`).
- [ ] **Step 4: Run** → PASS; `pnpm lint components/scenario/editor`.
- [ ] **Step 5: Commit** — `feat(scenario): acquaintance tool in the editor`

---

### Task 10: Таб «Знайомства»

**Files:**
- Create: `app/campaigns/[id]/acquaintances/page.tsx`, `app/campaigns/[id]/acquaintances/page-client.tsx`, `components/acquaintances/AcquaintanceCard.tsx`, `components/acquaintances/AcquaintanceNoteEditor.tsx`
- Test: `components/acquaintances/__tests__/acquaintance-card.test.tsx`, `app/campaigns/[id]/acquaintances/__tests__/page-client.test.tsx`

**Interfaces:**
- Consumes: `readAcquaintances` (Task 3), `acquaintanceKeys`, `useAcquaintances`, `useAcquaintanceNote` (Task 8), `useSeenOnOpen`, `NewPill` (частина B).
- Produces:
  - `page.tsx` (server): `requireCampaignMember(id)` → гравець і `!campaign.acquaintancesEnabled` → `redirect(\`/campaigns/${id}\`)`; `const data = await readAcquaintances(id, { userId, isDM })` (пряме читання, як `readCampaignOnboarding`, без HTTP); `<PrefetchedQuery queryKey={acquaintanceKeys.list(id)} data={data}><AcquaintancesPageClient campaignId={id} isDM={isDM} focusId={focus} /></PrefetchedQuery>`
  - `AcquaintancesPageClient({ campaignId, isDM, focusId })`: `HudPage` + `HudPageHeader title="Знайомства"`, `SearchInput` + `useSearch(items, (a) => [a.name, a.description])`, `QueryState`, сітка `AcquaintanceCard`; `const fresh = useSeenOnOpen(campaignId, { types: ["acquaintance"], enabled: !isDM })`; `focusId` → `scrollIntoView` + підсвітка картки; DM без перемикача бачить `HudPanel` «Гравці ще не бачать цей розділ — увімкни в налаштуваннях кампанії».
  - `AcquaintanceCard({ campaignId, item, flags }: { campaignId: string; item: AcquaintanceView; flags: { isDM: boolean; isNew: boolean; focused: boolean } })` — `HudCard`: `EntityIcon` аватар, ім'я, `NewPill` якщо `isNew`, `HudPill tone="muted"` «Приховано» якщо `hidden`, опис, журнал (приховані записи DM — з позначкою), нотатки: гравцю — `AcquaintanceNoteEditor` власної; DM — список усіх з `authorName` + власна.
  - `AcquaintanceNoteEditor({ campaignId, acquaintanceId, initial })` — `Textarea` + «Зберегти» (`useAcquaintanceNote`).

- [ ] **Step 1: Тести (падають)**
  - картка гравця: показує лише свою нотатку і редактор; немає «Приховано».
  - картка DM: «Приховано» для `hidden`, нотатки з іменами авторів.
  - `isNew` → `common.notifications.new` (ключ з глобального мока `t`).
  - page-client: пошук фільтрує за іменем; порожній результат → `SearchEmptyState`; `useSeenOnOpen` викликано з `enabled: false` для DM.
- [ ] **Step 2: Run** `pnpm test:related components/acquaintances/AcquaintanceCard.tsx "app/campaigns/[id]/acquaintances/page-client.tsx"` → FAIL.
- [ ] **Step 3: Реалізація** (`searchParams.focus` у `page.tsx`; фон розділу — без маркера, тобто таверна).
- [ ] **Step 4: Run** → PASS; `pnpm lint components/acquaintances "app/campaigns/[id]/acquaintances"`; `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(acquaintances): acquaintances tab with notes and new pills`

---

### Task 11: Онбординг, документація, фінальна перевірка

**Files:**
- Modify: `lib/onboarding/whats-new.ts`, `lib/onboarding/help/player.ts`, `lib/onboarding/help/dm.ts`, `docs/architecture/README.md`, `docs/STATUS.md`
- Create: `docs/architecture/acquaintances.md`

- [ ] **Step 1: Онбординг**
  - `WHATS_NEW` (на початок): `{ id: "2026-10-28-acquaintances", date: "2026-10-28", audience: "all", title: "Знайомства", body: "ДМ виділяє ім'я NPC у тексті сценарію й робить його знайомством: ім'я, портрет, опис і журнал зустрічей. Гравці бачать знайомство, щойно ДМ позначить сцену зіграною, і можуть вести власні нотатки. ДМ вмикає розділ у налаштуваннях кампанії.", href: "/help/player-acquaintances" }`
  - `PLAYER_ARTICLES`: `slug: "player-acquaintances"`, розділи «Що таке знайомства» (коли з'являються, золота позначка «нове»), «Нотатки» (бачиш ти й ДМ, інші гравці — ні).
  - `DM_ARTICLES`: `slug: "dm-acquaintances"` — «Як створити» (виділення → «Знайомство», мікро або повний NPC, `@`-згадка вставляє наявне), «Коли гравці бачать» (секція зіграна, запис журналу — своя секція, перемикач), «Видалення» (чип ≠ знайомство).
  - тест реєстру `lib/onboarding/__tests__/registry.test.ts` має пройти (кожен `helpSlug`/`href` існує).
- [ ] **Step 2: Документація**
  - `docs/architecture/acquaintances.md` (укр., ≤ 40 рядків): таблиці й чому `sourcePageId` без FK; правило видимості (`viewAcquaintances`, `loadPlayedSections`, DM `hidden`); дві точки розкриття (`section-handler.ts`, `writeScenarioContent`) через `notifyRevealForContentChange`, діф `newlyPlayedSections`, ввімкнення перемикача сповіщень не шле; нотатки (одна на автора, PUT-upsert); mention-тип `acquaintance` і `?focus=`; як додати поле.
  - рядок у `docs/architecture/README.md`; рядок у `docs/STATUS.md` (гілка `feat/acquaintances`: частини B і A готові локально; лишилось `/simplify`, браузерна перевірка DM+гравець, merge — за дозволом).
- [ ] **Step 3: Повна перевірка**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm test:run`
Expected: 0 errors, усі тести PASS.

- [ ] **Step 4: Commit** — `docs(acquaintances): help, whats-new, architecture, status`

---

## Self-review

- Spec coverage: таблиці + прапорець + RLS (T1); видимість чистою функцією, фільтр на сервері, 403 при вимкненому (T2, T3); журнал за секціями (T2, T4); нотатки автор+DM (T2, T4, T10); розкриття в мутації «зіграно» → сповіщення гравцям без дублів (T5 + B); mention `acquaintance`, тулза, сайдбар, повторна згадка, видалення лише з `useConfirm` (T7, T9); таб із `PrefetchedQuery`/`HudPage`/`useSearch` (T10); перемикач DM і плитка (T6); whats-new + довідка + docs + STATUS (T11).
- Відхилення від спеки, зафіксовані як рішення: для `kind: "character"` опис береться з самого знайомства (у `Character` немає публічного опису — лише приватні `notes`); аватар — URL (`IconUrlField`), без завантаження файлу; повним NPC може бути будь-який персонаж кампанії (наявний `CharacterSelect` не фільтрує за типом).
