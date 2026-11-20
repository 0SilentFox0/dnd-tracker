# Карта світу: шари — план реалізації

> **Для агентів:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Кроки з чекбоксами `- [ ]`. Реалізатори — Sonnet; **тести пишуть, але не запускають** (один повний `test:run` робить контролер у кінці). Без оглядів по задачах; один фінальний Opus-огляд. Контролер дає батчі по 2–3 суміжні задачі.

**Мета:** шари карти світу (маркери/зони + накладена картинка-прямокутник) із видимістю ДМ / усі / окремі герої через `buildWorldView`, плюс хвости підпроєкту 2.

**Архітектура:** таблиця `world_layers` + join `world_layer_heroes` + `world_markers.layerId`. Єдиний фільтр — `layerOk` у `visibility()` (`lib/utils/world/player-view.ts`) разом із туманом. Гравець отримує лише видимі шари без `visibility`/`heroIds`. CRUD — `withDM`-обробники в стилі `session-*`.

**Стек:** Next 16, Prisma 6, Zod, TanStack Query, vitest, next-intl.

**Spec:** `docs/superpowers/specs/2026-11-20-world-layers-design.md` (читати першою). Хвости: `docs/superpowers/specs/2026-11-20-world-layers-open-items.md`.

## Global Constraints

- Приватність: вороги живуть лише в `world_enemy_pins` і лише у відповіді ДМ; шари цю таблицю не читають. Видимість шару для гравця — **тільки** через `buildWorldView` (`visibility()`); жоден гравецький шлях не читає `world_layers`/`world_layer_heroes` напряму.
- Міграція лише expand-only; кожен `CREATE TABLE` має `ENABLE ROW LEVEL SECURITY`. Ім'я: `20261222000000_world_layers`. Після `prisma migrate dev` у папці міграції не має бути drop часткового індексу `world_sessions_one_active` (Prisma його не знає).
- Шари: рівні `ui → hud → common → domain`; компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch` — лише хуки з `@/lib/hooks/world` (імпорт із папки-барелю). Query keys — лише `worldKeys` (`lib/hooks/world/keys.ts`).
- Цикли: `pnpm cycles`; `lib/utils` не імпортує `lib/server`.
- Помилки API: `{ error, issues? }` з ключами `API_ERRORS` (`lib/constants/api-errors.ts`) + `errors.*` у `messages/{uk,en}/errors.json`.
- i18n: усі тексти в `messages/{uk,en}/world.json`; кирилиця в коді заборонена (ESLint), коментарі англійською, мінімум коментарів.
- Egress: без нових полінгів; зміни приходять через існуючий `world-changed`.
- Ліміти: `MAX_WORLD_LAYERS = 20` на карту; `WORLD_LAYER_OPACITY` 0.05..1.
- Прямокутник картинки в нормалізованих координатах карти: `-1 ≤ x,y ≤ 2`, `0.02 ≤ w,h ≤ 2` (може виступати за карту, контейнер обрізає). За замовчуванням `0,0,1,1`.
- Не мерджити й не пушити.

## Review Focus (кожен пункт має тест у задачі-власниці)

1. Гравець без героя в `heroes`-шарі: у `GET view` немає ні маркерів шару, ні шару, ні `imageUrl` (T2).
2. Нотатка гравця до маркера прихованого шару → 403, у видимих нотатках цього маркера нема (T2/T3).
3. Видалення шару з маркерами без `?markers=` → 409 і нічого не змінено; `ungroup` робить маркери «без шару», тобто видимими всім (UI явно попереджає), `delete` видаляє їх (T3, T7).
4. `layerId` шару іншої карти/кампанії при створенні/зміні маркера → 404/403, не 500 (T3).
5. Видалення карти каскадом (шари й маркери разом) не падає на FK `layerId` (T1/T3; FK `NoAction`, не `Restrict`).
6. `asHero`/`asParty` (ДМ «очима героя») бачить шар за правилами героя, а не ДМ-режим (T2).
7. Вхід у вкладену карту з маркера прихованого шару не розкриває координату цього маркера (T2).

---

## Task 0 (контролер): стартовий code-review

- [ ] `/code-review medium` по `lib/server/world`, `components/world`, `lib/hooks/world`. Серйозне (коректність/приватність) виправити окремим комітом `fix(world): review findings`; дрібне — списком у `docs/STATUS.md` (рядок підпроєкту 3). Не розтягувати: ≤ 1 агент.

## Task 1: схема, міграція, типи, константи, Zod, помилки

**Files:**
- Modify: `prisma/schema/core.prisma` (моделі біля `WorldMarker` ≈ рядок 1213), `types/world.ts`, `lib/constants/world.ts`, `lib/schemas/world.ts`, `lib/constants/api-errors.ts`, `messages/{uk,en}/errors.json`
- Create: `prisma/migrations/20261222000000_world_layers/migration.sql`
- Test: `lib/schemas/__tests__/world-layers.test.ts` (або поруч із наявним тестом схем world — знайти `grep -rn updateWorldMarkerSchema lib/schemas`)

**Interfaces — Produces:**
```ts
// types/world.ts
export type LayerVisibility = 'dm' | 'all' | 'heroes';
export interface LayerRect { x: number; y: number; w: number; h: number }
export interface WorldLayer {            // DM
  id: string; mapId: string; name: string; color: string | null;
  visibility: LayerVisibility; heroIds: string[]; sortOrder: number;
  imageUrl: string | null; rect: LayerRect; opacity: number;
}
export type WorldViewLayer = Pick<WorldLayer,'id'|'name'|'color'|'imageUrl'|'rect'|'opacity'>; // player
export type CreateWorldLayerData = { mapId: string; name: string; color?: string };
export type UpdateWorldLayerData = Partial<Pick<WorldLayer,'name'|'color'|'visibility'|'imageUrl'|'rect'|'opacity'|'sortOrder'>>;
export type DeleteWorldLayerMode = 'ungroup' | 'delete';
// WorldMarker += layerId: string | null;  WorldMapDetail += layers?: WorldLayer[];  WorldView += layers: WorldViewLayer[];
// UpdateWorldMarkerData/Create += layerId?: string | null
// lib/constants/world.ts: MAX_WORLD_LAYERS = 20; WORLD_LAYER_OPACITY = { min: 0.05, max: 1 }
// api-errors: WORLD_LAYER_NOT_FOUND, WORLD_LAYER_LIMIT, WORLD_LAYER_HAS_MARKERS, WORLD_LAYER_INVALID (errors.worldLayer*)
```

- [ ] Prisma: `WorldLayer` (`id cuid`, `mapId` FK cascade, `name`, `color?`, `visibility String @default("dm")`, `sortOrder Int @default(0)`, `imageUrl?`, `imgX/imgY Float @default(0)`, `imgW/imgH Float @default(1)`, `opacity Float @default(1)`, timestamps, `@@index([mapId, sortOrder])`, `@@map("world_layers")`), `WorldLayerHero` (`layerId` cascade, `characterId` cascade → `Character`, `@@id([layerId, characterId])`, `@@map("world_layer_heroes")`), `WorldMarker.layerId String?` + relation `onDelete: NoAction` + `@@index([layerId])`. Додати зворотні relation-поля в `WorldMap`, `Character`.
- [ ] Міграція: `pnpm exec prisma migrate dev --name world_layers` на локальній БД, перейменувати папку у `20261222000000_world_layers` якщо потрібно; **перевірити SQL**: обидві нові таблиці мають `ENABLE ROW LEVEL SECURITY`, FK `world_markers_layerId_fkey ... ON DELETE NO ACTION`, часткового індексу сесій не drop-нуто. Виправити SQL руками, якщо ні.
- [ ] Zod (`lib/schemas/world.ts`): `layerRectSchema` (межі з Global Constraints), `createWorldLayerSchema`, `updateWorldLayerSchema` (`.strict()`, `.partial()`, refine «щось змінити», `imageUrl` — той самий `imageUrl` схемa, що в карти; `visibility` enum), `setLayerHeroesSchema` (`{ heroIds: string[] ≤ MAX_TRAVEL_HEROES*5 }`), `deleteWorldLayerQuerySchema` (query `?markers=ungroup|delete`, необов'язковий); `layerId: z.string().min(1).nullable().optional()` у `createWorldMarkerSchema`/`updateWorldMarkerSchema`.
- [ ] Тести схем: прямокутник поза межами → fail; порожній patch → fail; `visibility: 'x'` → fail; marker `layerId: null` дозволено.
- [ ] Commit: `feat(world): layers schema, migration, types`

## Task 2: видимість шарів у buildWorldView + читання шарів гравцем

**Files:**
- Modify: `lib/utils/world/player-view.ts`, `lib/server/world/view-handlers.ts`
- Create: `lib/server/world/layer-store.ts` (лише читання тут: `listLayersFor(mapId)`; CRUD додає T3)
- Test: `lib/utils/world/__tests__/player-view.test.ts` (розширити), `lib/server/world/__tests__/view-handlers.test.ts` (розширити), `lib/server/world/__tests__/enemy-privacy.test.ts` (розширити), тест note-handlers (`grep -rln createNoteHandler lib` — поруч або в `__tests__`)

**Interfaces:**
- Consumes: типи T1.
- Produces:
```ts
// player-view.ts
export interface LayerInput { id: string; name: string; color: string|null; visibility: LayerVisibility; heroIds: string[]; imageUrl: string|null; rect: LayerRect; opacity: number }
export interface WorldViewInput { /* + */ layers: LayerInput[] }       // markers у WorldMarker мають layerId
export const layerVisibleTo = (layer: Pick<LayerInput,'visibility'|'heroIds'>, heroIds: string[]): boolean
// visibility(): markers = fog-фільтр ∧ (m.layerId == null ∨ layerVisibleTo(layer(m.layerId), viewer.heroIds))
// buildWorldView(): повертає layers: WorldViewLayer[] (лише видимі; без visibility/heroIds)
// layer-store.ts
export const listLayerInputs = (mapId: string): Promise<LayerInput[]>
```

- [ ] Тести спершу (`player-view.test.ts`): `dm` → маркер і шар відсутні; `all` → є; `heroes` + герой у списку → є, інший → ні; `layerId` невідомого шару (видалений) → маркер **прихований** (fail-closed, не «без шару»); туман ∧ шар: видимий шар, але маркер поза розкритою зоною → ні (`alwaysVisible` → так); `asHero` з одним героєм → правила героя; вихідний об'єкт шару не має ключів `visibility`/`heroIds` (`Object.keys`); нотатка до маркера прихованого шару не в `notes`; вхід у вкладену карту з маркера прихованого шару: `markers` не містять його, `layers` не містять шару.
- [ ] Реалізувати `layerVisibleTo`, розширити `visibility()` (мапа `layerById` будується раз), `buildWorldView`.
- [ ] `note-handlers.ts` (`markerVisibleToPlayer`): перед `visibleMarkerIds` завантажити `listLayerInputs(marker.mapId)` і передати `layers`; без цього нотатка до маркера в прихованому шарі пройшла б перевірку.
- [ ] `view-handlers.ts`: у `Promise.all` додати `listLayerInputs(target)` лише після визначення `target` (окремий await після `readWorldMapDetail`), передати в `buildWorldView`. `visibleMarkerIds` (використовують нотатки/інші хендлери) бере layers у `MarkerVisibilityInput` — оновити виклики (`grep -rn visibleMarkerIds`) та додати `layers` у їхній вхід; для викликів без шарів у контексті — завантажити через `listLayerInputs`.
- [ ] Тест `view-handlers`: гравець без героя в `heroes`-шарі: відповідь не містить рядка імені шару, `imageUrl`, id маркера; ДМ «очима героя» дає те саме, що гравець-герой; демо-кампанія (isDemo) не падає без шарів. `enemy-privacy.test.ts`: `JSON.stringify(view)` не містить `enemies`; призначений `layers` не містить `dmNote`.
- [ ] Нотатки: де гравець створює нотатку (`note-handlers.ts`) вона вже перевіряє `visibleMarkerIds` — тест: маркер у `dm`-шарі → 403.
- [ ] Commit: `feat(world): layer visibility in buildWorldView`

## Task 3: CRUD шарів на сервері + маркер із layerId

**Files:**
- Create: `lib/server/world/layer-handlers.ts`, `app/api/campaigns/[id]/world/maps/[mapId]/layers/route.ts` (GET, POST), `app/api/campaigns/[id]/world/layers/[layerId]/route.ts` (PATCH, DELETE), `app/api/campaigns/[id]/world/layers/[layerId]/heroes/route.ts` (PUT)
- Modify: `lib/server/world/layer-store.ts` (+`toWorldLayer`, `createLayer`, `listDmLayers(mapId): Promise<WorldLayer[]>`), `lib/server/world/map-store.ts` (лише `toWorldMarker.layerId`; `readWorldMapDetail` **не змінювати** — його читають view/notes/AI), `lib/server/world/marker-handlers.ts` (приймає/перевіряє `layerId`), `lib/server/world/map-handlers.ts` (`getWorldMapHandler` додає `layers: await listDmLayers(mapId)` до відповіді ДМ — єдине місце, де `visibility`/`heroIds` виходять назовні)
- Test: `lib/server/world/__tests__/layer-handlers.test.ts`, `marker-create.test.ts` (розширити)

**Interfaces — Produces:**
```ts
// layer-store.ts
export const toWorldLayer: (row: LayerRow & { heroes: { characterId: string }[] }) => WorldLayer
export function createLayer(mapId: string, data: CreateWorldLayerData): Promise<WorldLayer>  // кидає WorldLayerError(API_ERRORS.WORLD_LAYER_LIMIT) при >= MAX_WORLD_LAYERS; sortOrder = max+1; visibility 'dm'
export class WorldLayerError extends Error { constructor(readonly code: string) }
// layer-handlers.ts (усі withDM)
layersListHandler(campaignId, mapId); layerCreateHandler(req, campaignId, mapId); layerPatchHandler(req, campaignId, layerId);
layerHeroesHandler(req, campaignId, layerId); layerDeleteHandler(req, campaignId, layerId)
```

- [ ] Тести спершу, за зразком `session-handlers.test.ts` (мок prisma): створення → 201, `visibility: 'dm'`; ліміт → 409; чужа кампанія/карта → 404 (`loadOwned`-стиль через `ownedMap`); PATCH видимості, rect, opacity; PUT heroes замінює набір транзакційно й відкидає `characterId` не з кампанії (400 `WORLD_LAYER_INVALID`); DELETE без `?markers=` при наявних маркерах → 409 `WORLD_LAYER_HAS_MARKERS`, `delete`/`update` не викликані; `?markers=ungroup` → `updateMany({layerId:null})` потім delete; `?markers=delete` → `deleteMany` маркерів (із чисткою показу — використати `clearShowAfterDelete` + піддерево вкладених карт як у `deleteWorldMarkerHandler`: кожен видалений маркер із `childMap` обробляти тим самим шляхом `deleteSubtreeWithFiles`; якщо це складно — для таких маркерів повертати 409 `WORLD_LAYER_HAS_MARKERS` і документувати в коді одним рядком); DELETE без маркерів → 200 одразу.
- [ ] Marker create/update: `layerId` → перевірка `prisma.worldLayer.findFirst({ where:{ id, mapId: <карта маркера> } })`, інакше 404 `WORLD_LAYER_NOT_FOUND`; `layerId: null` знімає шар. Тест: шар іншої карти → 404, не 500.
- [ ] Усі мутації шарів → `publishWorldChanged(campaignId, mapId)`.
- [ ] Видалення карти каскадом: unit-тесту немає; переконатися, що `NoAction` FK не ламає (`grep` міграції) і додати в `layer-handlers.test.ts` коментар-кейс не потрібен.
- [ ] Commit: `feat(world): layers CRUD API`

## Task 4: клієнт — api, ключі, хуки

**Files:**
- Modify: `lib/api/world.ts`, `lib/hooks/world/keys.ts`, `lib/hooks/world/index.ts`, `lib/hooks/world/useWorldEditor.ts` (додати `layers`), `lib/hooks/world/useWorldMap.ts` якщо потрібно
- Create: `lib/hooks/world/useWorldLayers.ts`, `lib/hooks/world/useLayerVisibility.ts`, `lib/hooks/world/__tests__/useWorldLayers.test.tsx`

**Interfaces — Produces:**
```ts
// lib/api/world.ts
createWorldLayer(campaignId, data: CreateWorldLayerData): Promise<WorldLayer>
updateWorldLayer(campaignId, id, data: UpdateWorldLayerData): Promise<WorldLayer>
setWorldLayerHeroes(campaignId, id, heroIds: string[]): Promise<WorldLayer>
deleteWorldLayer(campaignId, id, mode?: DeleteWorldLayerMode): Promise<{ ok: true }>
// keys.ts: нічого нового — шари DM читаються з worldKeys.map (detail.layers); інвалідація worldKeys.mapAll/viewAll
// useWorldLayers(campaignId, mapId): { create, update, setHeroes, remove } — useCrudMutation, invalidateKeys = [worldKeys.mapAll, worldKeys.viewAll]
// useLayerVisibility(layerIds: string[]): { hidden: ReadonlySet<string>; toggle(id): void; isShown(layerId: string|null): boolean }   // локальний, у пам'яті (useState), не зберігається
```
- [ ] `deleteWorldLayer` шле режим query-параметром: `campaignDelete(campaignId, `/world/layers/${id}${mode ? `?markers=${mode}` : ''}`)` (`campaignDelete` не приймає тіло).
- [ ] Тест хуків: `toggle` перемикає; `isShown(null)` завжди true; мутація `remove` викликає API з mode.
- [ ] Commit: `feat(world): layers client api and hooks`

## Task 5: спільні хуки (закриття дублів) — рефактор без зміни поведінки

**Files:**
- Create: `lib/hooks/world/usePinGesture.ts`, `lib/hooks/common/useDebouncedCommit.ts` (+ export у `lib/hooks/common/index.ts`)
- Modify: `components/world/map/WorldEnemies.tsx`, `components/world/map/WorldPins.tsx`, `lib/hooks/world/useMarkerFields.ts`, `components/world/editor/EnemyCard.tsx`
- Test: `lib/hooks/world/__tests__/usePinGesture.test.tsx`, `lib/hooks/common/__tests__/useDebouncedCommit.test.tsx`; наявні `EnemyCard.test.tsx`, тести WorldPins/WorldEnemies мають лишитися зеленими

**Interfaces — Produces:**
```ts
// usePinGesture — вигляд із WorldEnemies (gesture ref + exceedsDragThreshold з lib/utils/world/hero-drag)
usePinGesture<Id extends string>(opts: {
  draggable: boolean;
  onClick?(id: Id): void;
  onDragMove?(id: Id, e: { clientX: number; clientY: number }): void;   // вже після порога
  onDragEnd?(id: Id, e: { clientX: number; clientY: number }): void;
  onCancel?(): void;
}): { bind(id: Id): Pick<HTMLAttributes<HTMLElement>,'onPointerDown'|'onPointerMove'|'onPointerUp'|'onPointerCancel'> }
// useDebouncedCommit<T>(commit: (v: T) => void, ms = 400): { schedule(v: T): void; flush(): void }  // flush на unmount; commit береться з ref (завжди актуальний)
```
- [ ] Тести хуків спершу: поріг (рух < 6 px → onClick, не drag), drag → `onDragEnd` один раз, cancel скидає; `schedule` двічі → один commit останнього значення після `ms`; `flush` на unmount комітить очікуване; `commit` після перерендеру — актуальна версія.
- [ ] Перевести `WorldEnemies` і `WorldPins` на `usePinGesture`: **зберегти** `setPointerCapture` у `try/catch` (синтетичні події тура), `touchAction:'none'`, `onDragStart: noNativeDrag`-аналог якщо був, `e.stopPropagation()` у down/up. Для `WorldPins` `onDragMove/End` передають `clientX/Y` батькові як зараз (`drag.onMove/onEnd`). `data-dragging` лишається.
- [ ] `useMarkerFields` і `EnemyCard`: замінити ручні `pendingColor/timer/flush` на `useDebouncedCommit`. Поведінка (400 мс, flush при unmount) та сигнатури виходів не змінюються.
- [ ] Не запускати тести; в описі комміту вказати, що поведінку треба перевірити вживу (drag піна й ворога, колір).
- [ ] Commit: `refactor(world): shared usePinGesture and useDebouncedCommit`

## Task 6: рендер шарів на карті + прямокутник картинки (редактор)

**Files:**
- Create: `components/world/map/WorldLayerImages.tsx`, `components/world/map/LayerImageRect.tsx`, `components/world/nav/LayerLegend.tsx`
- Modify: `components/world/map/WorldMapView.tsx`
- Test: `components/world/map/__tests__/WorldLayerImages.test.tsx`, `components/world/nav/__tests__/LayerLegend.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `WorldViewLayer`/`WorldLayer`, `usePinGesture`, `useLayerVisibility`.
- Produces:
```ts
// WorldMapView props: layers?: { items: (WorldViewLayer)[]; hidden: ReadonlySet<string>; edit?: { layerId: string|null; onRectChange(layerId: string, rect: LayerRect): void; toPoint(clientX,clientY): MapPoint|null } }
// WorldLayerImages({ layers, hidden }): абсолютно позиціонований <img>/next/image на % від box карти; opacity; pointer-events:none; шар сортується за порядком items
// LayerImageRect({ layer, onChange, toPoint, zoom }): рамка + 4 кутові хендли + перетяг тіла (usePinGesture); Escape скасовує; кроки не виходять за ліміти rect
// LayerLegend({ layers: WorldViewLayer[]; hidden; onToggle(id) })  — за зразком TrailLegend (HudChipTabs)
```
- [ ] У `WorldMapView` вставити `WorldLayerImages` у `layerStyle`-контейнер між базовою `<Image>` і `<WorldZones>`; `WorldFog` лежить далі, тож картинка обрізається туманом. Маркери шарів, що в `hidden`, відфільтрувати **до** `WorldPins`/`WorldZones` (`shownMarkers` вже є — розширити; `markers.filter(m => isShown(m.layerId))`). `LayerImageRect` рендерити в `atlas-top-layer` лише коли `layers.edit?.layerId` задано й `tool === 'select'`.
- [ ] Картинки шару — `next/image` (egress) з `unoptimized` лише якщо базова карта так само; дотримуватись того, що робить базова картинка (скопіювати `sizes`).
- [ ] Тести: `hidden` ховає зображення й пін маркера цього шару; `opacity` передається в style; шар без `imageUrl` нічого не малює; `LayerLegend` не рендериться при порожньому списку; клік перемикає.
- [ ] Commit: `feat(world): render layers and image rect editor`

## Task 7: UI ДМ — панель «Шари», картка маркера

**Files:**
- Create: `components/world/editor/layers/LayersPanel.tsx`, `components/world/editor/layers/LayerRow.tsx`, `components/world/editor/layers/LayerHeroPicker.tsx`, `lib/hooks/world/useLayerForm.ts`
- Modify: `app/campaigns/[id]/dm/world/page-client.tsx`, `lib/hooks/world/useWorldEditorPage.ts` (активний шар `activeLayerId`, `layers` з detail, передача в `WorldMapView.layers`; створення маркера підставляє `layerId: activeLayerId`), `components/world/editor/DmMarkerBubble.tsx` + `panels/WorldMarkerPanel.tsx` (вибір шару — `SelectField` з `allowNone`), `lib/hooks/world/useMarkerFields.ts` (`layerId` у збереженні через `save`)
- Test: `components/world/editor/layers/__tests__/LayersPanel.test.tsx`, оновити `DmMarkerBubble.test.tsx`

**Interfaces:** `LayersPanel({ campaignId, mapId, layers: WorldLayer[], activeId, onActive(id|null), heroes: RosterHero[], imageEdit: { layerId, set(id|null) } })`. Рядок шару: перейменування (`useCommittedName`), колір (`MarkerColorField`), `SelectField` видимості, `LayerHeroPicker` (чекбокси `Checkbox` лише при `heroes`), картинка (завантаження через `useWorldMapUpload` → `update({ imageUrl })`, кнопка «Позиція» вмикає `imageEdit`), `Slider` прозорості через `useDebouncedCommit`, `HudIconButton` видалення → `useConfirm` із вибором `ungroup`/`delete` (два підтвердження: `confirm` з description, потім другий `confirm` для delete; або `ResponsiveDialog` із двома кнопками — обрати один).

- [ ] Тести: створення шару викликає `create`; зміна видимості на `heroes` показує вибір героїв; видалення шару з маркерами питає режим і викликає `remove` із ним; шар без маркерів — без режиму.
- [ ] Панель показується в режимі «Будувати» (десктоп — бічна колонка поруч із `MapTree`/панелями; телефон — лист за наявним патерном панелі маркера). Не ламати `eyes.asHeroId`-режим (там панель прихована).
- [ ] Попередження в діалозі видалення `ungroup`: маркери стануть видимими всім (i18n-ключ).
- [ ] Commit: `feat(world): DM layers panel and marker layer picker`

## Task 8: UI гравця

**Files:**
- Modify: `components/world/play/WorldPlayClient.tsx`, `lib/hooks/world/useWorldPlay.ts`
- Test: `components/world/play/__tests__/` (знайти наявний тест `WorldPlayClient`/додати малий)

- [ ] `useWorldPlay` віддає `layers: { items: view.layers, hidden, toggle }` через `useLayerVisibility(view.layers.map(l => l.id))`; `WorldPlayClient` рендерить `LayerLegend` поруч із `TrailLegend` і передає `layers` у `WorldMapView`. Легенда не показується, якщо шарів нема.
- [ ] Тест: при `hidden` маркер шару не рендериться; шарів нема → легенди нема.
- [ ] Commit: `feat(world): player layer legend`

## Task 9: хвости підпроєкту 2

**Files:**
- Modify: `lib/server/world/session-store.ts` (+`entryCount`), `types/world.ts` (`WorldSession.entryCount?: number`; `WorldTrailSession = Omit<WorldSession,'description'|'active'|'entryCount'>`; `WorldTrailData.sessions: WorldTrailSession[]`), `lib/server/world/trail-handlers.ts` (гравцеві віддавати `WorldTrailSession`; ДМ — повні), `components/world/nav/TrailBubble.tsx` (опис лише якщо є), `components/world/travel/SessionsPanel.tsx` (кількість), `components/world/editor/panels/HeroEyesSelect.tsx` / `WorldToolbar.tsx` (B2), `app/campaigns/[id]/dm/world/page-client.tsx` + `WorldPlayClient.tsx` (`pickCard`), 
- Create: `lib/utils/world/pick-card.ts`
- Test: `lib/server/world/__tests__/trail-handlers.test.ts` (розширити), `session-handlers.test.ts` (count), `lib/utils/world/__tests__/pick-card.test.ts`, `HeroEyesSelect`/`WorldToolbar.test.tsx`

**Interfaces — Produces:** `pickCard({ trail, marker, isDesktop }: { trail?: {node: MapPoint; content: ReactNode}|null; marker?: {point: MapPoint|null; content: ReactNode}|null; isDesktop: boolean }): { point: MapPoint; content: ReactNode } | undefined` — trail має пріоритет; на мобільному `undefined`.

- [ ] `listSessions` рахує записи `world_travel_log` на сесію одним `groupBy({ by:['sessionId'], _count })`; **лише ДМ-відповідь** (`GET sessions`) містить `entryCount`; `SessionsPanel` показує «N записів».
- [ ] Гравцеві `trail.sessions` без `description` і `active`: тест `JSON.stringify` не містить `description`; `TrailBubble` не падає без опису.
- [ ] B2: у `WorldToolbar` обгортка селекту `HeroEyesSelect`: додати `min-w-0 max-w-full` і `overflow-hidden` контейнеру на мобільному, щоб сторінка не ширша за 390 px; перевірити в T-live.
- [ ] `pickCard` замінює вкладений тернарний у двох клієнтах; поведінку не змінювати.
- [ ] Commit: `fix(world): session entry count, player session privacy, 390px toolbar, pickCard`

## Task 10: i18n, онбординг, документація

**Files:** `messages/{uk,en}/world.json` (`world.layers.*`: title, new, visibility.{dm,all,heroes}, heroes, image, imagePosition, opacity, delete*, ungroupWarning, legend, entryCount для сесій, помилки), `messages/{uk,en}/whatsNew.json` + `lib/onboarding/whats-new.ts` (`{ id: '2026-11-20-world-layers', date: '2026-11-20', audience: 'all' }`), підказка/help (оновити `dm-world`/`player-world` статті в `messages/*/help*.json` — знайти `grep -rn "dm-world" messages | head`), `docs/architecture/world-map.md` (розділ «Шари»), `docs/STATUS.md` (рядок підпроєкту 3, хвости).

- [ ] Додати ключі в обидві локалі однаково; перевірити бюджет `wfrp member` (тест i18n-budget): якщо перевищено — підняти ліміт (де саме: `grep -rn "114" ratchets scripts lib/__tests__ | head`; підпроєкт 2 піднімав 114→114.5), і зазначити в STATUS.
- [ ] Commit: `docs(world): layers i18n, whats-new, architecture`

## Фінал (контролер, після T10)

- [ ] `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`, повний `pnpm test:run` **один раз**; відомі чужі падіння: `assistant-cleanup-cron.test.ts`, maze «40×30 generates fast» (flake).
- [ ] Opus-огляд (1 агент) по `git diff main...HEAD` з фокусом: приватність шарів (жоден гравецький шлях не читає `world_layers*` повз `buildWorldView`), FK/каскади, drag-регресії T5.
- [ ] `/simplify` на diff гілки (1–2 агенти), потім оновити `docs/architecture/world-map.md` і `docs/STATUS.md`.
- [ ] Жива перевірка на **`next start`** (не `next dev`): локальна БД `prodcopy_layers` (копія; sweep-guard приймає `prodcopy_<suffix>`), ДМ і гравець в окремих origin (`localhost:3010` і `127.0.0.1:3010`). Сценарії: створити шар `dm` → гравець не бачить нічого (перевірити network/JSON, не лише екран); `heroes` для одного героя → бачить лише він; картинка: завантажити, перетягнути/змінити розмір, прозорість; туман обрізає картинку; видалення шару з маркерами (обидва режими); drag піна маркера й ворога (T5), колір маркера й ворога (debounce); 390 px без горизонтального скролу; Escape при drag справжньою мишею; вузол сліду під пінном героя (клік потрапляє?). Прибрати тестові бої/дані.
- [ ] Не мерджити й не пушити без явного «так» власника. Після мерджу: `git mv` спеку й план у `docs/archive/superpowers/`, видалити worktree `../dnd-tracker-layers`.
