# Карта світу, частина 2 — герої, переходи, туман, нотатки. План

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Sonnet-імплементери, без рев'ю після кожної задачі, один фінальний Opus-рев'ю в кінці. Кроки — чекбокси `- [ ]`.

**Goal:** ДМ ставить героїв на карту й переміщує їх (з відрізком відкриття, «зайти/вийти», журналом і записом rest); гравець бачить карту зі своїм туманом і пише нотатки; перед цим — окремий блок полірування редактора.

**Architecture:** Схема вже в БД (таблиці `world_positions/reveals/travel_log/notes`), міграцій нема. Уся видимість рахується на сервері однією чистою функцією `buildWorldView` (`lib/utils/world/player-view.ts`); ДМ-режим «очима героя X» викликає ту саму функцію з id героя, тож перевірка туману і гравецький вигляд — один код. Туман малює canvas поверх карти, клієнт отримує лише відфільтровані дані.

**Tech Stack:** Next.js 16, Prisma 6, TanStack Query, Zod, Vitest (node / happy-dom), canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-27-world-map-design.md` (розділи «Поняття і дані», «Що бачить гравець», «Екрани», «Помилки»). Part 1 план: `docs/superpowers/plans/2026-10-27-world-map-part1.md`.

## Global Constraints

- Схему/міграції НЕ міняти. Координати нормалізовані 0..1; `revealRadius` — частка **ширини** карти (відстані рахувати з поправкою `aspect = width/height`: `dy_norm = dy / aspect`).
- Шар: компоненти не імпортують `@/lib/api/*`; запити в `lib/api/world.ts`, логіка в `lib/hooks/world`; ключі — у `lib/hooks/world/keys.ts`; `route.ts` тонкий, логіка в `lib/server/world/*`.
- Помилки — `errorResponse` з текстами `lib/constants/api-errors.ts` (укр.). Права: `withDM` / `requireCampaignAccess`, чужа кампанія → 404 через `loadOwned`.
- Перехід — одна транзакція. `world_reveals` лише додається. `dmNote` і чужі приватні нотатки не покидають сервер у гравецькому/«очима героя» вигляді.
- Підтримувати ESLint: padding-line, simple-import-sort, `no-console`. Тести в `__tests__/` поруч. Коментарі мінімальні.
- Герої, яких можна ставити на карту: `Character` кампанії з `type = PLAYER` і `status = ACTIVE`.

## Reuse before writing

| Що | Звідки | Для чого |
|---|---|---|
| `parseBody`, `withDM`, `requireCampaignAccess`, `loadOwned`, `errorResponse` | `lib/utils/api` | усі нові route-handlers |
| `ownedMap`, `ownedMarker`, `toWorldMap`, `toWorldMarker`, `readWorldMapDetail` | `lib/server/world/map-handlers`, `map-store` | view і travel не дублюють читання карти |
| `polygonCentroid`, `toMapPoint`, `fitBox`, `clamp01` | `lib/utils/world/geometry` | розширюємо цей же файл, не новий |
| `mapPath`, `subtreeMapIds` | `lib/utils/world/tree` | хлібні крихти, дозволені вкладені карти |
| `useCrudMutation`, `useViewport`, `useElementSize`, `useConfirm`, `useNotify`, `useReducedMotion`, `useMediaQuery` | `lib/hooks/common` | мутації, зум/панорама, mobile |
| `QueryState`, `EmptyState`, `ErrorState`, `LoadingState` | `components/common/states` | стани сторінок |
| `HudPage`, `HudPageHeader`, `HudPanel`, `HudChipTabs`, `HudPill`, `HudCard` | `components/hud/page` | сторінка гравця, панелі, чіпи героїв |
| `ResponsiveDialog`, `Button`, `ActionBar` | `components/ui`, `components/common` | діалог rest, кнопки |
| `PrefetchedQuery`, `readOkJson` | `lib/providers`, `lib/utils/api/read-json` | дані в першому HTML для сторінки гравця |
| `WorldMapView` (шари, `overlay`, `handlers`), `WorldPins`, `WorldZones`, `MARKER_ICON` | `components/world` | розширюємо шарами героїв/туману, не пишемо другий рендер |
| `useCrudMutation` + оптимістичний `patchDetail` патерн | `lib/hooks/world/useWorldEditor.ts` | нотатки |
| `CampaignMember`/герої гравця: `controlledBy = userId` | `Character` | «мої герої» |
| `usePusherChannel` | `lib/hooks/common` | НЕ в цій частині (Pusher — частина 3); гравець оновлюється `refetchOnWindowFocus` + `staleTime 15 с` |

Нове, бо аналогів нема: aware-of-aspect геометрія відкриття, `buildWorldView`, canvas-туман, шар героїв, транзакція переходу.

## Review Focus

- Гравець без героїв / з героєм без позиції на карті → порожній вигляд, не 500; кореневий вигляд `fogEnabled=false` показує все.
- Герой на вкладеній карті, а гравець відкриває батьківську → герой показаний на маркері входу (точка з `childMap`).
- Карта 3:1 і 1:1 — радіус відкриття візуально круглий (aspect-тест).
- Видалення героя/карти/маркера (каскад) під час відкритого вигляду → запит гравця повертає чистий стан, нотатки зникають разом з маркером.
- Нотатка до невидимого маркера → 403; чужа приватна → не віддається і не редагується; ДМ приватних не бачить.
- Подвійний клік «Перемістити» (дубль запиту) → два записи журналу допустимі, але позиція/reveals не псуються; кнопка блокується на `isPending`.

---

## Структура файлів

**Створити:**
- `types/world.ts` — доповнити (див. Task B1)
- `lib/utils/world/travel.ts`, `lib/utils/world/player-view.ts` (+ тести), доповнення `geometry.ts`
- `lib/server/world/travel-store.ts`, `travel-handlers.ts`, `view-handlers.ts`, `note-handlers.ts`
- `app/api/campaigns/[id]/world/{travel,enter,exit,view,log,notes}/route.ts`, `notes/[noteId]/route.ts`
- `lib/hooks/world/{useWorldView,useWorldTravel,useWorldNotes}.ts`
- `components/world/{WorldFog,WorldHeroes}.tsx`, `components/world/travel/TravelPanel.tsx`, `components/world/notes/WorldNotesPanel.tsx`, `components/world/play/WorldPlayClient.tsx`
- `app/campaigns/[id]/world/{page,page-client}.tsx`

**Змінити:** `lib/api/world.ts`, `lib/hooks/world/{keys,index}.ts`, `lib/schemas/world.ts`, `lib/constants/{world,api-errors}.ts`, `components/world/WorldMapView.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`.

---

# Блок A — полірування редактора (першим)

Причина: після прод-прогону частини 1 користувач оцінив редактор як «дерев'яний». Блок іде **першим**, бо Блок B додає шари в той самий `WorldMapView` і панелі; полірувати після зайвого ризикує переписом. Скарга користувача (2026-10-28): «виглядає дуже просто і топорно, ніби це просто демо» — без конкретних пунктів. Тому A1 — це дизайн-бриф за живими скріншотами, а не збір скарг.

Охоплення (за спекою, частина 4): вигляд пінів/зон/підписів, панель інструментів і підказки малювання, бокові панелі (налаштування, маркер, вкладені карти), мобільний ~500 px.

### Task A1: Скарги + дизайн-бриф (Opus, без коду)

- [ ] Зняти скріншоти поточного редактора (desktop + 500 px, з Ашаном на локальній БД) і зіставити з іншими HUD-екранами застосунку («Показ», бій, сценарій) — це еталон «не демо». Описати розриви в `docs/superpowers/specs/2026-10-28-world-map-ui-polish.md`: пін, зона, підпис, тулбар, панелі, порожні стани, мобільний. Запропонувати 2–3 напрямки (напр. «пергамент/атлас» vs «HUD-тактична карта») з мокапами; вибір напряму — за користувачем, до A2.
- [ ] Бриф: токени HUD (`--hud-*`, `--gold`), які `Hud*` компоненти брати; цільовий вигляд кожного елемента; критерії «готово» (скріншот desktop + 500 px).

### Task A2: Піни, зони, підписи (`WorldPins`, `WorldZones`, `marker-icons`)

**Files:** `components/world/{WorldPins,WorldZones,marker-icons}.ts(x)`, тести `components/world/__tests__/`.

- [ ] Піни: круглий «жетон» з іконкою замість пілюлі з текстом; підпис — окремим елементом, показується при hover/selected/zoom ≥ порога (для зон — по центру контуру, з обводкою тексту для читабельності на будь-якій картинці). Підписи не ловлять pointer.
- [ ] Зони: заливка/обводка з hover-підсвіткою (змінювати fill-opacity через CSS-клас на `<polygon>`, `pointer-events: visiblePainted` лише в режимі `select`), обране — подвійна обводка; клік по зоні вибирає її (зараз вибір лише через підпис).
- [ ] Курсори за інструментом (`crosshair` для point/zone/entry, `grab` для select).
- [ ] **Баг (скарга користувача):** з інструментом «точка» перетягування піна створює новий маркер замість переміщення; з «вибір» працює. Спершу відтворити тестом у `WorldMapView.test.tsx` (pointerdown на піні → move > `DRAG_THRESHOLD` → up, `tool=point`) і знайти причину (підозра: у `page-client.tsx` `onMarkerDrag` задається лише для `tool === "select"`, а подія pointerup/click після drag потрапляє на фон і викликає `onMapClick` → `onPoint`; перевірити `wasDragged()` і stopPropagation у `WorldPins`). Очікувана поведінка: пін перетягується в `select` і `point` (move маркера, без створення), у `zone`/`entry` — не перетягується, клік по ньому ігнорується. Тести: drag у `point` → `onMarkerDrag` один раз, `onMapClick` нуль разів; простий клік у `point` по піні → не створює точку під ним.
- [ ] Тести: підпис видно у selected, зона клікається, drag вимкнений поза `select`.

### Task A3: Тулбар, підказки малювання, бічні панелі

**Files:** `components/world/editor/{WorldToolbar,WorldMarkerPanel,WorldMapSettings,NewWorldMapDialog}.tsx`.

- [ ] Тулбар: іконки + tooltip + активний стан, підказка кроку над картою («Клікайте вершини · двічі клікніть, щоб замкнути · Esc — скасувати», показується лише в режимі зони/точки/входу).
- [ ] Бокова панель: секції через `HudPanel`/заголовки `HudSection`-стилю; «Вкладені карти» — список з переходом; щільніші відступи; без «дерев'яних» нативних елементів (використати `components/ui`).
- [ ] Хвіст ч.1: Radix-попередження `DialogContent` без `Description` — `ResponsiveDialog` отримує `description` у всіх діалогах світу (тест на відсутність `console.error` у `NewWorldMapDialog`).
- [ ] Хвіст ч.1: UI-шлях відмови на другу кореневу карту — `NewWorldMapDialog` показує `WORLD_ROOT_EXISTS` в полі помилки, а не лише тост (тест із 409).

### Task A4: Мобільний ~500 px + hydration

**Files:** `app/campaigns/[id]/dm/world/page-client.tsx`, `components/world/WorldMapView.tsx`, `components/world/editor/*`.

- [ ] На < `lg`: панель під картою як `ResponsiveDialog`-sheet або згортана секція; тулбар переноситься/скролиться горизонтально; мін. тап-ціль 44 px для кнопок тулбару; зум-кнопки не перекривають піни.
- [ ] **Баг (скарга користувача):** React #418 (hydration mismatch) при завантаженні `/dm/world` на ~488 px; на десктопі нема. Діяти за `superpowers:systematic-debugging`: відтворити в dev (viewport 488 px, hard reload), побачити розгорнутий текст помилки (dev-збірка показує, який елемент розійшовся), знайти джерело (підозра: компонент, що читає `window`/`matchMedia`/`useIsMobile`/`useMediaQuery` у першому рендері й відрізняється від SSR — `ResponsiveDialog`, `WorldToolbar`, `HudPageHeader` або клас `lg:` у `page-client.tsx`). Виправити першопричину (початковий стан = SSR-значення, оновлення в `useEffect`), без `suppressHydrationWarning`. Регрес-тест: рендер клієнтського дерева з моканим `matchMedia(max-width: 500px)` дає той самий HTML, що й без нього, на першому рендері.
- [ ] Перевірка: `pnpm test:related` змінених файлів; скріншоти — у фінальному live-прогоні (Task B10).

---

# Блок B — герої, переходи, туман, нотатки

### Task B1: Типи, схеми, константи, ключі

**Files:** `types/world.ts`, `lib/schemas/world.ts`, `lib/constants/{world,api-errors}.ts`, `lib/hooks/world/keys.ts`. Тест: `lib/schemas/__tests__/world.test.ts` (доповнити, якщо є).

**Produces (точні типи):**
```ts
export interface WorldHero { id: string; name: string; avatar: string | null; mapId: string; x: number; y: number; own: boolean }
export interface WorldNote { id: string; markerId: string; authorUserId: string; authorName: string; characterId: string | null; visibility: "public" | "private"; text: string; mine: boolean; createdAt: string; updatedAt: string }
export interface WorldView { map: WorldMap; markers: WorldMarker[]; heroes: WorldHero[]; reveals: RevealShape[]; maps: WorldMapSummary[]; notes: WorldNote[]; fog: boolean }
// WorldMarker у вигляді гравця має dmNote: null завжди
export interface WorldTravelEntry { id: string; mapId: string; mapName: string; heroes: { id: string; name: string }[]; from: { mapId: string; x: number; y: number } | null; to: { mapId: string; x: number; y: number }; toMarkerName: string | null; rest: TravelRest; createdAt: string }
export type TravelRequest = { mapId: string; characterIds: string[]; to: MapPoint; toMarkerId?: string; rest: TravelRest }
export type EnterRequest = { markerId: string; characterIds: string[]; rest: TravelRest }
export type ExitRequest = { mapId: string; characterIds: string[]; rest: TravelRest }
export type CreateWorldNoteData = { markerId: string; text: string; visibility: "public" | "private"; characterId?: string }
```
**Zod:** `travelSchema`, `enterSchema`, `exitSchema` (`characterIds` 1..20 унікальні, `rest` enum), `createWorldNoteSchema`, `updateWorldNoteSchema` (`text` / `visibility`), `worldViewQuerySchema` (`mapId` обов'язковий, `asHeroId` опційний). Константи: `WORLD_NOTE_MAX = 2000`, `MAX_TRAVEL_HEROES = 20`, `TRAVEL_LOG_LIMIT = 50`. Тексти: `WORLD_HERO_INVALID`, `WORLD_NOTE_FORBIDDEN`, `WORLD_NOTE_NOT_FOUND`, `WORLD_NOT_NESTED`, `WORLD_MARKER_NO_CHILD`, `WORLD_AS_HERO_DM_ONLY`. Ключі: `worldKeys.view(cid, mapId, asHeroId?)`, `worldKeys.log(cid)`.

- [ ] Тести схем (валідно/дубль id/порожній текст/чужий rest) → реалізація → коміт.

### Task B2: Геометрія відкриття (aspect-aware)

**Files:** `lib/utils/world/geometry.ts`, `__tests__/geometry.test.ts`.

**Produces:**
```ts
export function distToSegment(p: MapPoint, a: MapPoint, b: MapPoint, aspect: number): number // у частках ширини
export function isRevealed(p: MapPoint, shapes: RevealShape[], radius: number, aspect: number): boolean
export function zoneTouchesReveal(polygon: Polygon, shapes: RevealShape[], radius: number, aspect: number): boolean
export function coversPoint(shapes: RevealShape[], p: MapPoint, radius: number, aspect: number): boolean // для дедупу
export function pointInPolygon(p: MapPoint, polygon: Polygon): boolean
```
`zoneTouchesReveal`: true, якщо будь-яка фігура відкриття лежить усередині полігона (центр у полігоні) **або** відстань від фігури до будь-якого ребра ≤ radius **або** полігон лежить усередині капсули (вершина в капсулі). Тест-кейси: точка на межі `d == radius` → true; відрізок A=B вироджується в точку; `aspect=3` — точка на (dx=0, dy=radius·0.9/3·…) перевірка нормалізації; порожні shapes → false; полігон повністю в колі; коло на ребрі; кінець відрізка в полігоні; відрізок, що перетинає полігон наскрізь, не торкаючись вершин.

- [ ] Тести → реалізація → коміт.

### Task B3: `travel.ts` і `player-view.ts` (чисті)

**Files:** `lib/utils/world/{travel,player-view}.ts`, `__tests__/{travel,player-view}.test.ts`.

**Produces:**
```ts
// travel.ts
export type HeroPos = { characterId: string; mapId: string; x: number; y: number } | null
export function planTravel(args: { positions: Map<string, HeroPos>; characterIds: string[]; mapId: string; to: MapPoint; radius: number; aspect: number }): { moves: { characterId: string; from: HeroPos; to: MapPoint }[]; reveals: { characterId: string; shape: RevealShape }[] }
export function planEnter(args: { marker: { id: string; mapId: string }; childMap: { id: string; entryX: number; entryY: number }; characterIds: string[] }): same shape
export function planExit(args: { map: { id: string; parentMarker: { mapId: string; x: number; y: number } | null }; characterIds: string[] }): same shape | throws "NOT_NESTED"
export function dedupePoint(existing: RevealShape[], p: MapPoint, radius: number, aspect: number): boolean // true → не додавати точку
// player-view.ts
export function buildWorldView(input: { map: WorldMap; markers: WorldMarker[]; allMaps: WorldMapSummary[]; positions: HeroPosition[]; heroNames: Map<string, { name: string; avatar: string | null; controlledBy: string }>; reveals: { mapId: string; characterId: string; shape: RevealShape }[]; notes: NoteRow[]; viewer: { userId: string; heroIds: string[] } }): WorldView
```
Рішення:
- `planTravel`: герой із `from` на тій самій карті → shape `s` (A→B); без `from` або з іншої карти → `p` (B). Тест: два героя з різними позиціями отримують різні відрізки; `to` поза [0,1] — clamp.
- `planEnter`: кожному `to = entry`, shape `p`. `planExit`: `to = parentMarker (x,y)` на `parentMarker.mapId`, shape `p`; `parentMarker === null` → помилка.
- `buildWorldView` (viewer = гравець, `heroIds` = його герої; ДМ «очима героя X» → `heroIds=[X]`): `reveals` — лише `heroIds` на цій карті; `fog=false` → усі маркери, усі позиції (власні з `own:true`), `reveals=[]`; інакше маркер видно, якщо `alwaysVisible` або `isRevealed(anchor)` або (зона і `zoneTouchesReveal`); `dmNote=null` усюди; `heroes` — свої на цій карті + чужі, якщо `isRevealed`; герой на вкладеній карті цієї карти-предка показується в координатах її маркера-входу; `maps` — лише карти, де є позиція або reveal власних героїв (+ шлях предків для крихт) ; `notes` — лише до видимих маркерів: публічні + власні приватні (`mine`). Тест-кейси: чужий туман не просочується; `alwaysVisible` у тумані; зона торкається відкритого → видна, її `polygon` віддається повністю; приватна нотатка чужого автора не повертається; `dmNote` скинутий; гравець без героїв → порожньо, `fog` лишається; `fogEnabled=false` → повна видимість.
- Для ДМ-редактора (без `asHeroId`) view не використовується — він читає `readWorldMapDetail` як зараз (повний вигляд) плюс позиції (Task B4).

- [ ] Тести → реалізація → `pnpm test:related lib/utils/world` → коміт.

### Task B4: Серверні: переходи, журнал, view

**Files:** `lib/server/world/{travel-store,travel-handlers,view-handlers}.ts`; routes `world/{travel,enter,exit,view,log}/route.ts`; `app/api/__tests__/world-api.test.ts` (доповнити).

**Handlers:**
- `travelHandler(req, cid)` (`withDM`): `parseBody(travelSchema)` → `ownedMap` → перевірка героїв: `prisma.character.count({ where: { id: { in }, campaignId, type: PLAYER, status: ACTIVE } } ) === ids.length` інакше 400 `WORLD_HERO_INVALID` → `planTravel` → `prisma.$transaction`: upsert `worldPosition` кожному, `createMany` reveals (пропускаючи `p`, що `dedupePoint`), `worldTravelLog.create` (`byUserId`, `toMarkerId` якщо переданий і належить карті). Відповідь: `{ ok: true, positions: WorldHero[] }`.
- `enterHandler`: `ownedMarker` → без `childMap` → 409 `WORLD_MARKER_NO_CHILD`; `planEnter` (+ log з `from` = попередня позиція першого героя, `to` = entry, `mapId` = child).
- `exitHandler`: `ownedMap` → `parentMarkerId` null → 409 `WORLD_NOT_NESTED`; герої мають бути на цій карті (інакше 400).
- `viewHandler(req, cid)` (`requireCampaignAccess`): query `mapId`, `asHeroId`. `asHeroId` лише для ДМ (інакше 403 `WORLD_AS_HERO_DM_ONLY`); гравець → `heroIds` = його активні PLAYER-герої (`controlledBy = userId`); ДМ без `asHeroId` → 400. Дозволеність карти: гравець може запросити `mapId` лише зі свого `maps`, інакше 404. Без `mapId` → корінь або перша дозволена (щоб сторінка гравця мала старт). Читання: `readWorldMapDetail`, `listWorldMaps`, positions кампанії, reveals цієї карти для `heroIds`, notes видимих маркерів → `buildWorldView`.
- `logHandler`: `requireCampaignAccess`; ДМ — усі, гравець — записи з його героями; `take: TRAVEL_LOG_LIMIT`, desc.
- Додатково для редактора ДМ: `GET /world/maps/[mapId]` уже віддає `{map, markers}`; **додати** `positions: WorldHero[]` у відповідь `getWorldMapHandler` (type `WorldMapDetail.heroes?: WorldHero[]`), бо ДМ-редактор показує всіх героїв без тумана.

**Тест-кейси (route):** гравець `POST /travel` → 403; не-свій герой/герой іншої кампанії → 400; перший візит → одна `p`, другий → `s`; переміщення на ту ж точку не дублює `p`; `enter` на маркері без вкладеної → 409; `exit` з кореня → 409; транзакція відкатується, якщо `log.create` кидає (мок) — позиції не змінені; `view` гравця: чужий герой поза відкритим не повертається, `dmNote` null; `asHeroId` від гравця → 403; `mapId` чужої кампанії → 404; `log` гравця не містить чужих героїв.

- [ ] Тести → реалізація → `pnpm test:related app/api/__tests__/world-api.test.ts` → коміт.

### Task B5: Нотатки

**Files:** `lib/server/world/note-handlers.ts`; routes `world/notes/route.ts` (POST), `world/notes/[noteId]/route.ts` (PATCH, DELETE); тести в `world-api.test.ts`.

- `createNoteHandler`: `requireCampaignAccess`; маркер `ownedMarker`; для гравця — маркер має бути у його `buildWorldView` (виділити `visibleMarkerIds(viewerInput)` з `player-view.ts`), інакше 403 `WORLD_NOTE_FORBIDDEN`; `characterId`, якщо є, має бути героєм гравця; ДМ може писати лише `public`.
- `updateNoteHandler`/`deleteNoteHandler`: свою — завжди; чужу публічну видаляє лише ДМ; чужа приватна → 404 (існування не розкриваємо).
- Тести: нотатка до невидимого маркера → 403; приватна чужа → 404 на PATCH; ДМ видаляє публічну гравця, не приватну; `text` > `WORLD_NOTE_MAX` → 400; після видалення маркера нотатка зникає (каскад — перевірка через `view`).

- [ ] Тести → реалізація → коміт.

### Task B6: Клієнтський API і хуки

**Files:** `lib/api/world.ts`, `lib/hooks/world/{useWorldView,useWorldTravel,useWorldNotes,index}.ts`, тести хуків (happy-dom, патерн `useWorldMapUpload.test.ts`).

**Produces:**
```ts
getWorldView(cid, { mapId?, asHeroId? }): Promise<WorldView>
travelHeroes(cid, TravelRequest) / enterMarker(cid, EnterRequest) / exitMap(cid, ExitRequest) / getTravelLog(cid): Promise<WorldTravelEntry[]>
createWorldNote / updateWorldNote / deleteWorldNote
useWorldView(cid, { mapId, asHeroId }) // staleTime 15_000, refetchOnWindowFocus true, enabled при mapId або player
useWorldTravel(cid, mapId) // { travel, enter, exit } — useCrudMutation, invalidate: view(cid,*), map(cid,mapId), log(cid)
useWorldNotes(cid, mapId) // { create, update, remove } з оптимістичним патчем у view-кеші
```
- Інвалідація через префікс `["world-view", cid]`. Тести: після `travel` інвалідуються view і log; помилка → `errorText` показано.

- [ ] Тести → реалізація → коміт.

### Task B7: Шари героїв і туману в `WorldMapView`

**Files:** `components/world/{WorldFog,WorldHeroes}.tsx`, `WorldMapView.tsx` (+ prop), тести.

**Рішення (неочевидне):**
- `WorldMapView` отримує `fog?: { shapes: RevealShape[]; radius: number }` і `heroes?: WorldHero[]` (у `detail`-стилі, обидва опційні → ДМ-редактор без змін).
- `WorldFog` — `<canvas>` **поза** трансформованим шаром, у `box`-розмірі, `pointer-events: none`; малює: заливка `rgba(8,6,4,.92)`, далі `globalCompositeOperation = "destination-out"`: для `p` — радіальний градієнт (рівно `radius·box.width·zoom`, м'який край 25 %), для `s` — капсула (лінія з `lineCap: round`, `lineWidth = 2·r`, `shadowBlur` для м'якості). Координати — через `(x·box.width·zoom + offset.x, y·box.height·zoom + offset.y)`. Перемальовка в `requestAnimationFrame` при зміні shapes/zoom/offset/size; DPR ≤ 2; на `prefers-reduced-motion` без анімації появи нових відкриттів (інакше 400 мс fade).
- `WorldHeroes`: аватарка/ініціал-жетон, `scale(1/zoom)` як піни; свій — золота обводка; клік → `handlers.onHeroClick?.(id)`.
- Тести (`happy-dom` без canvas → мок `getContext`): викликів `arc/stroke` стільки, скільки shapes; `fog` відсутній → canvas не рендериться; героїв рендерить N; `zoom` змінює `lineWidth`.

- [ ] Тести → реалізація → коміт.

### Task B8: Керування героями в редакторі ДМ + «очима героя»

**Files:** `components/world/travel/TravelPanel.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`, тести `components/world/travel/__tests__/`.

- `TravelPanel` (самостійний, без контексту редактора — у частині 3 монтується й у доці «Показу»): props `{ campaignId, mapId, heroes: WorldHero[] (усі PLAYER-герої з позиціями або без), target: MapPoint | null, selectedMarker: WorldMarker | null, onPickTarget() }`. UI: чіпи героїв (`HudChipTabs`, мульти-вибір, «Усі»), кнопка «Перемістити» (disabled без цілі/героїв/`isPending`), вибір відпочинку «Без/Short/Long» (радіо), «Зайти» (коли `selectedMarker.childMapId`), «Вийти» (коли карта вкладена), журнал (`getTravelLog` у `QueryState`, останні 50).
- Ціль: клік по карті при інструменті `move` (новий `WorldTool`: `"move"`, додати в `useMapDrawing`) ставить `target`; клік по піну з `childMapId` — вибирає маркер.
- «Очима героя X» — `Select` у тулбарі: `null` = повний вигляд ДМ; hero → карта рендериться з `useWorldView({ asHeroId })` (read-only, інструменти малювання вимкнені, `fog` застосований); перемикач показує підказку «Вигляд гравця».
- Список героїв кампанії для панелі: існуючий хук героїв кампанії (`lib/hooks/characters`, знайти список PLAYER-героїв кампанії; не писати новий запит) + позиції з `detail.heroes`.
- Тести: «Перемістити» викликає `travel` з вибраними героями/ціллю/rest; кнопка заблокована під час pending; «Зайти» видно лише для маркера з вкладеною; перемикач «очима героя» відправляє `asHeroId`.

- [ ] Тести → реалізація → коміт.

### Task B9: Вигляд гравця + нотатки

**Files:** `app/campaigns/[id]/world/{page,page-client}.tsx`, `components/world/play/WorldPlayClient.tsx`, `components/world/notes/WorldNotesPanel.tsx`, тести.

- `page.tsx` (server): `requireCampaignMember` → `viewHandler`-функція напряму (як `readBattleScene`), `readOkJson`, `PrefetchedQuery` під `worldKeys.view(id, mapId)`; не-корінь `?map=` перевіряється сервером (недозволена → корінь). Якщо карти немає — `EmptyState` «ДМ ще не підготував карту».
- `WorldPlayClient`: `HudPage` + крихти, `WorldMapView` (fog, heroes, `handlers.onMarkerClick` → панель), вкладені карти — через список «Відкриті місця» (`view.maps`), «Мої герої» — чіпи, що центрують карту; журнал своїх героїв (`getTravelLog`).
- `WorldNotesPanel`: вкладки «Спільні / Мої» (`HudChipTabs`), форма (textarea, ліміт `WORLD_NOTE_MAX`, вибір героя, якщо їх >1), редагування/видалення своїх через `useConfirm`; ДМ у цій панелі бачить лише публічні й може видаляти.
- Тести: порожній стан без карти; приватна вкладка показує лише `mine`; форма викликає `create` з `visibility`; ліміт символів; помилка 403 → notify.

- [ ] Тести → реалізація → коміт.

### Task B10: Фінальна перевірка, live-прогін, документи

- [ ] `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` (в worktree, одноразово).
- [ ] **Один фінальний Opus-рев'ю** диф гілки `feat/world-map-2` (без рев'ю по задачах); виправлення — одна хвиля Sonnet.
- [ ] **Live-прогін** (субагент Sonnet, браузер, скейл-скріншоти; контекст — `feedback-browser-context`): dev-сервер `:3100` (worktree `../dnd-tracker-world2`, `.env.local` скопіювати з `../dnd-tracker-world`), локальна БД `worldmap_dev`; вхід через Google (Redirect URL `http://localhost:3100/**` у Supabase додано 2026-10-28), Resend не налаштований — email-реєстрацію не використовувати. Сценарій: ДМ ставить двох героїв у різні місця, рухає (відрізок відкривається), «Зайти/Вийти», rest у журналі, «очима героя»; гравець бачить лише свій туман, пише спільну й приватну нотатки; desktop + 500 px; скріншоти редактора після блоку A.
- [ ] Прибрати тестові дані (кампанія/карти/герої, локальні БД `worldmap_dev`, dev-сервер); звіт у `docs/reports/world-map-part2-live-2026-10-28.md`.
- [ ] `docs/STATUS.md`: рядок «Карта світу» → частина 2 готова; `docs/architecture/world-map.md` НЕ створювати (частина 3) — лише нотатки в плані частини 3. Merge до `main` — за командою користувача; `git mv` плану/спеки в archive — після частини 3.

---

## Self-review

- **Покриття спеки (ч.2):** позиції героїв і пересування ДМ (B3–B4, B8), журнал + rest (B4, B8), туман на гравця (B2–B3, B7), нотатки (B5, B9), «очима героя» (B4 `asHeroId`, B8), вигляд гравця (B9); «Показ»/сценарій/Pusher — частина 3 (явно поза планом). Полірування — блок A.
- **Узгодженість типів:** `WorldView`, `WorldHero`, `RevealShape`, `TravelRequest` визначені в B1 і однаково використані в B3–B9; `buildWorldView.viewer.heroIds` — єдиний шлях і для гравця, і для «очима героя».
- **Рішення користувача (2026-10-28):** UI-скарга загальна («просто, топорно, як демо») → A1 робить бриф і варіанти; локальний вхід Google працює; кнопка «Карта» для гравця — у частині 3, у частині 2 вхід за URL `/campaigns/[id]/world`.
