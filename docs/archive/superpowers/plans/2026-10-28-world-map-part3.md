# Карта світу, частина 3 — Показ + Сценарій. План

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Один Sonnet-імплементер на пакет, без рев'ю по задачах, один фінальний Opus-рев'ю в кінці. Кроки — чекбокси `- [ ]`.

**Goal:** ДМ виводить карту світу гравцям через «Показ» (фокус маркера, провал при «Зайти», подорож прямо з доку), сценарій прив'язує місця до глав/рядків і згадує їх у тексті, гравці оновлюються подією `world-changed`; закриваються хвости частини 2.

**Architecture:** Режим карти — поле `world` у `ShowState` через наявні чисті команди (`applyShowCommand`), сховище за `seq` і подію `show-state`. Стан у спільному каналі містить лише id карти/маркера; кожен клієнт дочитує власний відфільтрований `view` (`buildWorldView`). Зміни світу — лише сигнал `world-changed` у той самий канал, обробник живе в `usePusherShowSync` (одна підписка на канал).

**Tech Stack:** Next.js 16, Prisma 6, TanStack Query, Zod, Pusher, Vitest (node / happy-dom), CSS-анімації.

**Spec:** `docs/archive/superpowers/specs/2026-10-27-world-map-design.md` + дельта `docs/archive/superpowers/specs/2026-10-28-world-map-part3-design.md` (рішення тут не повторюються — читати дельту перед кожним пакетом).

## Global Constraints

- **Міграцій нема.** `campaign_shows.world` уже є (`20261027000000_world_map`). Прив'язки сценарію — JSON `content`. RLS-тест (`prisma/__tests__/migrations-rls.test.ts`) не зачіпається.
- `campaign_shows`: рядок не видаляється, `seq` лише росте; запис — `writeShowState` з оптимістичним блокуванням, публікація — `publishShow` у `after()`.
- Pusher — лише `safePusherTrigger` (`lib/pusher/safe-trigger.ts`) у `after()`. У спільний канал не йде нічого з туману, `dmNote`, назв прихованих маркерів, нотаток.
- Шари: компоненти не імпортують `@/lib/api/*`; запити — `lib/api/{world,show,scenario}.ts`; логіка — хуки `lib/hooks/<domain>` (імпорт з barrel `index.ts`); ключі — `worldKeys`/`showKeys`; `route.ts` тонкий, логіка в `lib/server/world/*` / `*-handler.ts`.
- Zod на кожен вхід (`parseBody`), помилки — `errorResponse` з текстами `lib/constants/api-errors.ts` (укр.); чужа кампанія → 404 через `loadOwned`/`ownedMap`/`ownedMarker`.
- ESLint: padding-line, simple-import-sort, `import/no-cycle` (maxDepth 1), `no-console` (лише `info/warn/error`), `react-hooks/exhaustive-deps` = error. Діалоги — `ResponsiveDialog`, підтвердження — `useConfirm`.
- Коментарі мінімальні (лише «чому»). Тести в сусідніх `__tests__/`; UI-тести з `// @vitest-environment happy-dom`.
- Під час роботи — `pnpm test:related <files>` / `pnpm test:changed`; повний `pnpm test:run` — один раз у пакеті 5.

## Reuse before writing

| Що | Звідки | Для чого |
|---|---|---|
| `applyShowCommand`, `without`, `keepCover`, `EMPTY` | `lib/utils/show/show-command.ts` | команди `world`/`worldOff` — нові `case`, не новий модуль |
| `readShowState`, `writeShowState`, `publishShow`, `clearShowBattle` | `lib/server/show/show-store.ts` | поле `world`; `clearShowWorld` за зразком `clearShowBattle` |
| `showCommandSchema` | `lib/schemas/show.ts` | два нові варіанти union |
| `showsCover`, `visibleSlide` | `lib/utils/show/player-view.ts` | поруч `stageMode` |
| `mergeShow`, `writeShowSnapshot` | `lib/utils/show/merge-show.ts`, `lib/hooks/show/show-snapshot.ts` | `world` проходить без змін (порівняння за `seq`) |
| `usePusherShowSync`, `usePusherChannel` | `lib/hooks/show`, `lib/hooks/common` | обробник `world-changed` у тій самій підписці |
| `useShowControl`, `ShowControl`, `ShowButton`, `SHOW_TONE`, `ShowWaiting`, `ShowTransport` | `lib/hooks/show`, `components/show/stage/*` | кнопки доку, заглушка «Карта недоступна» |
| `showChannelName`, `safePusherTrigger`, `pusherServer` | `lib/pusher/{channels,safe-trigger,server}.ts` | `publishWorldChanged` |
| `WorldMapView` (`focus`, `selectedId`, `fog`, `heroes`, `handlers`, `overlay`, `hint`, `compact`) | `components/world/WorldMapView.tsx` | стейдж показу, діалог подорожі — без другого рендера |
| `viewToMapProps` | `lib/utils/world/view-props.ts` | `WorldView` → props `WorldMapView` |
| `TravelPanel` + `useTravelPanel`, `TravelLog` | `components/world/travel`, `lib/hooks/world` | подорож у доці; додається лише `onMoved` |
| `useWorldView`, `useWorldMap`, `useWorldMaps`, `useWorldHeroes`, `useWorldTravel`, `useWorldNotes`, `useNotesPanel`, `worldKeys` | `lib/hooks/world` | дані стейджу/доку/модерації |
| `WorldNotesPanel` (`isDM`) | `components/world/notes` | модерація в редакторі |
| `mapPath`, `subtreeMapIds` | `lib/utils/world/tree.ts` | дерево в пікерах; набір видалених карт для `clearShowWorld` |
| `ownedMap`, `ownedMarker`, `readWorldMapDetail`, `listWorldMaps`, `readViewerScope`, `knownMapIds` | `lib/server/world/*`, `lib/utils/world/player-view.ts` | перевірка цілі команди `world`, дозвіл показаної карти |
| `withDM`, `requireDM`, `requireCampaignAccess`, `parseBody`, `errorResponse`, `handleApiError`, `readOkJson` | `lib/utils/api` | нові/змінені handlers |
| `useCrudMutation` (`mutateOk`), `useSingleFlight`, `useReducedMotion`, `useMediaQuery` + `DESKTOP_QUERY`, `useElementSize`, `useSearch`, `useConfirm`, `useNotify` | `lib/hooks/common` | мутації, reduced-motion, mobile, пошук у пікері |
| `ResponsiveDialog`, `Button`, `Select`, `Tooltip*`, `useHudPortalClass` | `components/ui` | діалоги, вибір карти/маркера, тултіпи |
| `HudChipTabs`, `HudPanel`, `HudTile`, `EmptyState`, `QueryState`, `SearchInput`, `SearchEmptyState`, `OptimizedImage`, `EntityIcon` | `components/hud/page`, `components/common` | чіпи, пікер, кластер героїв |
| `RowBindings`, `SlidePickerDialog`/`BattlePickerDialog` (патерн), `SectionHeaderEditor`, `RowPlayControls`, `ScenarioShowDock` (`OnScreen`) | `components/scenario/{editor,play}` | чіп 📍, пікер маркера, кнопка гри |
| `hasPlayBindings`, `PlayLookup`, `useScenarioPlay` | `lib/utils/scenario/play.ts`, `lib/hooks/scenario` | `showMarker` поруч `showSlide` |
| `MENTION_TYPES`, `MENTION_LABELS`, `mentionHref`, `searchMentionsHandler`, `markdown.ts` | `lib/constants/scenario.ts`, `lib/utils/scenario`, `app/api/.../scenario/mentions` | тип `marker` |
| `PLAYER_DASHBOARD_SECTIONS`, `DashboardGroups`, `readPlayerDashboard` | `lib/constants/campaign-dashboard.ts`, `components/campaigns/dashboard`, `lib/server/campaigns/dashboard.ts` | плитка «Карта» |
| `WHATS_NEW`, `HINTS`, `DM_ARTICLES`/`PLAYER_ARTICLES`, `OnboardingHint` | `lib/onboarding/*`, `components/onboarding` | запис, підказки, статті |

**Нове, бо аналогів нема:** `stageMode`, `diveOrigin` + CSS провалу, `ShowWorldStage`/`useShowWorld`, `ShowWorldControls`, `WorldTravelDialog`, `publishWorldChanged`, `clearShowWorld`, `MarkerPickerDialog` (дерево карт → маркери; слайд-пікер не дерево), `clusterHeroes` (піксельне групування).

## Review Focus

- **Гонки:** дві команди показу паралельно → другий 409 `SHOW_CONFLICT`, клієнт перечитує стан; `world-changed` раніше за відповідь мутації — тротлінг + інвалідування, без втрати фінального стану; подія до підписки — `onSubscribed` інвалідовує й show, і world.
- **Витоки:** payload `show-state` і `world-changed` не містить назв, координат, `dmNote`, нотаток; `focusMarkerId` прихованого маркера не підсвічується й не центрує; DM-ендпоінт карт віддає лише публічні нотатки.
- **Доступ:** гравець відкриває показану карту, якої не знав (дозвіл лише поки вона в показі); після `worldOff` — знову 404; `asHeroId` гравцю й далі 403.
- Гравець без героїв / без позицій — туман + `alwaysVisible`, без 500; `fogEnabled=false` — усе.
- Видалення показаної карти/маркера → `clearShowWorld`; прив'язка сценарію до видаленого маркера → «Місце недоступне», кнопка гри вимкнена; згадка на видалений маркер → редактор без вибору, без 500.
- `prefers-reduced-motion` — без провалу й без fade; провал не блокує, якщо нова карта не завантажилась (тайм-аут → чорний до готовності, без вічного затемнення при помилці → `ShowWaiting`).
- 500 px: док, діалог подорожі, пікер, тулбар (перемикач «очима героя», підказка), кластер героїв.

---

## Структура файлів

**Створити:** `lib/utils/world/{dive,hero-clusters}.ts` (+ тести), `lib/server/world/world-events.ts`, `lib/hooks/world/{useShowWorld,useWorldDive,useMoveTarget}.ts`, `components/world/show/{ShowWorldStage,ShowWorldControls,WorldTravelDialog}.tsx`, `components/world/travel/TargetMark.tsx`, `components/world/HeroCluster.tsx`, `components/scenario/editor/MarkerPickerDialog.tsx`, `components/scenario/MarkerChip.tsx`, `docs/architecture/world-map.md`.

**Змінити:** `types/{show,scenario,world,campaigns}.ts`, `lib/utils/show/{show-command,player-view}.ts`, `lib/schemas/{show,scenario}.ts`, `lib/server/show/show-store.ts`, `app/api/campaigns/[id]/show/show-handler.ts`, `lib/server/world/{view,map,marker,note,travel}-handlers.ts`, `lib/pusher/channels.ts`, `lib/hooks/show/usePusherShowSync.ts`, `lib/hooks/world/{useWorldView,useTravelPanel,index}.ts`, `components/show/stage/{ShowStage,ShowControlPanel,ShowTransport,ShowWaiting}.tsx`, `components/scenario/{play/*,editor/{RowBindings,SectionHeaderEditor,ScenarioEditor},ScenarioPageView}.tsx`, `lib/utils/scenario/{play,mention-href}.ts`, `lib/constants/scenario.ts`, `app/api/campaigns/[id]/scenario/mentions/mentions-handler.ts`, `components/world/{WorldHeroes,WorldMapView,world-atlas.css}`, `components/world/{editor,travel,notes,play}/*`, `components/ui/tooltip.tsx` (якщо причина там), `app/campaigns/[id]/{world,dm/world}/*`, `lib/constants/campaign-dashboard.ts`, `components/campaigns/dashboard/DashboardGroups.tsx`, `lib/server/campaigns/dashboard.ts`, `lib/onboarding/{whats-new,hints}.ts`, `lib/onboarding/help/{dm,player}.ts`, `docs/architecture/{README,show}.md`, `docs/STATUS.md`.

## Пакети й залежності

| Пакет | Задачі | Залежить від | Паралельно |
|---|---|---|---|
| P1 Модель показу + сигнал | 1.1–1.3 | — | — |
| P2 Карта на екрані й у доці | 2.1–2.3 | P1 | з P3 (файли не перетинаються) |
| P3 Сценарій: прив'язки й згадки | 3.1–3.3 | P1 | з P2 |
| P4 Хвости ч.2 + плитка «Карта» | 4.1–4.3 | P2, P3 | — |
| P5 Документи, онбординг, перевірка | 5.1–5.2 | P4 | — |

P2 і P3 паралельно лише в окремих worktree/гілках з ребейзом; при одному імплементері — послідовно P2 → P3. `dm/world/page.*` у P3 не чіпати (`?marker=` — у P4).

---

# P1 — Модель показу, сервер, `world-changed`

### Task 1.1: Команди `world` / `worldOff` і режим екрана

**Files:** `types/show.ts`, `lib/schemas/show.ts`, `lib/utils/show/{show-command,player-view}.ts`, тести `lib/utils/show/__tests__/{show-command,player-view}.test.ts`.

```ts
export interface ShowWorld { mapId: string; focusMarkerId?: string }
// ShowState: world?: ShowWorld
// ShowCommand: | { action: "world"; mapId: string; focusMarkerId?: string } | { action: "worldOff" }
export type StageMode = "cover" | "world" | "slide" | "waiting";
export function stageMode(show: ShowState | null): StageMode
```
- `without()` приймає ключ `"world"`; `moveTo` у гілці «той самий слайд» знімає `battle`, `curtain`, `world`. `Ctx` без змін — перевірку цілі робить handler (1.2).
- Тести: `world` з `prev=null` створює стан з `seq 1`; знімає `curtain`; зберігає `deckId/slide/cover/audio/battle`; повтор тієї ж цілі → `prev` (той самий об'єкт); `worldOff` без `world` → `prev`, без `prev` → fail `SHOW_NOT_RUNNING`; `open`/`next` прибирають `world`; `end` прибирає; `curtain` зберігає `world`; `stageMode`: curtain+world → `cover`, world+slide → `world`, slide → `slide`, порожньо → `waiting`; `showsCover` для стану з `world` без слайда не ламає `ShowStage` (покрито `stageMode`).
- [ ] Тести → реалізація → коміт.

### Task 1.2: Сховище, handler, доступ гравця, очищення при видаленні

**Files:** `lib/server/show/show-store.ts`, `app/api/campaigns/[id]/show/show-handler.ts`, `lib/server/world/{view-handlers,map-handlers,marker-handlers}.ts`, тести `app/api/__tests__/{show-api,world-api}.test.ts`.

- `SHOW_SELECT`/`toShowState`/`writeShowState` — поле `world` (`json(next.world ?? null)`).
- `commandShow`: для `world` — `prisma.worldMap.findFirst({ where: { id, campaignId } })` → 404 `WORLD_MAP_NOT_FOUND`; `focusMarkerId` → `worldMarker.findFirst({ where: { id, mapId } })` → 404 `WORLD_MARKER_NOT_FOUND`.
- `export async function clearShowWorld(campaignId: string, gone: { mapIds: string[]; markerIds: string[] }): Promise<void>` у `show-store.ts` (3 спроби, `console.error` при збої). Виклик з `after()` у `deleteWorldMapHandler` (піддерево — `subtreeMapIds` до видалення) і `deleteWorldMarkerHandler` (маркер + піддерево його вкладеної карти).
- `viewHandler`: для гравця (`!access.isDM`) — `allowed.add(show.world.mapId)`, якщо показ у режимі карти (читання `campaignShow.findUnique({ select: { world: true } })` паралельно з `readViewerScope`).
- Тести: ДМ `world` чужої карти → 404; маркер з іншої карти → 404; гравець `POST world` → 403; `GET` повертає `world`; гравець `view?mapId=<показана, невідома>` → 200 з туманом, без `dmNote`; після `worldOff` → 404; видалення показаної карти знімає `world`, видалення фокус-маркера — лише `focusMarkerId`; гравець без героїв на показаній карті → 200, `heroes=[]`, `reveals=[]`.
- [ ] Тести → реалізація → коміт.

### Task 1.3: Подія `world-changed`

**Files:** `lib/pusher/channels.ts`, `types/world.ts`, `lib/server/world/world-events.ts` (нове), `lib/server/world/{travel,marker,map,note}-handlers.ts`, `lib/hooks/show/usePusherShowSync.ts`, `lib/hooks/world/useWorldView.ts`, тести `lib/server/world/__tests__/world-events.test.ts`, `lib/hooks/show/__tests__/usePusherShowSync.test.tsx`.

```ts
export const WORLD_CHANGED_EVENT = "world-changed";
export interface WorldChangedEvent { campaignId: string; mapId: string | null; seq: number }
export function publishWorldChanged(campaignId: string, mapId: string | null): void // after(() => safePusherTrigger(...))
```
- Виклики після успіху: travel (dest), enter (child), exit (parent), marker create/update/delete, map update/delete, нотатка — лише якщо `visibility === "public"` до або після зміни.
- `usePusherShowSync`: другий обробник у тій самій `usePusherChannel`; тротлінг 1 с trailing (`useRef` таймер, прибирається при unmount), відкидає повтор того ж `seq`; інвалідовує `worldKeys.viewAll/mapAll/maps/log`. `onSubscribed` інвалідовує й `worldKeys.viewAll`. Імпорт `worldKeys` з `@/lib/hooks/world/keys` (без циклу).
- `useWorldView`: з Pusher — `staleTime 60_000`; без — `15_000` + `refetchInterval 30_000`; `refetchOnWindowFocus: true`.
- Тести: payload без полів, крім `campaignId/mapId/seq`; приватна нотатка не тригерить; 3 події за 200 мс → одна інвалідація; дубль `seq` ігнорується; unmount скасовує таймер.
- [ ] Тести → реалізація → `pnpm test:related` → коміт.

---

# P2 — Карта на екрані гравця й у доці

### Task 2.1: Стейдж карти + провал

**Files:** `lib/utils/world/dive.ts` (+тест), `lib/hooks/world/{useShowWorld,useWorldDive,index}.ts`, `components/world/show/ShowWorldStage.tsx`, `components/show/stage/{ShowStage,ShowWaiting}.tsx`, `components/world/world-atlas.css`, тести `components/world/__tests__/ShowWorldStage.test.tsx`.

```ts
export function diveOrigin(prev: Pick<WorldView, "map" | "markers"> | null, next: Pick<WorldView, "map">): MapPoint | null
// next.map.parentMarkerId є серед prev.markers і next.map.parentMapId === prev.map.id → {x,y} маркера
export function useShowWorld(campaignId: string, world: ShowWorld, isDM: boolean): { status: "loading" | "missing" | "ready"; props?: WorldViewMapProps; focus?: { point: MapPoint; seq: number }; selectedId?: string; mapId: string }
export function useWorldDive(view: WorldView | undefined, reduced: boolean): { phase: "idle" | "dive" | "reveal"; origin: MapPoint | null; shown: WorldView | undefined }
```
- `useShowWorld`: гравець — `useWorldView({ mapId })`; ДМ — `useWorldMap` (повний вигляд, `heroes` з detail, без `fog`). Фокус лише якщо маркер є в `markers`.
- `useWorldDive` тримає попередній показаний вигляд, поки нова карта вантажиться; `dive` 600 мс → `reveal` 300 мс → `idle`; `reduced` → одразу `idle` з новим виглядом. Таймери прибираються при unmount.
- `ShowStage`: `stageMode(show) === "world"` → `<ShowWorldStage>` поверх шарів слайдів (шари не демонтуються); `ShowWaiting` отримує `message?` («Карта недоступна» для `missing`). ДМ бачить підпис «Гравці бачать карту зі своїм туманом».
- CSS: `.atlas-dive` (`transform-origin: var(--dive-x) var(--dive-y)`, `scale(4)`, затемнення псевдоелементом), `.atlas-reveal` (fade-in); `@media (prefers-reduced-motion: reduce)` — без анімацій (дубль захисту поруч з `useReducedMotion`).
- Тести: `diveOrigin` — маркер є → точка; маркер у тумані (нема в `markers`) → null; вихід (батьківська карта) → null; `useWorldDive` з fake timers — фази й reduced; стейдж: гравець бачить `fog`, фокус прихованого маркера не застосовується, 404 → «Карта недоступна», `curtain` → заглушка, а не карта.
- [ ] Тести → реалізація → коміт.

### Task 2.2: `ShowWorldControls` у доці

**Files:** `components/world/show/ShowWorldControls.tsx`, `components/show/stage/{ShowControlPanel,ShowTransport}.tsx`, `components/scenario/play/ScenarioShowDock.tsx`, тести `components/world/__tests__/ShowWorldControls.test.tsx`.

- Props: `{ campaignId: string; show: ShowState | null; control: ShowControl }`. Кнопки (`ShowButton`): «Вивести карту гравцям» (`world` з `show.world?.mapId ?? root`), `Select` карти (рядки з відступом за `mapPath(...).length`), `Select` фокус-маркера (`useWorldMap(mapId).markers`, «Без фокусу»), «До слайдів» (`worldOff`, лише коли `show.world`), «Подорож» (відкриває 2.3). Без карт у кампанії — лише `WorldMapLink`.
- `ShowControlPanel` монтує її замість одиночного `WorldMapLink` (посилання на редактор лишається всередині). `ScenarioShowDock`: показ доку також при `show?.world`; `OnScreen` — «🗺 Карта: <назва>» (назва з `useWorldMaps`); `ShowWorldControls` — у розгорнутому тілі доку поруч `ShowDeckStrip`.
- `ShowTransport`: «Завершити» активна й при `show.world`.
- Тести: «Вивести карту» шле `world` з коренем; вибір маркера шле `focusMarkerId`; «До слайдів» шле `worldOff`; кнопки `disabled` при `control.pending`; док видно при `world` без прив'язок.
- [ ] Тести → реалізація → коміт.

### Task 2.3: `WorldTravelDialog` + слідування після «Зайти/Вийти» (хвіст 4)

**Files:** `components/world/show/WorldTravelDialog.tsx`, `components/world/travel/TravelPanel.tsx`, `lib/hooks/world/useTravelPanel.ts`, `app/campaigns/[id]/dm/world/page-client.tsx`, тести `components/world/travel/__tests__/TravelPanel.test.tsx`, `components/world/__tests__/WorldTravelDialog.test.tsx`.

- `TravelPanelProps.onMoved?(e: { kind: "travel" | "enter" | "exit"; fromMapId: string; destMapId: string })`; `useTravelPanel` переходить з `mutateOk` на `mutateAsync` для доступу до `positions[0].mapId` (помилки й далі показує `errorText`).
- `WorldTravelDialog` `{ campaignId, mapId, open, onOpenChange, onMoved }`: `ResponsiveDialog hud`, усередині `WorldMapView` (повний вигляд ДМ, `tool="move"`), під ним `TravelPanel`. Вибір цілі спільний з редактором: стан `{ point, markerId }` і обробники `onMapClick`/`onMarkerClick` для `move` — новий хук `lib/hooks/world/useMoveTarget.ts`, компонент `TargetMark` переїжджає з `dm/world/page-client.tsx` у `components/world/travel/TargetMark.tsx`. Вибір карти всередині діалогу — крихти (`WorldCrumbs`).
- Док: `onMoved` з `kind ≠ "travel"` і `show.world?.mapId === fromMapId` → `control.send({ action: "world", mapId: destMapId })`.
- Редактор: `onMoved` з `kind ≠ "travel"` → `openMap(destMapId)` зі збереженням `tool="move"` (новий аргумент `openMap(id, { keepTool: true })`); вибрані герої живуть у `useTravelPanel` — панель не демонтувати при зміні карти (ключ без `mapId`).
- Тести: `enter` → `onMoved({kind:"enter", destMapId: child})`; док при показі на джерелі шле `world`, при показі в слайдах — ні; редактор після `exit` викликає `router.replace` з `?map=<parent>`, інструмент лишається `move`.
- [ ] Тести → реалізація → коміт.

---

# P3 — Сценарій: прив'язки й згадки

### Task 3.1: Тип, схема, пікер, чіп у редакторі

**Files:** `types/scenario.ts`, `lib/schemas/scenario.ts`, `components/scenario/editor/{MarkerPickerDialog,RowBindings,SectionHeaderEditor,ScenarioEditor}.tsx`, `components/scenario/MarkerChip.tsx`, тести `lib/schemas/__tests__/scenario.test.ts`, `components/scenario/editor/__tests__/MarkerPickerDialog.test.tsx`.

```ts
export interface ScenarioMarkerRef { mapId: string; markerId: string } // ScenarioRow.marker?, ScenarioSection.marker?
```
- Схема: `marker: z.object({ mapId: idSchema, markerId: idSchema }).optional()` у `rowSchema` і `sectionSchema`.
- `MarkerPickerDialog` `{ campaignId, open, onOpenChange, onPick(ref) }`: ліва колонка — дерево `useWorldMaps` (відступ за `mapPath`), права — маркери обраної карти (`useWorldMap`), `SearchInput` + `useSearch` за назвою; без карт — `EmptyState` з `WorldMapLink`. На < `lg` — два кроки (карта → маркер).
- `MarkerChip` `{ campaignId, ref, onRemove? , action? }` — 📍 + назва з `useWorldMap(ref.mapId)`; маркера/карти нема → «Місце недоступне». Спільний для редактора й гри.
- `RowBindings.onChange.marker(v)`, `SectionHeaderEditor.actions.onMarker(v)`; `ScenarioEditor` пише поле в `content`.
- Тести: схема приймає/відкидає `marker`; пікер шле `{mapId, markerId}`; пошук фільтрує; чіп «Місце недоступне» при 404 карти; відв'язка прибирає поле.
- [ ] Тести → реалізація → коміт.

### Task 3.2: Гра: «Показати на карті»

**Files:** `lib/utils/scenario/play.ts`, `lib/hooks/scenario/useScenarioPlay.ts`, `components/scenario/play/RowPlayControls.tsx`, `components/scenario/ScenarioPageView.tsx`, тести `lib/utils/scenario/__tests__/play.test.ts`, `components/scenario/play/__tests__/RowPlayControls.test.tsx`.

- `hasPlayBindings`: `s.marker || s.rows.some(r => r.slide || r.battleId || r.marker)`. `markerOnScreen(ref, show): boolean` — `show.world?.mapId === ref.mapId && show.world.focusMarkerId === ref.markerId && !show.curtain`.
- `ScenarioPlay.showMarker(ref: ScenarioMarkerRef): void` → `control.send({ action: "world", mapId, focusMarkerId: markerId })`.
- `RowPlayControls` і заголовок глави в `ScenarioPageView` (лише в режимі гри): `MarkerChip` + «Показати на карті» / «● На екрані»; недоступний → кнопка вимкнена.
- Тести: `hasPlayBindings` з маркером лише в главі → true; `markerOnScreen` під `curtain` → false; клік шле команду; недоступний маркер — кнопка `disabled`.
- [ ] Тести → реалізація → коміт.

### Task 3.3: Згадка `marker`

**Files:** `lib/constants/scenario.ts`, `lib/utils/scenario/mention-href.ts`, `app/api/campaigns/[id]/scenario/mentions/mentions-handler.ts`, тести `lib/utils/scenario/__tests__/mention-href.test.ts`, `app/api/__tests__/scenario-aux-api.test.ts` (доповнити), `lib/utils/scenario/__tests__/markdown.test.ts`.

- `MENTION_TYPES` + `"marker"`, `MENTION_LABELS.marker = "Місце"`. `mentionHref(cid, "marker", id)` → `/campaigns/${cid}/dm/world?marker=${id}` (явна гілка до `section`-мапи).
- Пошук: `prisma.worldMarker.findMany({ where: { map: { campaignId }, name: { contains, mode: "insensitive" } }, select: { id, name }, take })`.
- Тести: href; пошук повертає маркер лише цієї кампанії; markdown round-trip `marker`-згадки; невідомий тип і далі ігнорується.
- [ ] Тести → реалізація → коміт.

---

# P4 — Хвости частини 2 + плитка «Карта»

### Task 4.1: Модерація нотаток ДМ (хвіст 1) + `?marker=` у редакторі

**Files:** `types/world.ts` (`WorldMapDetail.notes?: WorldNote[]`), `lib/server/world/map-handlers.ts` (`getWorldMapHandler`), `components/world/notes/WorldNotesPanel.tsx`, `lib/hooks/world/useNotesPanel.ts`, `components/world/editor/WorldMarkerPanel.tsx`, `app/campaigns/[id]/dm/world/{page,page-client}.tsx`, тести `app/api/__tests__/world-notes-api.test.ts`, `components/world/notes/__tests__/WorldNotesPanel.test.tsx`.

- `getWorldMapHandler` (ДМ) додає `notes` маркерів карти **лише `visibility: "public"`** (`mine` = автор — ДМ).
- `WorldNotesPanel isDM`: без вкладок, список публічних, видалення через `useConfirm`, форма пише лише `public` (без вибору героя). `useNotesPanel` при `isDM` фіксує `tab="public"`. Монтується в `WorldMarkerPanel` під полями маркера.
- `useWorldNotes` оптимістично патчить і `worldKeys.map(cid, mapId)` (`notes`), не лише `view`.
- `page.tsx`: `?marker=<id>` → `worldMarker.findFirst({ where: { id, map: { campaignId } }, select: { mapId } })` → `mapId` + `initialSelectedId` у клієнт; чужий/неіснуючий → ігнор (корінь).
- Тести: приватна нотатка гравця не потрапляє в detail ДМ; ДМ видаляє публічну; форма ДМ шле `public`; `?marker=` чужої кампанії → корінь без вибору.
- [ ] Тести → реалізація → коміт.

### Task 4.2: Тулбар на 500 px і тултіпи (хвости 2, 3, 8)

**Files:** `components/world/editor/{WorldToolbar,HeroEyesSelect}.tsx`, `components/world/WorldMapView.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`, `components/ui/tooltip.tsx` та/або `app/globals.css` (за причиною), тести `components/world/editor/__tests__/WorldToolbar.test.tsx`, `components/ui/__tests__/tooltip.test.tsx`.

- **Хвіст 2:** на < `lg` `HeroEyesSelect` рендериться окремим рядком під тулбаром на всю ширину (не в горизонтально-скрольному контейнері); на `lg` — як зараз. Рішення через CSS-класи (`max-lg:`/`lg:`), не `useMediaQuery` у першому рендері (гідрація).
- **Хвіст 3:** `hint` у `WorldMapView` на < `lg` — зверху (`top-2`, `left-2 right-2`, `max-w`), на `lg` — як зараз; зум-кнопки знизу-праворуч не перекриваються.
- **Хвіст 8 (корінь, не латка):** `TooltipContent` = `bg-foreground text-background` + `useHudPortalClass()`; гіпотеза — у порталі з HUD-класом `--foreground`/`--background` перевизначені так, що фон кремовий, а текст того ж/прозорого кольору. За `superpowers:systematic-debugging`: у dev навести на кнопку, прочитати computed `color`/`background-color` і звідки токени. Виправити в одному місці (токени HUD-контексту для тултіпа або явні HUD-класи в `TooltipContent` при `hudClass`), щоб усі тултіпи в HUD/атласі мали контраст. Перевірити всі `Tooltip` у `components/world/**` і хоча б один поза світом (регрес).
- Тести: на тулбарі `HeroEyesSelect` має клас окремого рядка на mobile; `hint` має `max-lg:top-2`; тултіп у `HudPortalClassProvider` має клас тексту, відмінний від фону (перевірка класів/inline стилю, не скріншот).
- [ ] Тести → реалізація → коміт.

### Task 4.3: Герої в одній точці (хвіст 7) + плитка «Карта» гравця

**Files:** `lib/utils/world/hero-clusters.ts` (+тест), `components/world/{WorldHeroes,HeroCluster}.tsx`, `components/world/world-atlas.css`, `types/campaigns.ts`, `lib/server/campaigns/dashboard.ts`, `lib/constants/campaign-dashboard.ts`, `components/campaigns/dashboard/DashboardGroups.tsx`, `app/campaigns/[id]/page.tsx`, тести `components/world/__tests__/WorldHeroes.test.tsx`, `components/campaigns/dashboard/__tests__/*`.

```ts
export function clusterHeroes(heroes: WorldHero[], px: (h: WorldHero) => { x: number; y: number }, thresholdPx: number): { key: string; x: number; y: number; heroes: WorldHero[] }[]
```
- Поріг у пікселях екрана (`HERO_CLUSTER_PX = 24`): `px` = `x·box.width·zoom`, `y·box.height·zoom` — aspect і зум враховані автоматично; жадібне групування в порядку вхідного списку, свої герої першими (зверху). Позиція кластера — перший герой.
- `HeroCluster`: аватар верхнього + бейдж «+N»; клік/Enter відкриває `Popover` зі списком (аватар + ім'я, клік → `onHeroClick`); одиночний герой — як зараз. `WorldMapView` передає `box`/`zoom` у `WorldHeroes`. Працює однаково для ДМ, «очима героя» й гравця, бо кластеризує вже відфільтровані `heroes`.
- Плитка: `PlayerDashboardData.hasWorld: boolean` (`worldMap.count({ where: { campaignId, parentMarkerId: null } }) > 0`, і для гравця без героя); `PLAYER_DASHBOARD_SECTIONS` + `{ key: "player-world", href: id => /campaigns/${id}/world, icon: Map, title: "Карта", subtitle: "Ваші герої й відкриті місця світу", keywords: ["світ", "мапа"] }`; `DashboardGroups` отримує `hiddenKeys?: string[]` (сторінка передає `["player-world"]`, коли `!hasWorld`).
- Тести: 3 героя в одній точці → 1 кластер з 3; на межі порогу; після зуму × 3 ті самі герої розходяться; aspect 3:1; чужі приховані герої не потрапляють (вхід уже фільтрований — тест на `WorldHeroes` з view-даними); бейдж «+2», список у поповері; плитка ховається без кореневої карти.
- [ ] Тести → реалізація → коміт.

---

# P5 — Документи, онбординг, фінал

### Task 5.1: Онбординг і документи

**Files:** `lib/onboarding/{whats-new,hints}.ts`, `lib/onboarding/help/{dm,player}.ts`, `app/campaigns/[id]/dm/world/page-client.tsx`, `components/world/play/WorldPlayClient.tsx`, `docs/architecture/{world-map,README,show}.md`, `docs/STATUS.md`.

- `WHATS_NEW` (першим): `2026-10-28-world-map`, `audience: "all"`, «Карта світу» — ДМ веде героїв картою континенту й показує її гравцям, у кожного свій туман, нотатки до місць, прив'язки в сценарії; `href` — стаття гравця.
- Статті: `dm-world-map` (редактор, зони, вкладені карти, переміщення й rest-запис, «очима героя», показ, прив'язки/згадки) і `player-world-map` (плитка «Карта», туман, нотатки «Спільні/Мої», показ карти). Підказки: `dm.world` (`<OnboardingHint id="dm.world" />` у редакторі) і `player.world` (на `/world`), `helpSlug` на нові статті — тест реєстру перевіряє slug.
- `docs/architecture/world-map.md` (нове, укр.): дані й таблиці, `buildWorldView` як єдиний фільтр, координати/aspect, переходи й журнал, **rest лише запис (рішення ч.3; `restParty` — після мерджу constructor)**, показ (`ShowState.world`, `stageMode`, доступ до показаної карти), `world-changed` (одна підписка в `usePusherShowSync`, тротлінг), прив'язки `{mapId, markerId}` і згадка `marker`, провал і reduced-motion, кластери героїв, модерація нотаток. Рядок в `docs/architecture/README.md`; в `show.md` — рядок про режим карти з посиланням.
- `docs/STATUS.md`: рядок «Карта світу» → частина 3 (гілка `feat/world-map-3`, `../dnd-tracker-world3`), відкриті пункти; `git mv` спек/планів світу в `docs/archive/superpowers/` — у коміті мерджу (за командою користувача).
- [ ] Реалізація → `pnpm test:related lib/onboarding` → коміт.

### Task 5.2: Перевірка й рев'ю

- [ ] `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` (у worktree, один раз).
- [ ] **Один фінальний Opus-рев'ю** диф `feat/world-map-3` проти `main` за Review Focus; виправлення — одна хвиля Sonnet; `/simplify` (1 агент).
- [ ] Live-прогін (нижче), звіт `docs/reports/world-map-part3-live-<дата>.md`, оновити `docs/STATUS.md`. Merge — за командою користувача.

---

## Live-прогін (субагент Sonnet, Chrome профіль «Work»)

**Середовище:** dev `:3100` з `../dnd-tracker-world3` (`.env.local` — копія з `../dnd-tracker-world2`), локальна БД `worldmap_dev` з Ашаном (`pnpm seed-world-map <campaignId>`, якщо порожня). Скріншоти масштабовані, перевірки — JS/текстом (`feedback-browser-context`). Акаунт Google для ДМ обирає користувач. Тестові дані з префіксом «ТЕСТ», після прогону прибрати (маркери, нотатки, позиції/reveals/журнал, `campaign_shows.world` → `worldOff`, тестовий гравець і його герой); звіт — «було/стало».

**Другий акаунт (гравець) — рішення користувача 2026-10-28: другий Google-акаунт.** Користувач сам входить ним у другому профілі Chrome (з розширенням) і приймає запрошення в тестову кампанію; субагент лише запитує його про це перед сценарієм гравця. Supabase Auth не чіпаємо. Тестового гравця й героя після прогону прибрати з кампанії.

Гравець приєднується за кодом запрошення, створює чернетку героя → ДМ схвалює (реальний флоу `controlledBy`).

**Сценарії (desktop 1512 px + 500 px для обох ролей):**
- ДМ: «Вивести карту гравцям» з `/show` і з доку сценарію; вибір вкладеної карти й фокус-маркера; «До слайдів»; заглушка `B` поверх карти; «Завершити».
- ДМ: «Подорож» з доку — перемістити героя гравця (відрізок), «Зайти» → показ сам переходить на вкладену карту; гравець бачить провал (і без нього при `prefers-reduced-motion` — емуляція в DevTools); «Вийти» — crossfade. Редактор після «Зайти/Вийти» на карті призначення з інструментом `move`.
- Гравець на `/show`: бачить лише свій туман; маркер у тумані з фокусом не підсвічений; показана невідома карта відкривається з туманом; після `worldOff` `/world?map=<та карта>` → його поточна карта; оновлення після переміщення ДМ приходить без перезавантаження (`world-changed`, перевірити в Network/console, що payload лише `{campaignId,mapId,seq}`).
- Сценарій: прив'язати маркер до рядка й до глави, «Показати на карті» → «● На екрані»; згадка `@Місце` веде в редактор з вибраним маркером; видалити тестовий маркер → чіп «Місце недоступне», показ знімає фокус/карту.
- **Хвіст 6 (гравець):** вкладки «Спільні/Мої»; приватна нотатка гравця не видна ДМ (ні в редакторі, ні в API `GET /world/maps/[id]`); ДМ бачить і видаляє публічну; нотатка гравця до невидимого маркера через API → 403; чужу приватну не видно; «Мої герої» лише свої; плитка «Карта» на дашборді гравця.
- **Хвіст 7:** усі герої в одній точці → кластер «+N», список у поповері; при зумі розходяться (ДМ, «очима героя», гравець).
- **Хвіст 8:** навести на кожну кнопку тулбару редактора й інші тултіпи світу — текст читається (computed color ≠ background).
- **Хвости 2–3:** 500 px — перемикач «очима героя» видно без скролу; підказка малювання не перекриває зум.
- Консоль без помилок; невдалі запити — лише свідомо викликані.

## Self-review

- **Покриття:** `world` у показі (1.1–1.2, 2.1–2.2), екран гравця/туман (1.2, 2.1), провал + reduced-motion (2.1), `world-changed` (1.3), прив'язки/згадки/`hasPlayBindings` (3.1–3.3), `TravelPanel` у доці (2.3), whats-new/help/hints/архітектура/STATUS (5.1), кнопка «Карта» (4.3), хвости 1–8 (4.1, 4.2, 2.3, 5.1, live, 4.3, 4.2).
- **Узгодженість:** `ShowWorld`, `ScenarioMarkerRef`, `WorldChangedEvent`, `StageMode` визначені в 1.1/1.3/3.1 і вжиті далі під тими ж назвами; `onMoved` — один контракт для доку й редактора.
- **Відкрите:** список прив'язаних глав/рядків у панелі маркера (базова спека, екран редактора) — не в цій частині, кандидат у частину 4.
