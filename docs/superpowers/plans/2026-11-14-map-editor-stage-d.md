# Редактор мап — етап D: рендер сітки для великих карт (план)

Spec: [`2026-11-14-map-editor-stage-d-design.md`](../specs/2026-11-14-map-editor-stage-d-design.md). Research: [`2026-11-14-map-grid-render-spike2.md`](../research/2026-11-14-map-grid-render-spike2.md). Епік: [`2026-11-13-map-editor.md`](2026-11-13-map-editor.md) «Етап D». Гілка `feat/map-editor-d` (worktree `../dnd-tracker-map-editor-d`). Не пушити, не мержити; міграцій немає (якщо відкрите питання 2 вирішиться на користь окремої колонки — додається задача T10a: expand-міграція `ADD COLUMN`, перемикач у налаштуваннях кампанії за зразком `mapLibraryEnabled`).

**Перед стартом:** відповіді на відкриті питання spec §8 (за замовчуванням — рекомендації spec). Виконавці — Sonnet, без рев'ю по задачах; тести пишуться разом із кодом; під час роботи лише `pnpm test:related <files>` і `pnpm exec eslint --fix <files>`; повний `test:run`/`tsc`/repo-lint/battle-sweep — один раз у T12. Кожна задача — окремий коміт.

## Пакет 1 — чиста геометрія (T1–T3, один виконавець)

### T1 — `lib/utils/battle/grid/region-path.ts` (+ експорт у `grid/index.ts`)
```ts
export type Runs = Map<number, Array<[x0: number, x1: number]>>;
export function rowRuns(keys: Iterable<string>): Runs;                 // відсортовано за y, потім x0
export function regionFillPath(keys: Iterable<string>): string;        // 'M{x0*U} {y*U}h{w*U}v{U}h-{w*U}z' на відрізок; '' для порожньої
export function regionOutlinePath(keys: Iterable<string>): string;     // граничні ребра, колінеарні склеєні
export function gridLinesPath(cols: number, rows: number): string;     // 'M0 {y*U}H{cols*U}' ×(rows+1) + 'M{x*U} 0V{rows*U}' ×(cols+1)
export function windowPath(map: { cols: number; rows: number }, win: GridWindow): string; // зовнішній прямокутник + внутрішній (evenodd)
```
Тести `region-path.test.ts`: порожньо → `''`; одна клітинка (fill = квадрат, outline = 4 відрізки); рядок `0..3` дає один відрізок; «бублик» 3×3 без центру — outline має внутрішній контур; дві несуміжні області; детермінізм за порядком вводу; `gridLinesPath(2,1)` точний рядок; `windowPath` з `win` на всю карту дає дві однакові рамки.

### T2 — `layout.ts`: обернена точка і видиме вікно
```ts
export function cellScreenPoint(ctm: ScreenMatrix, p: GridPoint): { x: number; y: number };
export interface RectLike { left: number; top: number; right: number; bottom: number }
export function visibleGridWindow(
    input: { viewport: RectLike; ctm: ScreenMatrix; cols: number; rows: number },
    margin?: number // за замовчуванням MAP_LIMITS.chunk
): GridWindow; // кути viewport → клітинки (через обернену CTM, мін/макс по 4 кутах — працює з поворотом), розширити на margin, округлити вниз/вгору до кратного chunk, обрізати картою
```
Тести (`layout.test.ts`): `cellAtScreenPoint(ctm, cellScreenPoint(ctm, p)) === p` для одиничної, зум 2 + зсув, поворот 90° (`a=0,b=1,c=-1,d=0,e=W`); `visibleGridWindow` — viewport усередині карти → вікно кратне 16 і містить viewport; viewport поза картою → обрізано; поворот.

### T3 — кільця і розстановка
```ts
// geometry.ts
export function* cellsByRing(map: Pick<BattleMapConfig,'cols'|'rows'>, from: GridPoint): Generator<GridPoint>;
// cellsByDistance(map, from) = [...cellsByRing(map, from)] (сигнатура не змінюється)
```
Порядок: кільце d = 0..max(cols, rows); усередині кільця — клітинки з `max(|dx|,|dy|) = d` у межах карти, рядками (y, потім x) — точно як стабільний sort `allCells` за `cellDistance`.
- `occupancy.ts nearestStandable`, `placement.ts` (гілка `near`), `maze/revive.ts`, `maze/tunnel.ts`, `spell/cast/move-self.ts` (там `filter` — замінити на цикл із раннім виходом, якщо далі береться перший/кілька) — перейти на генератор.
- `placement.ts sideAnchors`: кеш `Map<side, GridPoint[]>` у межах одного `placeParticipants` (поза `participants.map`); `shift` лишається по учаснику.
Тести: `geometry.test.ts` — `[...cellsByRing]` дорівнює старому `allCells().sort(...)` (скопіювати в тест як оракул) на 7×5 для кутової, крайової й центральної точки; генератор зупиняється після першого `find` (лічильник через обгортку). `placement.test.ts` — золотий порядок на 3 сценаріях (до зміни зняти очікування поточним кодом).

## Пакет 2 — аудит рушія (T4–T6, один виконавець)

### T4 — `dmMoveCap`
- `MAP_LIMITS.dmMoveCap = 60` (`lib/constants/map-limits.ts`; оновити інваріант-тест `map-limits.test.ts`, якщо є).
- `path.ts moveBudget`: для ДМ `Math.min(map.cols * map.rows, MAP_LIMITS.dmMoveCap)`; doc-рядок оновити.
- Тести `path.test.ts`: ДМ на 100×100 → 60, на 5×5 → 25, гравець — без змін; `move-mutation.test.ts`: ДМ на 61 клітинку вартості відхиляється тим самим `REJECT`, що й недосяжна.

### T5 — дальність як прямокутник
- `types/battle.ts`: `BattleMapView.range?: GridWindow | null` (doc: «клітинки в межах дальності прицілу; поза ним затемнено»); прибрати `'out-of-range'` з `BattleMapMark` (перегрепити `'out-of-range'` — лише `map-scene.ts`, `map-compose.ts`, `MapLayers.tsx`).
- `map-scene.ts`: замість `outOfRangeMarks` — `rangeWindow(map, origin: GridPoint[], rangeFeet, rules): GridWindow` (рамка footprint ± `feetToCells`, обрізана картою) → `scene.view.range`. Коментар-обґрунтування: `footprintDistance` — Чебишов, тож область — прямокутник.
- `map-compose.ts`: прев'ю більше не фільтрує `out-of-range`; `marks = preview ? preview.marks : scene.view.marks`; `range` переходить зі `scene.view`.
- Тести: `map-scene.test.ts` — прицілювання з `range` дає `view.range` = очікувана рамка, біля краю обрізана, `marks` без `out-of-range`; оракул: для кожної клітинки 12×9 `inside(range) === aimInRange(...)`; `map-compose.test.ts` — наведення не змінює `range` за ідентичністю.

### T6 — кеші `hazardCells`, `playableBounds`
- `terrain.ts hazardCells`: `WeakMap<terrain, Set>` як `impassableSet`, тип повернення `ReadonlySet<string>` (споживач `moveZoneMarks` лише читає).
- `layout.ts playableBounds`: порожній `blocked` → вся карта без скану; інакше скан від країв (верхній рядок униз до першої ігрової клітинки тощо); `WeakMap` за масивом `blocked` + ключ `cols:rows`.
- Тести: однакова ідентичність Set для того самого `terrain`; новий `terrain` → новий Set; `playableBounds` = старий алгоритм (оракул у тесті) на 50 випадкових масках 1..12×1..12 + повністю заблокована карта.

## Пакет 3 — рендер (T7–T8, один виконавець; найбільший)

### T7 — новий `GridLayer`
Файли: `components/battle/map/MapLayers.tsx` (лишити `StrokeLayer`, `TemplateLayer`), новий `components/battle/map/grid/` — `GridLayer.tsx`, `GridStatic.tsx` (лінії + маска, terrain, hazard, blocked), `GridMarks.tsx` (зони, розріджені позначки, `range`), `GridHit.tsx` (хіт-rect + шар наведення), `grid-style.ts` (кольори `ZONE`, `TERRAIN_FILL`, `markFill` — перенос). `MapStage.tsx`: `<svg data-fx-grid="" data-cols data-rows>`; передати `svgRef` у `cellActions`, `window` у `scene`.
- Рішення: див. spec §4.2. Маска ліній: `<mask id>` біла карта + чорні `regionFillPath(blocked ∪ wall/barrier)` і заливка зон. Позначки: `zoneKeys`/`dangerKeys`/розріджені — один прохід по `marks` у `useMemo([marks, blocked])`. `<title>` — лише на `data-grid-hover`. Полум'я — `<symbol id="battle-map-flame">` з `Flame` (lucide) + `<use>` для hazard-клітинок у `window` (без `window` — усі).
- Наведення: `onPointerMove` → клітинка; якщо ключ змінився — `setHover(cell)` (локальний стан `GridHit`) і `onCellHover(blocked ? null : cell)`; `onPointerLeave` → `null`. Курсор — на хіт-rect за станом наведення (`crosshair` при штриху, `pointer` при `onCellClick` і клікабельній клітинці).
- Тест-хелпер `components/battle/map/__tests__/grid-pointer.ts`: `stubGridCtm(container)` (одинична CTM на кожному `svg[data-fx-grid]`), `clickCell(container, p)`, `hoverCell(container, p)`, `pressCell(container, p)` (`pointerdown` для штриха); координати `clientX = (p.x + .5) * UNIT - win.x*UNIT`… (у тестах `win` = 0, телефонний тест — врахувати `playableBounds`).
- Міграція тестів: `BattleMap.test.tsx`, `BattleFormMap.test.tsx`, `MazeLayers/MazeToolbar/MazeFogOfWar.test.tsx`, `MapEditorScreen.test.tsx` (перегрепити `data-fx-cell`, `polygon[data-blocked]`, `[data-terrain] polygon`, `polygon[...] title`). Порядок шарів у `MazeFogOfWar.test.tsx` — замість `[data-fx-cell]` орієнтир `[data-grid-hit]`.
- Нові тести `BattleMap.test.tsx`: кількість `path`+`polygon` сітки однакова для 8×8 і 60×60 без позначок; DM-зона руху → рівно по одному `[data-fx-zone="move"]`-контуру й заливці; клік по blocked без `clickableBlocked` не викликає `onCellClick`; наведення на blocked → `onCellHover(null)`; `data-grid-hover title` для hazard/barrier як раніше; `data-out-of-range` з `view.range`.

### T8 — видиме вікно
- `lib/hooks/battle/useGridWindow.ts` (+ barrel): `useGridWindow({ svgRef, scrollRef, deps: { zoom, offset, size } }): GridWindow | null` — на `scroll` (passive) і зміні deps рахує `visibleGridWindow(scrollRef.current.getBoundingClientRect(), svg.getScreenCTM())` у rAF; `setState` лише при зміні вікна (порівняння 4 чисел). SSR/без CTM → `null` (рендер усього).
- `BattleMap.tsx`: викликати хук (є `outerRef`, `containerRef`, `zoom`, `offset`), віддати вікно в `MapStage` через `layout.window`.
- Споживачі вікна: лише полум'я hazard і (опційно) розріджені позначки. Тест `useGridWindow.test.tsx` (happy-dom, стаб CTM/rect, подія scroll → нове вікно; дрібний scroll у межах чанка не викликає ререндер).

## Пакет 4 — FX і ліміти (T9–T10, один виконавець)

### T9 — FX-контракт
- `components/fx/runtime/anchors.ts`: `cellPoint(at, root)` за spec §4.3; `visiblePoint(pt, el)` (вікно + `[data-fx-clip]` + `scrollViewport`), `visible(el)` перевикористовує ту саму перевірку боксів.
- `components/fx/__tests__/anchors.test.ts`: замінити фікстуру `data-fx-cell` на `<svg data-fx-grid data-cols data-rows>` зі стабом `getScreenCTM`; кейси spec §4.3 (без повороту, поворот, зум/панорама, поза кліпом → `undefined`, дві копії — видима, поза `cols/rows` → `undefined`); `resolvePoints` для касту в порожню зону летить у точку клітинки.

### T10 — ліміт під прапорцем
- `lib/utils/battle/map-storage/limits.ts`: `battleMapMaxSide(flags: { mapLibraryEnabled?: boolean | null }): number`; тест.
- `lib/server/battle-maps/campaign-limits.ts`: `campaignMapMaxSide(campaignId: string, db = prisma): Promise<number>` (`select: { mapLibraryEnabled: true }`). Використати в `record-service.ts linkedMapFor` і `map-update-mutation.ts` (замість `MAP_LIMITS.battleMaxSide`). Тести: 100×100 з прапорцем — ок, без — `BATTLE_MAP_TOO_LARGE`; фото-карта > 60 неможлива (Zod бібліотеки — наявний тест).
- Клієнт: `BattleMapLibraryPicker` — `battleMapMaxSide({ mapLibraryEnabled })` (прапорець через `useMapLibraryEnabled` у хуку пікера `useBattleLibraryMap`, не в компоненті); `CreateMapDialog`/`MapEditorScreen` — `max = map.background ? photoMaxSide : tileMaxSide`; `useBattleMapEditor({ maxSide })` опція (за замовчуванням `MAX_SIDE`), `useMapEditorDraft` передає `tileMaxSide` для карти без фону; `resize`/поле вводу клампляться ним. `applyCalibration` лишається на `MAX_SIDE` (фото).
- i18n: `tooLarge` уже параметризований; перевірити `battleSetup.validation.photoMapTooLarge` у формі редактора. Whats-new `2026-11-map-large` (`lib/onboarding/whats-new.ts` + `whatsNew.2026-11-map-large.*` у `messages/{uk,en}/whatsNew.json`): «карти до 200×200 у бою (бібліотека карт)».
- Тести: `useBattleMapEditor` з `maxSide: 200` приймає 150; без опції — 60; `MapEditorScreen` дозволяє 120 без фону.

## Пакет 5 — заміри, документи, гейти (T11–T12; T11 — Sonnet, T12 — основний сеанс)

### T11 — профіль «після» і документи
- Скрипти спайку оновити під новий API, не змінюючи сценаріїв: `algorithms.spike.ts` — `outOfRangeMarks` → `rangeWindow` (рядок «outOfRange/range»), `zoneCells` → `regionFillPath + regionOutlinePath` для DM-зони, решта тих самих викликів. `render.spike.tsx` — `cell polygons` → `[data-mark-cell]`. Запуск — команди з research-документа (алгоритми одним процесом; рендер — по розміру на процес з `NODE_OPTIONS=--max-old-space-size=12288`, 200×200 з `SPIKE_RENDER_RUNS=1`), `SPIKE_OUT=/tmp/spike-after`; перед — `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- Research: додати колонки «після» до обох таблиць і висновок (критерій: кількість елементів сітки не росте з N; DM-зона ≤ 10 мс у node на 200×200; наведення під час прицілу не перерендерює сітку).
- Документи: `docs/architecture/map-modes.md` (розділ «Рендер сітки (етап D)»: шари, хіт-шар, FX `[data-fx-grid]`, `range`, ліміт під прапорцем; виправити рядок «Тимчасово `battleMaxSide = 60`»), `docs/architecture/battle.md` (якщо згадує `out-of-range`/`moveBudget`), `docs/STATUS.md` (етап D + що лишилось на живий прогін).

### T12 — гейти (основний сеанс)
`/simplify` (1 агент), повний `pnpm test:run`, `tsc` (спершу «так» на `prisma generate`), repo-wide eslint один раз, `pnpm battle-sweep` на prodcopy, одне фінальне Opus-рев'ю. Живий прогін (Chrome з основного сеансу, dev на 3010+): 60×60 / 100×100 / 200×200 — клік, наведення, штрих, шаблон із затемненням, зона руху ДМ, FX у клітинку, desktop + 375; маска ліній під зонами (ризик 1) — разом із кінцевим прогоном епіку.

## Порядок і залежності
Пакет 1 → Пакет 2 (T5 використовує `GridWindow`) → Пакет 3 (T7 використовує T1, T5; T8 — T2) → Пакет 4 (T9 — T2; T10 незалежний, можна паралельно з пакетом 3) → Пакет 5. Оцінка: 4 Sonnet-диспетчеризації + T11 + Opus-рев'ю.
