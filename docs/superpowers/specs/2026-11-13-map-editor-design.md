# Редактор бойових мап — дизайн (spec)

**Дата:** 2026-11-13 · **Статус:** узгоджено з користувачем, реалізація НЕ почата і стартує лише після завершення рефактора E2 (безпечна точка — після злиття Ч18). План реалізації: `docs/superpowers/plans/2026-11-13-map-editor.md`. Промпти текстур: `docs/assets/tile-prompts/`.

Документ — єдине джерело дизайну епіку. Кожен етап (0, A–H) перед реалізацією отримує власний детальний spec/plan з повторною верифікацією всіх `файл:рядок` (рефактор їх зсуне). Усі посилання на код у цьому документі взяті зі звітів дослідницьких агентів (читання коду без запуску); позначене «верифікувати» треба перевірити.

## 0. Контекст і рішення
Зараз карта = фото-фон + SVG-сітка поверх. Потрібно п'ять речей:
1. **Калібрування сітки** на готових картах (клітинки, що вже намальовані на зображенні).
2. **Стіни-бар'єри між клітинками** (як у лабіринті) в основному редакторі й у бою.
3. **Редактор тайлів** (як Roll20): малюєш клітинку за клітинкою, текстури з варіантами.
4. **Великі карти + камера**: на ході зум до активного токена, кнопка «повернутись до себе», вільний скрол.
5. **Туман**: режим A «відкриті місця», режим B «зір гравця».

Рішення користувача: токени лишаються DOM-елементами; для режиму B достатньо UI-ховання (сервер шле повну сцену, як у maze).
Рішення за результатами дослідження: рендер тайлів — **Canvas 2D з чанками**, а не PixiJS (деталі в етапі E). Це змінює мою першу рекомендацію: Pixi додає залежність і ESLint-зону, а для сітки ≤200×200 клітинок чанковий Canvas 2D достатній.

## 0.1 Підтверджені рішення (відповіді користувача)
- **Двері й ґрати (бар'єр лише для руху) — у v1**, тобто B6 входить в етап B (типи ребер: стіна / ґрати / двері відчинені-зачинені).
- **Цільова карта 200×200, мобільні гравці важливі** → етапи C (камера) і D (рендер) обов'язкові, обертання карти на телефоні в режимі камери вимкнене, tap-ціль ≥ `MIN_TAP_CELL_PX`, чанки 16×16 і culling за камерою.
- **Текстури з трьох джерел:** CC0-паки (Kenney тощо), AI-генерація, завантаження DM → реєстр тайлсетів має поле `source: 'bundled'|'generated'|'campaign'`, кампанійні тайлсети зберігаються в бакеті кампанії з валідацією розміру/формату (квадрат, степінь двійки ≤ 256 px, ≤ 200 КБ), перевірка ліцензії лише для bundled; генерація — вручну користувачем за підготовленими промптами (без AI-виклику в застосунку), результат проходить ту саму валідацію.
- Шари (підлога/об'єкти) лишаються як у плані (2 шари); дах — не в v1.

## 1. Прив'язка до рефактора E2
Умови старту та порядок — у плані реалізації, розділ «Умови старту».

## 2. Reuse (що вже є і що НЕ писати заново)
| Потрібно | Вже є |
|---|---|
| Стіни по ребрах, `canStep`, `edgeKey`, `parseEdgeKey`, `wallSet` | `lib/utils/battle/modes/maze/walls.ts` (піднімаємо в core) |
| Малювання ребер протягом | `components/battle/modes/maze/MazeEdgeEditor.tsx`, `lib/hooks/battle/modes/maze/useMazeEdgeStroke.ts` (узагальнюємо) |
| Малювання клітинок протягом | `lib/hooks/battle/useStrokePaint.ts`, `paintCells` у `lib/utils/battle/grid/map-editor.ts` |
| Піксель→клітинка | `cellAtScreenPoint` у `grid/layout.ts` |
| Лінія клітинок | `cellLine` у `grid/geometry.ts:52` |
| Resize зображень | `lib/utils/common/image-resize.ts` (`drawResized`, `fitWithin`) |
| Розмір зображення | `lib/hooks/common/useImageSize.ts` |
| Масштаб/зсув фону | `lib/utils/battle/grid/background.ts` (`backgroundBox`, `gridForCellSize`, `impliedCellPx`) |
| Pan/zoom математика | `lib/utils/common/viewport-math.ts`, `useViewport` (спільний зі світовою картою) |
| Canvas-туман з плавним появленням | `components/world/WorldFog.tsx`, `lib/utils/canvas/ticker` |
| Дельти terrain | `diffTerrain` (`grid/terrain.ts:183`), `mapChange` у `pipeline/client-delta.ts` |
| Mutation-пайплайн бою | `runBattleMutation` + `lib/server/battles/mutations/<action>/` |
| Хуки режимів | `lib/utils/battle/modes/{types,engine,registry}.ts` |
| Завантаження зображень у бакет | `lib/supabase/{buckets,image-storage,battle-map-storage}.ts` |
| Фікстури тестів | `modes/maze/__tests__/fixtures.ts` (`mazeMap`), `lib/utils/battle/__tests__/fixtures/placed.ts` (`testMap`) |

## 3. Етапи (кожен = окремий spec → plan → SDD)

> **Пріоритет:** якщо розділ 3 суперечить розділам 5 і 6 (сховище карт, стан бою, правила стін), чинні розділи 5–6 (вони пізніші). Зокрема: тайли/стіни зберігаються в бібліотеці карт `battle_maps` + `battle_map_chunks` (а не в `battle_scenes`), а відкриті двері, зруйновані стіни й туман (`fog`, режим, радіус) — у `battle_map_state` на бій.
Порядок і залежності — у плані реалізації (`docs/superpowers/plans/2026-11-13-map-editor.md`).

### Етап A — Калібрування сітки (розмір: S–M)
**Чому першим:** базис уже є (`backgroundCols`, `gridOffset`), не потребує нової архітектури і не чіпає бойові правила.

Зараз: `backgroundCols` масштабує фон по ширині в клітинках; `gridOffset` ∈ [0,1) зсуває фон, не сітку; клітинки лише квадратні; при заміні фону обидва поля скидаються (`map-background-mutation.ts:32`, `setBackground` у `useBattleMapEditor.ts:168`).

Що робимо:
1. **Модель.** `BattleMapConfig.backgroundRows?: number` — окрема кількість клітинок по висоті (дозволяє не квадратні клітинки зображення; якщо немає — береться з пропорцій, як зараз). `backgroundBox` (`background.ts`) враховує окремий масштаб по осях. Zod (`battleMapSchema`, `lib/schemas/battles.ts:151`): `backgroundRows` > 0, ≤ 200. Без Prisma-міграції (JSON).
2. **Чисті модулі** (новий `lib/utils/battle/grid/calibration/`):
   - `fromCellRect(img, rect) → {backgroundCols, backgroundRows, gridOffset}` — користувач обводить одну клітинку (або квадрат N×N, `n` параметр).
   - `detectGrid(gray: Float32Array, w, h) → {cellW, cellH, offsetX, offsetY, confidence} | null` — градієнтна енергія по стовпцях/рядках, автокореляція для періоду, фаза піку → зсув; `null` якщо впевненість нижча за поріг.
   - `nudge(config, dx, dy, unit)` — зсув з кроком.
3. **Піксельний доступ.** `lib/utils/common/image-pixels.ts`: `grayPixels(file|url, maxSide=1024)` через існуючий `drawResized` + `getImageData` (зараз піксельного читання немає). Детектор працює на чистому масиві → тестується в node.
4. **UI в setup** (`components/battle/setup/`): компонент `GridCalibration` (props ≤ 7) у `BattleFormMap`: кнопки «Авто-визначення», «Обвести клітинку», «Квадрат N×N»; режим накладання: рамка на зображенні з ручками; прев'ю сітки з регульованою прозорістю; стрілки нуджингу ±1 px / ±0.01 клітинки. Хук `useGridCalibration` у `lib/hooks/battles/setup/`, інтегрується в `useBattleMapEditor` через `actions.applyCalibration`.
5. **Поведінка при заміні фону:** запитати «зберегти калібрування?» лише якщо розмір зображення той самий; інакше скидати як зараз.
6. **i18n:** `messages/{uk,en}/battleSetup.json` → `map.calibration.*`. **Onboarding:** whats-new `2026-MM-DD-grid-calibration`, hint у `lib/onboarding/hints.ts`.
7. **Тести:** `calibration/__tests__/{fromCellRect,detectGrid,nudge}.test.ts` (синтетичні сітки з шумом, зсувом, неквадратні, «немає сітки» → null); `background.test.ts` (окремі осі); `battle-map-schema.test.ts`; `useGridCalibration.test.tsx` (happy-dom); `BattleFormMap.test.tsx`.
**Готово коли:** карта з вбудованою сіткою вирівнюється за ≤3 дії; авто-детект знаходить сітку на ≥ типових картах з бібліотеки користувача (перевірка живим прогоном на 3–5 реальних картах).

### Етап B — Стіни-бар'єри між клітинками в core (розмір: L)
**Мета:** стіна між двома сусідніми клітинками блокує рух, ближній бій, лінію вогню і шаблони; доступна в setup-редакторі та в бою (DM).

**B1. Модель і шов з режимом**
- `types/battle.ts`: `BattleMapConfig.walls?: string[]` (ключі `"x:y:e"`/`"x:y:s"`, ті самі, що в maze). Zod: `walls: z.array(edgeKeySchema).max(7200)` (`edgeKeySchema` вже є, `schemas/battles.ts:31`), перевірка, що ребро в межах cols/rows. Без міграції БД.
- Нова основа `lib/utils/battle/grid/walls.ts` (перенос з `modes/maze/walls.ts`: `edgeKey`, `parseEdgeKey`, `wallSet` (WeakMap-кеш по ідентичності масиву), `hasWall`, `cornerOpen`, `canStep(grid, walls, a, b)`, `allInteriorEdges`). `maze/walls.ts` лишається тонким re-export, щоб не ламати maze і `scripts/sim/battle-sweep.ts`.
- **Шов з maze без порушення правила «core не імпортує режим»:** новий опційний хук режиму `walls?(map): readonly string[]` у `modes/types.ts` + диспетчер `modeWalls(map)` у `modes/engine.ts`; maze повертає `map.maze.walls`. Core використовує `wallsOf(map) = union(map.walls, modeWalls(map))`. Існуючі лабіринти працюють без міграції; пізніше можна міграцією перенести `maze.walls` у `map.walls`.
- Типи ребер у v1: стіна, ґрати (`bars`), двері (`doors`) — див. B6.

**B2. Правила (усі місця, що вирішують досяжність/сусідство/видимість між клітинками)**
- Рух: `grid/path.ts` `searchPaths` (l.101) — фільтрувати `neighbors(cur)` через `canStep`; для істот більше 1 клітинки — footprint-aware: хід на (dx,dy) дозволений, якщо для кожної клітинки footprint `canStep(cell, cell+d)`. Обгортки `reachable`, `pathFrom`, `pathTo`, `moveBudget` успадковують. Сервер: `mutations/move/move-mutation.ts:134`. Клієнт: `map-view.ts:26 moveMarks`, `moveZoneMarks` (l.102), `map-scene.ts:278-298`.
- Лінія вогню: `grid/line-of-fire.ts` — між кожною парою послідовних клітинок лінії `canStep`; `blocked` також від `modeLineBlocked`. Виклики: `map-scene.ts:182`, `useAttackTargets.ts:66`, `attack-phase/run-attack-phase.ts:364`.
- Ближній бій і охоплення: `grid/attack-reach.ts` (`attackReachError`, `enemiesInReach`, `pickAttack`), що зараз спирається на `modeMeleeBlockedText`/`modeEngages` — додати core-перевірку стіни між сусідніми клітинками; maze-хуки лишити для видимості.
- Сусідство без карти: `grid/occupancy.ts:56 isAdjacent` приймає лише учасників — додати `isAdjacentOnMap(map, a, b)` і замінити виклики, де є карта: `adjacent-attack.ts:12`, `spell/cast/outcome.ts:83`, `abilities/registry/conditions.ts:271`, `systems/d20/rules/actions/availability.ts:80`, `grapple.ts:485,553`, `systems/wfrp/rules/combat/resolve-attack.ts:80,83`; сирі `footprintDistance <= 1` у `attack/process/{cleave,piercing}.ts`, `maneuvers/fire-burst.ts:35`, `spell/cast/{move-self,effects}.ts`, `attack/bonus.ts:123`, `spell/auto-reaction.ts:53`, `summon/objects-near.ts`, `abilities/engine/effects/map-auras.ts:47`, `systems/d20/rules/reactions/opportunity.ts:135`. (Точний список уточнити grep'ом на момент старту — Ч14/Ч15 можуть перемістити файли.)
- Шаблони AoE: `grid/template.ts` (`rayCells`, `cone/circle/cube/cross/emanationCells`, `templateCells`) — відсікати клітинки, до яких від джерела немає «чистої лінії» через стіни (використати `cellLine`+`canStep`); промінь зупиняється на стіні; `spell/zone-hazard.ts:164`.
- Видимість/ціль: `modeSees`-потоки (`attack/process/chain.ts:57`, `abilities/engine/core/targets.ts:29`, `spell/spell-targeting.ts`) — core-перевірка LOS по стінах також для звичайної карти.
- Не чіпаємо без потреби: `push.ts`, `placement.ts`, `revive-placement.ts`, `nearest.ts` (стіна не блокує телепорт/розстановку; для відштовхування — вирішити окремо, зафіксувати в spec).
- Тест-симулятор `scripts/sim/battle-sweep.ts` використовує `canStep`/`wallSet` напряму — оновити імпорти.

**B3. Редактор**
- Узагальнити `MazeEdgeEditor`/`useMazeEdgeStroke` у core: `components/battle/map/EdgeEditor.tsx` + `lib/hooks/battle/useEdgeStroke.ts`, параметризовані `(edges: Set, onChange(add, remove), limit)`. **Покращення:** замість ~7000 прозорих `<rect data-maze-edge>` один обробник на SVG: `edgeAtScreenPoint(map, ctm, x, y)` (нова чиста функція в `grid/layout.ts`: дробова частина координати → найближче ребро), перший клік визначає додати/прибрати (як зараз), протяг по ломаній.
- Setup: `SetupTool` (`map-editor.ts:81`) отримує `'edge-wall'`; `paintCells`-аналог `paintEdges(map, edges, op)`; кнопка в `TOOLS` (`BattleFormMap.tsx:40`), стан у `useBattleMapEditor` (`actions.onEdgeStroke`).
- Бій (DM): нова мутація `lib/server/battles/mutations/map-walls/` за правилами battle.md (Zod-схема + `runBattleMutation` + чистий двигун), чанки ≤ 400 ребер за операцію (як `MAZE_LIMITS.wallEdgesPerOp`); кнопка в `MapTerrainToolbar` (`useMapTerrainTool.ts`).
- Рендер: `WallsLayer` у `MapLayers.tsx` (лінії товщиною як `MAZE_WALL_WIDTH`), ховання за `ModeView.showWalls` лишається для maze.

**B4. Дельти:** `ClientBattleDelta.map.walls?: {add: string[], remove: string[]}`; `mapChange` у `pipeline/client-delta.ts` будує diff (як `diffTerrain`), щоб не слати повну карту (ліміт Pusher 9 500 байт). Тести: `client-delta.test.ts`.
**B5. Тести:** `grid/__tests__/{walls,path-walls,line-of-fire-walls,template-walls,attack-reach-walls}.test.ts`; `modes/__tests__/engine-hooks.test.ts` (`modeWalls`); мутація `map-walls-mutation.test.ts`; регресія maze: усі існуючі `maze*` тести мають пройти без змін; `map-scene-walls.test.ts`; `battle-sweep` на prodcopy перед злиттям.
**B6 (входить у v1):** типи ребер: `walls` (блокує рух, погляд, вогонь), `bars` (блокує лише рух; погляд і стрілба проходять), `doors: Record<edgeKey, {open: boolean, locked?: boolean}>` (зачинені = стіна, відчинені = прохід; відкриває/закриває DM, а гравець — лише незамкнені, окрема мутація `map-door-toggle`). Усі правила B2 читають єдиний `edgeBlocks(map, a, b, kind: 'move'|'sight'|'fire')`. Zod-ліміти: `bars` ≤ 7200, `doors` ≤ 500. Дельти: `walls`, `bars` — diff; `doors` — патч за ключем. Інструмент у редакторі: перемикач типу ребра (стіна/ґрати/двері), клік по існуючій двері — відкрити/закрити.
**i18n/onboarding:** `battleSetup.map.tools.edgeWall`, `battle.map.walls.*`; whats-new `…-map-walls`.
**Готово коли:** стіна між двома клітинками в setup і в бою не дає пройти/вдарити в ближньому бою/стрільнути/накрити шаблоном; лабіринти поводяться як раніше.

### Етап C — Камера і великі карти (розмір: M–L)
**Зараз:** `useViewport` (zoom 1–3, зміщення в пікселях контейнера, `clampOffset` не дає виходити за межі), великі карти скролляться нативно (`overflow-auto`), `useScrollToCurrent` робить мінімальний scrollBy, не враховує zoom/offset. На телефоні карта може обертатися на 90°.

Що робимо:
1. **Чиста математика** `lib/utils/battle/camera/`: `fitAllCamera(avail, mapPx)`, `centerOnCell(cell, zoom, avail, mapPx)`, `clampCamera`, `easeCamera(from, to, t)`.
2. **Хук `useMapCamera`** (`lib/hooks/battle/`): стан `{zoom, x, y}` у пікселях екрана; `focusCell(cell, {zoom?, animate})` з анімацією ~350 мс (rAF; `prefers-reduced-motion` → миттєво); `followTurn(currentId)` — при зміні ходу летить до активного токена; ручний pan/zoom ставить `userMoved` і вимикає авто-слідування до наступного ходу; `recenterOnMine()`; межі: min zoom = «вмістити все», max = 3×.
3. **Режим камери** вмикається, коли карта не вміщується при `MIN_TAP_CELL_PX` (зараз це режим нативного скролу): контейнер фіксований за розміром доступної області, шар карти трансформується; нативний скрол у цьому режимі вимкнений, тач — pan/pinch. Обертання на телефоні в цьому режимі вимкнене.
4. **Кнопка «повернутись до себе»** `components/battle/map/RecenterButton.tsx` (generic іконка + підказка, props ≤ 7). Токен «себе» — перший учасник, яким володіє глядач (уточнити існуючу ownership-логіку в `useBattleMapScene`).
5. **Мінімапа** — опційна (етап після D, коли карта велика).
6. **Збереження DOM-контракту для FX** (`components/battle/fx/runtime/anchors.ts`): `data-fx-clip` на clip-контейнері, `data-fx-participant` + `data-fx-anchor="map"` на токенах, `data-fx-cell="x:y"` на клітинках, `data-map-rotated`, `data-map-tokens`, `data-map-background`. Сьогоднішній FX обрізає за `getBoundingClientRect` clip-контейнера — це продовжує працювати.
7. **Заміна `useScrollToCurrent`** на `followTurn`; старий лишається для режиму «карта вміщується».
8. **Тести:** `camera/__tests__/*.test.ts` (чиста математика), `useMapCamera.test.tsx` (happy-dom, за зразком `useViewport.test.ts`: стаб `getBoundingClientRect`, `ResizeObserver` як у `BattleMap.test.tsx`); `useScrollToCurrent` зараз без тестів — покрити перед заміною.
**Готово коли:** на карті 100×100 при зміні ходу камера плавно летить до токена; ручний скрол/зум не борветься з автослідуванням; кнопка повертає на героя; FX потрапляють у токени.

### Етап D — Масштабований рендер сітки (розмір: M–L)
**Проблема:** `GridLayer` малює по `<polygon>` на клітинку з 3 обробниками (3600 на 60×60), плюс шари terrain/hazard/zone/stroke; `marks` — нова `Map` при кожній зміні `view`, що перерендерює всі полігони; трансформація шару з тисячами `non-scaling-stroke` елементів дорога.
Що робимо:
1. Лінії сітки — один `<path>` (або canvas-паттерн) замість полігонів; один обробник pointer на контейнері через `cellAtScreenPoint` (замість per-cell onClick/onPointerEnter/onPointerDown); hover — через окремий легкий шар одного виділеного полігона.
2. `zoneCells` мемоїзувати; terrain/blocked/hazard малювати лише для непорожніх клітинок (вже так) і лише у видимому вікні камери (culling за `useMapCamera`).
3. **FX-контракт:** `anchors.cellPoint` шукає `[data-fx-cell="x:y"]` — після зникнення полігонів перейти на обчислення за геометрією: один елемент `[data-fx-grid]` з `data-cols`/`data-rows`/`data-unit`, точка клітинки = прямокутник елемента + частка. Тест `fx/runtime/__tests__`.
4. Підняти ліміт розміру карти в Zod з 60 до 200 (cols/rows) і `blocked` ліміт → кодувати bitset/RLE замість списку `"x:y"` (3600 → 40 000 записів неприйнятні): `blockedRuns` або тримати `blocked` лише як похідне від тайлів (етап E).
5. **Тести:** `BattleMap.test.tsx`, `MapLayers` snapshot-подібні перевірки кількості елементів; профілювання вручну (`React Profiler`) до/після на 60×60 і 100×100.
**Готово коли:** 100×100 карта панорамується без помітних затримок на середньому телефоні; усі існуючі FX-анімації потрапляють у клітинки.

### Етап E — Редактор тайлів (розмір: XL)
**Модель даних.** Тайли великі — не в `battle_scenes.map` JSON (ліміти 7 МБ і Pusher 9,5 КБ).
- Нова таблиця (Prisma, **міграція: окреме рішення власника**, expand-only, обов'язково `ENABLE ROW LEVEL SECURITY`): `battle_map_chunks (id, map_id → battle_maps ON DELETE CASCADE, layer smallint, cx smallint, cy smallint, data bytea/json (RLE Uint16 ids 16×16), updated_at)` з унікальним `(map_id, layer, cx, cy)`.
- `BattleMapConfig.tiles?: { layers: ('ground'|'objects')[]; tileset: string }` — лише метадані; самі чанки окремо.
- Реєстр наборів: `lib/constants/tilesets/` — `{id, name, license, tiles:[{id, name, variants:[{asset, weight}], autotile: 'none'|'edge16'|'blob47', blocks?: boolean, blocksSight?: boolean}]}`; спрайти в `assets/tiles/`, заливка у хмарний бакет `battle-tiles` скриптом (як іконки). Стартовий набір — CC0 (Kenney) + власні; ліцензію кожного пакета записати в метадані (OpenGameArt: CC-BY-SA заразна — не брати без перевірки; 2-Minute Tabletop — ліцензія не підтверджена).
- Autotile: спершу 4-бітна маска ребер (16 варіантів), потім blob-47. Випадковий варіант — детермінований за seed `hash(cx,cy)`.
- `tile.blocks` породжує похідну множину заблокованих клітинок (замінює ручний `blocked` на тайлових картах); `tile.blocksSight` — для туману B.

**Рендер.** Canvas 2D: на чанк 16×16 свій `OffscreenCanvas`-кеш, перемальовування лише «брудних» чанків, малюються лише чанки у вікні камери; шар під токенами (DOM лишається). `lib/utils/battle/tiles/` — чисті `chunkKey`, `autotileMask`, `variantFor`, `runsEncode/Decode`, `diffChunks`.
**Редактор UI.** Режим «повноекранний редактор» у setup-формі: палітра (набір → тайл), інструменти: пензель (1–3), прямокутник, лінія, заливка, гумка, піпетка, шари, стіни (етап B), undo/redo (історія дельт чанків; зараз в setup-редакторі undo немає — додається тут). Один хук `useTileEditor` + `components/battle/setup/tiles/*`. Подвійний режим карти: «фото-фон» або «тайли» (можна комбінувати: тайли поверх фону).
**Синхронізація.** Setup — зберігається разом із формою (чанки пачкою). У бою тайли не редагуються в v1 (лише відображаються); якщо DM змінює — мутація з патчем змінених чанків ≤ ліміт.
**Тести:** чисті модулі (autotile, RLE, variantFor — детермінізм), `useTileEditor.test.tsx`, серверне збереження/читання чанків, міграція (перевірка RLS у тесті за практикою репо).
**Готово коли:** можна намалювати 100×100 підземелля з текстурами та стінами, зберегти, відкрити в бою; розмір одного чанк-запису в межах ліміту.

### Етап F — Туман режим A «відкриті місця» (розмір: M)
- Модель (у `battle_map_state.fog`, не в карті): `{ mode: 'off'|'reveal'|'vision'; revealed: RevealedRuns; visionRadius }` — множина відкритих клітинок як RLE по рядках (мала, у JSON карти; для 200×200 — до кількох КБ; якщо перевищує — виносити в чанки як у E).
- DM-інструменти: пензель/прямокутник/«відкрити кімнату» (заливка в межах стін/blocked — використовує етап B), «закрити».
- Показ гравцям: Canvas-шар у стилі `WorldFog` (м'який край, плавна поява) під токенами; токени ворогів/об'єктів у закритих клітинках ховаються (UI-ховання, як maze: окремий фільтр `fogView` у core, не mode).
- Дельти: `fog.revealed` як `{add: runs, remove: runs}`.
- Взаємодія з maze: якщо активний режим maze — `fog` ігнорується (maze має власний туман).
- Тести: чисті `revealedRuns`, `floodRoom`, `fogView`; компонент шару; `client-delta`.

### Етап G — Туман режим B «зір гравця» (розмір: L)
- **Алгоритм:** власний симетричний shadowcasting по сітці з ребрами-стінами (`lib/utils/battle/vision/shadowcast.ts`). Готові бібліотеки (rot.js FOV, `mrpas`) оперують непрозорими клітинками й не підтримують стіни-ребра нативно, тому власна реалізація (≈100–150 рядків, чиста, швидко тестується) краща й без нової залежності. Непрозорість: стіни-ребра, `tile.blocksSight`, клітинки `terrain.obscured`, зачинені двері (B6).
- **Джерела зору:** кожен герой гравця (радіус за замовчуванням у клітинках, DM може змінити для карти; darkvision/світло — наступний крок поза v1); видимість = об'єднання зору всіх власних токенів глядача (+ опція «союзники діляться»).
- **Пам'ять дослідженого:** перемикач «пам'ятати». V1 — на клієнті (localStorage за battleId+viewer), бо ховання лише UI; обмеження: не переноситься між пристроями (зафіксувати в spec/доках).
- **DM:** бачить усе; перемикач «подивитись очима гравця X».
- **Продуктивність:** обчислення лише для токенів глядача, кеш за `(позиція, версія стін/тайлів)`; перерахунок при русі, не на кожен рендер; для великих карт обмежувати радіусом.
- **Тести:** `shadowcast.test.ts` (кімнати, кути, діагоналі, стіна-ребро між сусідами, симетрія), `fogView` для режиму B, хук-обгортка.

### Етап H — Імпорт UVTT (розмір: M, опційно після B)
Згідно з `docs/superpowers/research/2026-10-22-map-pack-formats.md`: image/ZIP → UVTT (`.dd2vtt`/`.uvtt`: зображення, PPI → `backgroundCols`, `line_of_sight` ломані → ребра `walls`, портали → двері B6, світло — пізніше). Передумова: B. Ризики: 7 МБ data-URL проти 4,5 МБ тіла Vercel → завантаження через підписаний URL (як `scene-slide-storage.ts`), egress Supabase (стиск 2400 px залишити).

## 4. Наскрізні ризики
1. **Конфлікт із E2** (Ч12/Ч14/Ч15/Ч18): стартувати після Ч18; до того — лише нові чисті файли.
2. **Шов maze/core:** хук `walls` у режимі, а не імпорт режиму (ESLint `eslint.config.mjs:96-101`); не імпортувати з `modes/maze` у core.
3. **Delta/Pusher ≤ 9 500 байт:** кожен новий масив (walls, fog, chunks) — тільки через diff-дельти, інакше `refetch` на кожну правку.
4. **FX-контракт DOM** (`data-fx-*`): порушення мовчки ламає анімації; тести `anchors` обов'язкові в етапах C і D.
5. **Правила battle.md:** `snapshotHash` при будь-якому записі `snapshot`; хід лише через `advanceTurn`; відповіді — дельти; жодних мутацій спільного `rules`.
6. **Egress Supabase:** текстури через `next/image`/кеш, чанки лише змінені, мінімум polling.
7. **Таємність:** UI-ховання, не межа безпеки — це зафіксувати в `docs/architecture/battle.md` (вже є «Hiding is UI only») і в довідці для DM.
8. **Ліцензії текстур:** кожен пакет з явною ліцензією; CC-BY-SA не брати.

## 5. Усунення слабких місць (рішення 2026-11-13, після аудиту 200×200)

### 5.1 Етап 0 — сховище карт (передумова для >60×60; розмір: L)
Аудит (читання коду, без бенчмарків): **повна карта їде в кожному GET сцени** (`loadBattle` → `map: true`, `toBattleResponse`), у першому RSC-payload сторінки бою, у кожному `refetch` (розрив версій, дельта >9,5 КБ, resync, 30-с polling без Pusher); ETag немає; оцінка 200×200 ≈ 1,5 МБ на GET (без фону). Дві мутації терену/стін перетворюють дельту на `refetch` для всіх клієнтів. Крім того, **кожна подія бою пише `terrain` і `modeSnapshotSlice(map)` у рядок `battle_snapshots`** (`save-battle.ts:~236-263`) ≈ 0,5–1,5 МБ на атаку/хід, без чистки під час бою.
Рішення (замість «JSON у `battle_scenes.map`» для великих карт):
- **Бібліотека карт кампанії** (відповідь користувача): окрема сутність `battle_maps` (`id, campaign_id, name, cols, rows, header JSON (opacity, background URL, tileset…), map_version int`) + `battle_map_chunks` (чанки тайлів/стін 16×16). Бій посилається на `map_id`; **старі малі карти лишаються inline** (`battle_scenes.map` без `map_id`) — зворотна сумісність без міграції даних. Prisma-міграція: окреме рішення власника, expand-only, RLS на обох таблицях.
- **Payload сцени:** замість `map` — `{mapId, mapVersion, header}`; карта з `GET /api/campaigns/[id]/maps/[mapId]` зі слабким ETag + `Cache-Control: private, max-age=0, must-revalidate`; на `refetch` порівнюємо `mapVersion` і тягнемо карту лише при зміні; query карти ключується `mapVersion` (`lib/hooks/battle/keys` factory), `structuralSharing: false` для сцени (глибоке порівняння 1,5 МБ на кожен `setQueryData` — марне).
- **Снапшоти:** писати карту в `battle_snapshots` лише коли змінилась (content-addressed: `mapHash`, окрема таблиця `battle_map_versions(hash, json)` або посилання на `map_version`); rollback відновлює за хешем (`rollback-mutation.ts:44`).
- **Компактні стіни/тайли:** ребра core-стін зберігаються не рядками `"x:y:e"` (80 тис. ключів ≈ 700 КБ), а бітовим чанком 16×16: 2 біти типу (нічого/стіна/ґрати/двері) на ребро e і s → 128 байт на чанк, 200×200 = 169 чанків ≈ 22 КБ. У коді зберігаємо API на `edgeKey`, кодування лише на межі збереження/дельти (чанк-патч). Maze лишає власні рядкові стіни (ліміт maze карти 60×60).
- **Ліміти:** одна константа `MAP_LIMITS = { maxSide, maxCells, … }`, яка живить Zod (`schemas/battles.ts:28,68,77,85,153-159,204,215`), `MAX_SIDE` у `grid/map-editor.ts:150` і `background.ts:23`; дублювання 60 в двох місцях прибрати. Фото-карти (з `background`): ліміт лишається 60×60; тайлові — до 200×200 (рішення «фото лише для малих»). Фон-data-URL до 7 МБ у JSON карти більше не зберігати (лише URL сховища).

### 5.2 Алгоритми та клієнт (знайдено аудитом, фіксити в етапі D, крім позначених)
- `moveBudget` для DM-учасника = `cols*rows` → `searchPaths` по всій карті (≈100–300 мс на кожну зміну). Обмежити `min(cols*rows, MAX_WALK)` (MAX_WALK ≈ 40 клітинок) або рахувати `pathTo` лише для клітинки під курсором.
- `outOfRangeMarks` (`map-scene.ts:250-262`) обходить усі клітинки при кожному наведенні заклинання: передавати предикат `{origin, rangeFeet}`, рендерер оцінює лише видимі клітинки.
- `cellsByDistance` (`placement.ts:84`) і `nearestStandable` (`occupancy.ts:117`) сортують усі клітинки на кожного неризміщеного учасника: ліниві кільця Чебишова (генератор).
- `hazardCells` (`terrain.ts:50`) без кешу — WeakMap як `impassableSet`; `playableBounds` (`layout.ts:166`) — скан від країв; `applyTerrainDiff` копіює весь terrain: для ≥20 тис. клітинок — чанковий або інкрементальний Set.
- `GridLayer` — 40 тис. `<polygon>`: рішення етапу D (один path/pattern + делегований pointer + рендер лише клітинок з позначками).
- Maze: генерація 200×200 не підтримується (ліміт 60×60, перевірка глибини рекурсії/спроб).
- Серверні мутації `save-battle` пишуть `map` лише при `patch.map` (OK); терен-штрихи й maze-ops переписують весь JSON → у новому сховищі це чанк-патчі.
- Не охоплено аудитом (перевірити перед стартом): scene templates, content/constructor layers, import/export (`content-snapshot.ts`), проєкція карти в AI-промпти (`lib/ai/tools/projection.ts`). Команда: `grep -rn "BattleMapConfig\|battleMapSchema" lib/server lib/ai`.

### 5.3 Правила стін (відповіді користувача)
- **Крізь стіни:** літаючі стіни НЕ ігнорують; ефірні/привиди/«крізь стіни» мають модифікатор `passesWalls` (Etherealness, привид, Phasing) → `edgeBlocks(kind:'move')` повертає false для таких учасників; `sight`/`fire` не змінюються.
- **Руйнування стіни:** лише DM вручну: мутація `map-edge-remove` пише в `battle_map_state` (карта бібліотеки не змінюється); Wall of Force/Fire лишаються terrain-зонами (`spellZones`), не ребрами (окремий механізм, не змішувати).
- **Досяг 2+ через стіну заборонений:** `attackReachError` вимагає чистого шляху (`canStep` вздовж лінії) для будь-якого досягу.
- **Секретні двері** не входять у v1.
- **Карта maze:** ребра maze і core редагуються кожен своїм інструментом (core-інструмент вимкнений, поки активний maze) — подвійного запису немає; читання — `wallsOf = core ∪ modeWalls`.
- **Камера:** `followTurn` пропускає токени, невидимі для глядача (туман A/B), і лишається в позиції; DM за замовчуванням не слідкує примусово (перемикач «слідкувати за ходом», зберігається в localStorage).

### 5.4 Вигляд стін
Ліній по ребру з квадратними кінцями (кути/T/хрест виходять накладанням, окремих кутових елементів не потрібно); матеріал накладається як fill-патерн (безшовна текстура, маскою по лінії). Тому в промптах стін шести матеріалів (камінь, цегла, дерево, печера, живопліт, лід) змінено з «смуги» на **безшовні квадратні текстури 256×256** (тип `wallfill`); смугами залишаються лише **ґрати, двері, решітка, вікно** (вони мають власний силует).

## 6. Остаточні рішення (опитування 2026-11-13)
| Питання | Рішення | Наслідок для плану |
|---|---|---|
| Стан, що змінюється в бою (відкриті двері, зруйновані стіни, розкритий туман) | **Окремий шар стану бою** `battle_map_state` поверх незмінної карти бібліотеки | Етап 0: нова таблиця (RLS) `battle_map_state(battle_id, doors, removedEdges, fog, …)`; `edgeBlocks` читає карту + стан; один бій не псує карту для інших; дельти стану окремі від карти |
| Редагування карти під час бою | **Бій фіксує `mapVersion` + кнопка «оновити карту» (DM)** | `battles.map_version` пінить версію; бібліотека зберігає історію версій (або content-addressed `battle_map_versions`, див. 7.1) до закриття бою; при оновленні — перевірка, що жодна стіна/тайл, що блокує, не опинилась під токеном |
| Карти як контент (шари, шаблони, переклад) | **Ні, лише карти кампанії у v1** | Етап 0 не додає `ContentKindDef`; офіційні карти й переклад — окремий епік пізніше |
| `passesWalls` | **Модифікатор здібностей/ефектів** (`collectModifiers`) | Нова модифікаторна ознака `passesWalls` у реєстрі модифікаторів; ядро не називає систему; тест у `abilities` |
| Руйнування стін | **Лише DM вручну** | Мутація `map-edge-remove` (у стан бою), без HP стін і без інтеграції з заклинаннями |
| Замкнені двері | **Лише DM** (замикає/відмикає); гравці відчиняють лише незамкнені | Мутація `map-door-toggle` перевіряє `locked` на сервері; перевірок вмінь/ключів немає |
| Режим туману | **На бій** | Лежить у `battle_map_state.fog.mode`; задається при створенні бою (за замовчуванням off) |
| Зір (режим B) | **Фіксований радіус від DM, без світла** | `battle_map_state.fog.visionRadius` (клітинки); темновидіння/світло — поза v1 |

Закриті питання з розділу 6 і 7: хто відчиняє двері, мінімапа, AI-текстури, ліміт фото-карт, правила стін, вигляд стін. **Відкритими лишаються лише дрібні** (не блокують spec): де живе редактор карт (рекомендація — сторінка DM «Карти», бо бібліотека), редагування тайлів на мобільному (рекомендація — лише десктоп), пул тайлсетів DM (ліміти/видимість), feature flag при розгортанні, онбординг-записи.

### 6.1 Решта рішень (опитування 2026-11-13, друга частина)
- **Редактор карт:** окрема сторінка DM «Карти» (`app/campaigns/[id]/dm/maps`): список, створення, клонування, повноекранний редактор; у формі бою DM лише вибирає карту зі списку (+ старий inline-редактор для малих фото-карт лишається). Сторінка підпадає під guard DM-сторінок і правило «server page → `*-client.tsx`».
- **Мобільні:** редагування тайлів і стін лише на десктопі (на телефоні — перегляд бібліотеки, вибір карти, гра: рух, камера, туман). Конфлікт жестів pan/малювання зникає; у режимі редактора на тач-пристрої показуємо повідомлення «відкрийте на комп'ютері».
- **Тайлсети DM:** видимі лише своїй кампанії, сумарний ліміт **50 МБ на кампанію**, окремий бакет/префікс `battle-tiles/{campaignId}/`; невикористані файли чистяться разом із кампанією; валідація кожного файлу як у README промптів (256 px на клітинку footprint, ≤200 КБ, WebP/PNG).
- **Розгортання:** **feature flag на етапи 0, D, E, F, G** (бібліотека карт, новий рендер, тайли, туман) — вмикається для вашої кампанії; етапи A, B, C — без прапора (не ламають існуюче). Прапор — на рівні кампанії (колонка або запис у налаштуваннях кампанії; уточнити в spec етапу 0 за наявним механізмом, якщо він є).
- Лишається лише **онбординг** (whats-new, підказки, довідка за кожним етапом — за стандартним правилом репозиторію), окремого рішення не потребує.

Усі питання плану закриті. Далі: чотири спайки (розділ 7.5) і повторна верифікація `файл:рядок` на старті — після завершення E2.
