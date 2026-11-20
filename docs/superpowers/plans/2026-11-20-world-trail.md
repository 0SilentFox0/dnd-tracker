# Карта світу: сесії і слід героїв — план реалізації

> **Для виконавців:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Реалізатори — Sonnet; **агенти тести пишуть, але не запускають** (один повний `test:run` + tsc + cycles робить контролер в кінці). Оглядів після кожної задачі немає, один фінальний огляд Opus. Кроки — чекбокси.

**Мета:** іменовані сесії, лінії слідів з бульбашкою, drag піна героя, DM-only піни ворогів.

**Архітектура:** сліди будуються з `world_travel_log` + `sessionId`; сесії й вороги — нові таблиці; drag використовує наявний `travel`; приватність ворогів — окрема таблиця, яку читає лише DM-відповідь.

**Spec:** `docs/superpowers/specs/2026-11-20-world-trail-design.md` (читати цілком; таблиця reuse там же).

## Global Constraints

- Шари: route → `lib/api/world.ts` → хук у `lib/hooks/world/` (імпорт з барелю) → `types/world.ts`. Компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch`. Ключі запитів — лише `worldKeys` (kebab-case).
- Роути тонкі: `parseBody(schema, req)` + `withDM`/`requireCampaignAccess` + `loadOwned`/`ownedMap`; помилки `{ error, issues? }` з `lib/constants/api-errors.ts` (+ `messages/{uk,en}/errors.json`).
- Міграція expand-only, кожна `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY`; назва `20261221000000_world_sessions_enemy_pins`. Схема в `prisma/schema/core.prisma`.
- Алиас `@/…`; без циклів (`pnpm cycles`); `lib/utils` не імпортує `lib/server`.
- Кирилиця в коді/коментарях заборонена; тексти лише в `messages/{uk,en}/world.json`. Коментарів мінімум, англійською, лише «чому».
- Egress: один запит trail на карту, інвалідація існуючим `world-changed`, без нового поллінгу.
- Файли тестів — у сусідніх `__tests__/`; UI-тести з DOM мають `// @vitest-environment happy-dom`.
- Не чіпати підпроєкт 3 (шари), `campaign_shows`, фільтри `buildWorldView`.

## Review Focus

- Гравець просить trail карти, якої не знає → така сама відмова, що й `view` (404), без витоку назв сесій.
- Дві одночасні «Нова сесія» → рівно одна активна (409 для програвшого), без 500.
- Видалення активної сесії → наступний рух пишеться з `sessionId = null`, а не падає.
- Запис журналу з `from = null`, `from == to`, або з іншої карти → лише вузол, без NaN-відрізка.
- Drag героя, що ще не має позиції / стоїть на іншій карті, drop поза картою, drop у ту саму точку → без запиту й без винятку.
- Координати піна ворога поза 0..1 або чужа карта → 400/404; ворог не з'являється в `view`, `trail`, show для гравця.

---

### Task 1: Схема, міграція, константи, типи, Zod, коди помилок

**Files:** Modify `prisma/schema/core.prisma`, `lib/constants/world.ts`, `lib/constants/api-errors.ts`, `messages/{uk,en}/errors.json`, `types/world.ts`, `lib/schemas/world.ts`. Create `prisma/migrations/20261221000000_world_sessions_enemy_pins/migration.sql`.

**Interfaces — Produces (імена фіксовані, їх використовують всі наступні задачі):**
- Prisma: `WorldSession { id, campaignId, name, description?, color, startedAt, endedAt?, createdAt, logs WorldTravelLog[] }` `@@map("world_sessions")`; `WorldTravelLog.sessionId String?` (`onDelete: SetNull`, `@@index([sessionId])`); `WorldEnemyPin { id, mapId, name, icon?, color?, dmNote?, x, y, createdAt, updatedAt }` `@@map("world_enemy_pins")`, `@@index([mapId])`.
- SQL: обидві таблиці + `ENABLE ROW LEVEL SECURITY`; часткований унікальний індекс `world_sessions_one_active ON world_sessions("campaignId") WHERE "endedAt" IS NULL`; `ALTER TABLE world_travel_log ADD COLUMN "sessionId" TEXT` + FK + індекс. У схемі над `WorldSession` коментар про індекс, якого Prisma не описує.
- Константи: `WORLD_SESSION_NAME_MAX = WORLD_NAME_MAX`, `WORLD_SESSION_DESCRIPTION_MAX = 600`, `MAX_WORLD_SESSIONS = 200`, `MAX_WORLD_ENEMY_PINS = 200`, `TRAIL_ENTRY_LIMIT = 500`, `WORLD_SESSION_COLORS: readonly string[]` (8 hex), `WORLD_NO_SESSION_COLOR` (сірий), `HERO_DRAG_THRESHOLD_PX = 6`.
- `API_ERRORS`: `WORLD_SESSION_NOT_FOUND` (404), `WORLD_SESSION_CONFLICT` (409), `WORLD_SESSION_LIMIT` (409), `WORLD_ENEMY_NOT_FOUND` (404), `WORLD_ENEMY_LIMIT` (409) + ключі в `errors.json` обох локалей.
- Типи в `types/world.ts`:
  ```ts
  export interface WorldSession { id: string; name: string; description: string | null; color: string; startedAt: string; endedAt: string | null; active: boolean }
  export interface TrailEntry { id: string; sessionId: string | null; kind: TravelKind; heroes: { id: string; name: string }[]; from: MapPoint | null; to: MapPoint; at: string }
  export interface WorldTrailData { sessions: WorldSession[]; entries: TrailEntry[] }
  export interface WorldEnemyPin { id: string; mapId: string; name: string; icon: string | null; color: string | null; dmNote: string | null; x: number; y: number }
  export type CreateEnemyData = { name: string; x: number; y: number; icon?: string; color?: string; dmNote?: string }
  export type UpdateEnemyData = Partial<CreateEnemyData>
  export type CreateSessionData = { name: string; description?: string; color?: string }
  export type UpdateSessionData = Partial<CreateSessionData> & { end?: true }
  ```
  `WorldMapDetail` отримує `enemies?: WorldEnemyPin[]`. `WorldTravelEntry` не змінюється.
- Zod (`lib/schemas/world.ts`): `createSessionSchema`, `updateSessionSchema` (`end: z.literal(true).optional()`), `createEnemySchema`, `updateEnemySchema` (`x`,`y` через наявний `coord` 0..1; name `.trim().min(1).max(WORLD_NAME_MAX)`; description/dmNote ліміти з констант).

- [ ] Додати схему, SQL, константи, типи, Zod, помилки. `pnpm exec prisma generate`; `pnpm exec prisma migrate dev` НЕ запускати без контролера — лише переконатися, що `prisma validate` проходить (контролер застосує на локальній БД).
- [ ] Тест `lib/schemas/__tests__/world-trail.test.ts`: валідні/невалідні payload (порожнє ім'я, x=1.2, довгий опис, `end:false`).
- [ ] Commit `feat(world): sessions and enemy pins schema`.

### Task 2: Чиста логіка слідів і drag

**Files:** Create `lib/utils/world/trail.ts`, `lib/utils/world/hero-drag.ts`; Test `lib/utils/world/__tests__/trail.test.ts`, `hero-drag.test.ts`.

**Interfaces — Produces:**
```ts
// trail.ts
export interface TrailNode { entryId: string; x: number; y: number; kind: TravelKind; at: string; heroes: { id: string; name: string }[] }
export interface TrailSegment { entryId: string; from: MapPoint; to: MapPoint }
export interface Trail { sessionId: string | null; nodes: TrailNode[]; segments: TrailSegment[] }
export function buildTrails(entries: TrailEntry[], aspect: number): Trail[]   // групує за sessionId; порядок за `at`; сесії за першим входом
export function filterTrailForViewer(rows: TrailRow[], ownIds: ReadonlySet<string>): TrailEntry[]
// TrailRow = { id; sessionId; kind; characterIds: string[]; names: Map<string,string>; from: MapPoint|null; to: MapPoint; createdAt: Date }
// hero-drag.ts
export function dragGroup(clusterIds: string[], selected: string[]): string[]
export function exceedsDragThreshold(start: {x:number;y:number}, now: {x:number;y:number}, px?: number): boolean
export function dropIsNoop(group: {x:number;y:number}[], to: MapPoint, eps?: number): boolean
```
Правила: відрізок лише для `kind === 'travel'` з `from` ≠ `to` (відстань > ε з урахуванням `aspect`); `enter/exit/rest` — лише вузол; послідовні вузли в межах ε зливаються. `filterTrailForViewer`: рядок без власних героїв відкидається; усі герої власні → повний запис; змішаний → `from: null`, `heroes` лише власні. `dragGroup`: якщо `clusterIds` перетинається з `selected` → `selected ∪ clusterIds`, інакше `clusterIds`.

- [ ] Тести (TDD): відрізки/вузли; `from` null; `from==to`; `enter/exit/rest`; злиття; порядок; кілька сесій + `null`; фільтр гравця (власний, змішаний, чужий); `dragGroup` (вибраний, невибраний, кластер); поріг; no-op.
- [ ] Реалізація; commit `feat(world): trail building and hero drag utils`.

### Task 3: Сервер — сесії + штамп у журналі

**Files:** Create `lib/server/world/session-store.ts`, `session-handlers.ts`, `app/api/campaigns/[id]/world/sessions/route.ts`, `.../sessions/[sessionId]/route.ts`; Modify `lib/server/world/travel-store.ts` (`commitTravel`, `writeRestLog`), `lib/server/world/world-events.ts` (без змін сигнатури; використовуємо `publishWorldChanged(campaignId, null)`); Test `lib/server/world/__tests__/session-handlers.test.ts`, `travel-session-stamp.test.ts`.

**Interfaces — Produces:**
```ts
// session-store.ts
export const toWorldSession = (row: WorldSessionRow): WorldSession
export const listSessions = (campaignId: string): Promise<WorldSession[]>           // новіші першими
export const activeSessionId = (campaignId: string): Promise<string | null>
export const startSession = (campaignId: string, data: CreateSessionData): Promise<WorldSession>  // tx: закрити активну, створити нову; P2002 → кидає WORLD_SESSION_CONFLICT; ліміт MAX_WORLD_SESSIONS; колір за замовчуванням = наступний із WORLD_SESSION_COLORS за кількістю
// session-handlers.ts
export const sessionsListHandler(campaignId): Promise<NextResponse>   // GET
export const sessionStartHandler(req, campaignId): Promise<NextResponse>   // POST
export const sessionPatchHandler(req, campaignId, sessionId)   // name/description/color/end
export const sessionDeleteHandler(campaignId, sessionId)       // записи журналу лишаються (FK SetNull)
```
Усе через `withDM`; сесія іншої кампанії → `loadOwned` + `WORLD_SESSION_NOT_FOUND`; після змін `publishWorldChanged(campaignId, null)`. `commitTravel`/`writeRestLog` читають `activeSessionId` безпосередньо перед записом і кладуть `sessionId` у `worldTravelLog.create` (`null` без активної).

- [ ] Тести: старт закриває попередню; P2002 → 409; ліміт; PATCH `end`; DELETE обнуляє `sessionId`, записи на місці; чужа кампанія; `commitTravel` і `writeRestLog` ставлять `sessionId` / `null`.
- [ ] Реалізація; commit `feat(world): sessions API and travel log stamping`.

### Task 4: Сервер — ендпоінт trail

**Files:** Create `lib/server/world/trail-handlers.ts`, `app/api/campaigns/[id]/world/trail/route.ts`; Test `lib/server/world/__tests__/trail-handlers.test.ts`.

**Interfaces:**
- Consumes: `filterTrailForViewer` (T2), `listSessions` (T3), `readViewerScope` / доступ до карти як у `viewHandler` (`view-handlers.ts`), `activePlayerHeroes`.
- Produces: `trailHandler(req: Request, campaignId: string): Promise<NextResponse>` — `GET ?mapId=` → `WorldTrailData`. DM: усі сесії, усі записи `where { campaignId, mapId }`, `take TRAIL_ENTRY_LIMIT`, `desc` потім розвернути. Гравець: ті самі правила видимості карти, що й `viewHandler` (невідома карта → 404 `WORLD_MAP_NOT_FOUND`); власні герої через `controlledBy`; записи через `filterTrailForViewer`; сесії — лише ті, що є у видимих записах, без полів ДМ (у `WorldSession` їх і немає).

- [ ] Тести: DM бачить усе; гравець — лише власні, змішаний без `from`, без чужих імен; невідома карта → 404; сесії без видимих записів не віддаються; порожній результат.
- [ ] Реалізація; commit `feat(world): trail endpoint with viewer filtering`.

### Task 5: Сервер — вороги

**Files:** Create `lib/server/world/enemy-store.ts`, `enemy-handlers.ts`, `app/api/campaigns/[id]/world/maps/[mapId]/enemies/route.ts`, `.../enemies/[enemyId]/route.ts`; Modify `lib/server/world/map-handlers.ts` / `map-store.ts` (DM-гілка деталі карти додає `enemies`); Test `lib/server/world/__tests__/enemy-handlers.test.ts`, `enemy-privacy.test.ts`.

**Interfaces — Produces:**
```ts
export const listEnemies = (mapId: string): Promise<WorldEnemyPin[]>
export const enemyCreateHandler(req, campaignId, mapId)    // POST, ліміт MAX_WORLD_ENEMY_PINS на карту
export const enemyPatchHandler(req, campaignId, mapId, enemyId)
export const enemyDeleteHandler(campaignId, mapId, enemyId)
```
`withDM`, `ownedMap`; ворог іншої карти/кампанії → `WORLD_ENEMY_NOT_FOUND`. Перш ніж додавати `enemies` в деталь карти, переконатися, яка відповідь гравцю йде з того ж GET (якщо спільна — гілка за `isDM`); гравецькі шляхи (`viewHandler`, `buildWorldView`, show) таблицю не читають.

- [ ] Тести: CRUD, ліміт, чужа карта, координати поза 0..1 → 400; **приватність**: відповідь `viewHandler` для гравця й `trail` не містять ворога (створити ворога, перевірити JSON-рядок відповіді на ім'я/id).
- [ ] Реалізація; commit `feat(world): DM-only enemy pins API`.

### Task 6: Клієнт — api, ключі, хуки

**Files:** Modify `lib/api/world.ts`, `lib/hooks/world/keys.ts`, `lib/hooks/world/index.ts`, `lib/hooks/world/useWorldTravel.ts` (`worldKeysFor` + `worldKeys.trailAll`); Create `lib/hooks/world/useWorldSessions.ts`, `useWorldTrail.ts`, `useWorldEnemies.ts`, `useHeroSelection.ts`; Modify `lib/hooks/world/useTravelPanel.ts` (приймає `selection?: HeroSelection`, інакше створює свій; поведінка без змін); обробник `world-changed` у `usePusherShowSync` інвалідує `worldKeys.trailAll`; Test `lib/hooks/world/__tests__/useHeroSelection.test.ts`, `useWorldSessions.test.ts`.

**Interfaces — Produces:**
```ts
// lib/api/world.ts
getSessions(campaignId): Promise<WorldSession[]>; startSession(campaignId, data: CreateSessionData): Promise<WorldSession>
updateSession(campaignId, id, data: UpdateSessionData): Promise<WorldSession>; deleteSession(campaignId, id): Promise<{ok:true}>
getTrail(campaignId, mapId): Promise<WorldTrailData>
createEnemy(campaignId, mapId, data: CreateEnemyData): Promise<WorldEnemyPin>; updateEnemy(campaignId, mapId, id, data: UpdateEnemyData): Promise<WorldEnemyPin>; deleteEnemy(campaignId, mapId, id): Promise<{ok:true}>
// keys.ts
worldKeys.sessions(campaignId); worldKeys.trailAll(campaignId); worldKeys.trail(campaignId, mapId)
// hooks
useWorldSessions(campaignId): { list: UseQueryResult<WorldSession[]>; start; update; remove; active: WorldSession | undefined }   // мутації через useCrudMutation
useWorldTrail(campaignId, mapId, enabled?): UseQueryResult<WorldTrailData>   // staleTime 15_000
useWorldEnemies(campaignId, mapId): { create; update; remove }   // інвалідують worldKeys.map(campaignId, mapId)
export interface HeroSelection { selected: string[]; toggle(id: string): void; setOnly(ids: string[]): void; allSelected: boolean; selectAll(): void }
useHeroSelection(heroes: RosterHero[]): HeroSelection
```
Мутації сесій інвалідують `sessions` і `trailAll`.

- [ ] Тести `useHeroSelection` (toggle, setOnly, фільтр зниклих героїв), мутація старту сесії інвалідує ключі.
- [ ] Реалізація; commit `feat(world): client api and hooks for sessions, trail, enemies`.

### Task 7: UI — лінії слідів, бульбашка, легенда

**Files:** Create `components/world/map/WorldTrails.tsx`, `components/world/nav/TrailBubble.tsx`, `components/world/nav/TrailLegend.tsx`, `lib/hooks/world/useTrailView.ts` (`useTrailView(trails, aspect): { visible: Set<string|null>; toggle; selected: {entryId}|null; select; clear }`); Modify `components/world/map/WorldMapView.tsx` (проп `trails?: { trails: Trail[]; sessions: WorldSession[]; visible: ReadonlySet<string | null>; onSelect(entryId: string): void }`, шар між зонами й героями), DM-сторінку `app/campaigns/[id]/dm/world/page-client.tsx` і клієнт гравця `components/world/play/*` (підключити `useWorldTrail` + `buildTrails` + легенду); Test `components/world/map/__tests__/WorldTrails.test.tsx`, `components/world/nav/__tests__/TrailLegend.test.tsx`.

**Interfaces:** Consumes `buildTrails` (T2), `useWorldTrail` (T6), `useMarkerBubblePosition`. Лінії `vector-effect: non-scaling-stroke`, колір сесії або `WORLD_NO_SESSION_COLOR`; вузли — кружки, останній вузол акцентований; клік по лінії/вузлу → `TrailBubble` (назва сесії або «Без сесії», опис, дата через `useFormatter`, герої, тип кроку), закривається Escape / кліком поза. Легенда: чипи з кольором і перемикачем (локальний стан); тільки сесії, що мають записи на цій карті. `role`/`aria-label` на чипах і вузлах.

- [ ] Тести: рендер сегментів/вузлів, ховання вимкненої сесії, клік → колбек, легенда перемикає.
- [ ] Реалізація; commit `feat(world): trail layer, bubble and legend`.

### Task 8: UI — панель сесій (DM)

**Files:** Create `components/world/travel/SessionsPanel.tsx`, `components/world/travel/SessionFormDialog.tsx`, `lib/hooks/world/useSessionForm.ts`; Modify `app/campaigns/[id]/dm/world/page-client.tsx` (панель у режимі «Грати» поряд із `TravelPanel`), `components/world/travel/TravelPanel.tsx` (підказка «Почніть сесію», коли активної немає; новий необов'язковий проп `hasActiveSession?: boolean`; `components/show/world/WorldTravelDialog.tsx` теж використовує TravelPanel і не повинен зламатись); Test `components/world/travel/__tests__/SessionsPanel.test.tsx`.

**Interfaces:** Consumes `useWorldSessions`. `SessionsPanel({ campaignId })`: список (активна з бейджем), «Нова сесія» → `SessionFormDialog` (ім'я, опис, колір з `WORLD_SESSION_COLORS`, `ResponsiveDialog`), дії редагувати/завершити/видалити (видалення з підтвердженням наявним патерном проєкту). Помилки показує `useCrudMutation`.

- [ ] Тести: старт нової сесії викликає мутацію з даними форми; завершення; порожній список.
- [ ] Реалізація; commit `feat(world): DM sessions panel`.

### Task 9: UI — drag піна героя

**Files:** Create `lib/hooks/world/useHeroDrag.ts`; Modify `components/world/map/WorldHeroes.tsx`, `HeroCluster.tsx`, `WorldMapView.tsx` (`dragHeroes?: { onDrop(ids: string[], to: MapPoint): void; selected: string[] }`), DM-сторінку (спільний `useHeroSelection` для `TravelPanel` і карти; `onDrop` → `useWorldTravel.travel` з `rest: 'none'`); Test `lib/hooks/world/__tests__/useHeroDrag.test.ts`, `components/world/map/__tests__/WorldHeroesDrag.test.tsx`.

**Interfaces:** `useHeroDrag({ toPoint(clientX: number, clientY: number): MapPoint | null; groupFor(clusterIds: string[]): string[]; onDrop(ids: string[], to: MapPoint): void; positions: Map<string, {x:number;y:number}> })` повертає `{ bind(clusterIds): PointerHandlers; ghost: { point: MapPoint } | null; cancel(): void }`. Використовує `exceedsDragThreshold`, `dropIsNoop`, `dragGroup`. До порога клік працює як раніше (popover кластера, `onHeroClick`); Escape скасовує; `stopPropagation` як у поточному `HeroCluster`, щоб не панорамувати карту. Привид цілі + тонка лінія від піна. Тільки DM у «Грати».

- [ ] Тести: нижче порога — клік, вище — drop; вибраний герой тягне вибір; невибраний — лише себе/кластер; Escape; drop поза картою (`toPoint → null`) і no-op не викликають `onDrop`.
- [ ] Реалізація; commit `feat(world): drag hero pins to travel`.

### Task 10: UI — піни ворогів

**Files:** Create `components/world/map/WorldEnemies.tsx`, `components/world/editor/EnemyCard.tsx`; Modify `lib/hooks/world/useMapDrawing.ts` (`WorldTool` + `'enemy'`; `MODE_TOOLS.build` + `'enemy'`; `TOOL_HOTKEYS` `x`/`ч`; `Actions.onEnemy(p)`), `components/world/editor/WorldToolbar.tsx`, `WorldMapView.tsx` (`enemies?: WorldEnemyPin[]`, `onEnemyClick`, `onEnemyDrag`, лише DM-рендер), `useWorldEditorPage.ts`/DM-сторінку (створення з дефолтною назвою з i18n → виділення → `EnemyCard` у слоті `card`; у «Грати» drag з PATCH x/y на drop); Test `components/world/map/__tests__/WorldEnemies.test.tsx`, `components/world/editor/__tests__/EnemyCard.test.tsx`, оновити тест `useMapDrawing`.

**Interfaces:** Consumes `useWorldEnemies` (T6), `WORLD_MARKER_ICON_KEYS`, `MarkerColorField`, `marker-icon-options.ts`. Піни: червоний акцент + бейдж «лише ДМ», `EntityIcon`/іконка за ключем. `EnemyCard`: назва, іконка, колір, нотатка, видалення. Гравецький клієнт ворогів не отримує й не рендерить.

- [ ] Тести: рендер лише при переданих `enemies`; клік → виділення; форма зберігає; drag викликає `onEnemyDrag` з новими x/y.
- [ ] Реалізація; commit `feat(world): DM-only enemy pins UI`.

### Task 11: i18n, онбординг, підказки

**Files:** Modify `messages/{uk,en}/world.json` (сесії, легенда, бульбашка, інструмент «Ворог», підказки, помилки), `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json` (`whatsNew.<id>`), підказки `dm.world`/`player.world` (знайти їх файли за наявним патерном), бюджет d20 (`i18n` budget тест — підняти лише за потреби з поясненням у коміті); Test: наявні i18n-тести ключів.

- [ ] Додати всі ключі в обидві локалі (uk — основні тексти, en — переклад), перевірити, що жодного `t('…')` без ключа; запис у whats-new.
- [ ] Commit `feat(world): i18n and onboarding for sessions and trail`.

### Фінал (контролер, не реалізатор)

- [ ] `prisma migrate dev` на локальній БД, `pnpm exec prisma generate`; один повний `pnpm test:run`; `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`; `pnpm cycles`; eslint по зачеплених папках (`pnpm lint:dirs --changed main`).
- [ ] Opus-огляд гілки (один), виправлення, потім живий прогін (Крок 3), `/simplify`, оновлення `docs/architecture/world-map.md` і `docs/STATUS.md` (Крок 4).
