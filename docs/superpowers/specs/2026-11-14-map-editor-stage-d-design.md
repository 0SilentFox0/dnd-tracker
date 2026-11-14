# Редактор мап — етап D: рендер сітки для великих карт (design)

**Дата:** 2026-11-14 · **Гілка:** `feat/map-editor-d` (від local main `d634fc3f3`) · **Епік:** [план](../plans/2026-11-13-map-editor.md) «Етап D», [spec епіку](2026-11-13-map-editor-design.md) §3 «Етап D», §6 «Аудит 200×200» · **Spike 2:** [research](../research/2026-11-14-map-grid-render-spike2.md) · **План:** [етап D](../plans/2026-11-14-map-editor-stage-d.md)

## 1. Проблема

Бібліотека карт (етап 0/0b) уже зберігає карти до 200×200 (без фону), але в бій потрапляють лише ≤ 60×60 (`MAP_LIMITS.battleMaxSide`), а UI редактора бібліотеки теж обмежений `MAX_SIDE = 60`. Причина — рендер і клієнтські алгоритми масштабуються за площею карти. Spike 2 (без браузера, happy-dom + node) показав на 200×200:

- `GridLayer` = **40 000 `<polygon>`** (один на клітинку, з трьома обробниками) + полігони terrain/hazard/зон; з видимою зоною руху ДМ — **~109 000 полігонів** (~116 000 елементів), SSR-HTML ~27 МБ; монтування й кожна зміна `view.marks` перерендерює всі полігони (у happy-dom поява зони ДМ — 51 с, наведення — 1,2 с; цифри — у research).
- Наведення під час прицілювання створює нову `Map` з усіма `out-of-range` клітинками (`composeMapView`), тобто повний перерендер на кожну клітинку під курсором.
- Зона руху учасника ДМ: `moveBudget` = `cols*rows` → `searchPaths` по всій карті (~100 мс у node на M-класі, на телефоні в рази більше) і на клієнті, і на сервері (`move-mutation`).
- `placeParticipants` для нерозставлених — ~100 мс на 200×200 (`sideAnchors` будує весь список клітинок на кожного учасника) — **нова знахідка спайку**, в аудиті її не було.
- `outOfRangeMarks` — повний обхід (~25 мс), хоча метрика Чебишова дає прямокутник.
- Дрібниці аудиту (`hazardCells`, `playableBounds`, `cellsByDistance`, `applyTerrainDiff`) за фактом дешеві (≤ 2 мс) завдяки ліміту `maxTerrainCells = 3600`, тому виправляються мінімально або свідомо не чіпаються (див. §4.4).

## 2. Мета і межі

**Входить:** новий `GridLayer` (кількість елементів не залежить від площі карти), делегований pointer, FX-контракт `[data-fx-grid]` з геометричним `cellPoint`, аудиторські виправлення, профілювання «до/після» тим самим скриптом, зняття `battleMaxSide` під прапорцем і підняття ліміту редактора бібліотеки для карт без фону.

**Не входить:** камера/мінімапа/`followTurn` (етап C), тайли й Canvas-чанки (етап E), туман (F/G), RLE для `blocked`/`terrain` (ліміт 3600 лишається, див. відкрите питання 4), режими (maze ≤ 60, його шари не чіпаємо), браузерні заміри (лише в кінцевому живому прогоні епіку).

## 3. Підходи

### A. SVG зі злитими контурами (рекомендовано)
Сітка — один `<path>` ліній (2·N+2 підшляхи, `non-scaling-stroke` як зараз). Усе, що зараз «клітинка = полігон», зливається в кілька `<path>` за стилем: рядкові відрізки (row runs) для заливок (terrain за типом, зона руху, небезпечна зона, hazard) і граничні ребра для контурів зон. Поза дальністю — один `<path fill-rule="evenodd">` «карта мінус прямокутник дальності». Поштучно лишаються тільки обмежені за кількістю позначки (`target`/`pick`/`picked`/`invalid-target` — за учасниками; шаблон — за площею заклинання; штрих). Один прозорий хіт-`<rect>`, обробники на ньому, клітинка — через `cellAtScreenPoint(svg.getScreenCTM())` (уже є для штрихів). Гліфи полум'я — `<use>` одного символу й лише у видимому вікні.
- **+** елементів O(стилі + розріджені позначки), незалежно від N; векторна чіткість при зумі; нуль нових залежностей; DOM-тести лишаються DOM-тестами; повертає/обертає/масштабує так само, як зараз (той самий `<svg>` у тому самому шарі).
- **−** довгі `d`-рядки (на 200×200 із розкиданим terrain — десятки КБ); маска ліній сітки під зонами — растеризація маски в браузері (ризик, перевіряється в живому прогоні; запасний варіант — лінії й під зоною).

### B. Canvas 2D для сітки, terrain і зон (чанки 16×16)
Як майбутній тайловий рендер етапу E: `OffscreenCanvas`-кеш на чанк, перемальовування брудних чанків, SVG лишається тільки для інтерактивних накладок.
- **+** найкраще масштабування; спільна інфраструктура з E.
- **−** найбільший обсяг: перемальовування на зум/DPR, обертання телефона, штрихування патернами вручну, FX і всі DOM-тести (`data-terrain`, `data-hazard-*`, титули) переписуються на canvas-моки; ризик пам'яті iOS без браузерних замірів (оригінальний Spike 2 з телефоном недоступний). Передчасно до E.

### C. Віртуалізація поточних полігонів
Лишити клітинку = полігон, але рендерити лише клітинки видимого вікна + memo.
- **+** найменша зміна.
- **−** O(видимих клітинок) ≈ (екран/30 px)² — тисячі елементів, перерендер при кожному перетині межі вікна; без камери (етап C) вікно — увесь прокручуваний шар; per-cell обробники лишаються, якщо не робити делегування (а з ним це вже половина A).

**Рекомендація: A.** Canvas відкладається до E (там він потрібен для текстур); культинг лишається лише для поштучних гліфів (полум'я), бо все інше вже не залежить від площі.

## 4. Рішення (підхід A)

### 4.1 Чисті модулі геометрії (нове)
`lib/utils/battle/grid/region-path.ts` (повторно використовує `parseCellKey`, `UNIT`):
- `rowRuns(keys: Iterable<string>): Map<number, Array<[x0: number, x1: number]>>` — відсортовані відрізки рядків.
- `regionFillPath(keys): string` — `M x y h w v U h -w z` на кожен відрізок (UNIT-координати, цілі числа).
- `regionOutlinePath(keys): string` — граничні ребра (сусід не в множині), склеєні в колінеарні відрізки по рядках/стовпцях.
- `gridLinesPath(cols, rows): string` — 2·N+2 ліній.
- `windowPath(map, win: GridWindow): string` — «карта мінус прямокутник» для evenodd (поза дальністю).

`lib/utils/battle/grid/layout.ts` (поруч із `cellAtScreenPoint`):
- `cellScreenPoint(ctm: ScreenMatrix, p: GridPoint): {x, y}` — обернене до `cellAtScreenPoint` (центр клітинки в екранних координатах; враховує зум, панораму й поворот, бо CTM їх уже містить).
- `visibleGridWindow(input: { viewport: DOMRectLike; ctm: ScreenMatrix; cols; rows }, margin = MAP_LIMITS.chunk): GridWindow` — вікно клітинок під видимим прямокутником, округлене до чанка 16 (змінюється лише при перетині межі чанка). Етап C підставить сюди камеру.

### 4.2 `GridLayer` (переписаний, `components/battle/map/MapLayers.tsx` → розбити на `grid/`-підкомпоненти в тій самій папці)
- **Статичний шар** (memo за `map.cols/rows/blocked/terrain/opacity`): лінії сітки `<path data-grid-lines>` під маскою «без blocked/wall/barrier і без зон руху»; terrain — по одному `<path data-terrain="<kind>">` на тип (+ штрихування `barrier`/`difficult`, `obscured`); hazard — `<path data-hazard-layer>` з анімацією жару (клас `battle-map-ember` на одному елементі) + `<use href="#hazard-flame">` лише для hazard-клітинок у видимому вікні (`data-hazard-flame="x:y"` зберігаємо); таймові — окремий `<path data-hazard-timed>`; blocked з `showBlocked` — `<path data-blocked>`.
- **Шар позначок** (memo за ідентичністю `marks`): зони `move`/`move-danger` — fill/glow/stroke шляхи з `data-fx-zone="move|danger"` (атрибут зберігається); розріджені позначки (`target`, `pick`, `picked`, `invalid-target`) — поштучні `<polygon data-mark-cell="x:y" data-mark="…">`; поза дальністю — `<path data-out-of-range>` з `view.range`.
- **Хіт-шар:** один `<rect data-grid-hit>` на всю карту; `onClick`, `onPointerMove`, `onPointerDown`, `onPointerLeave` → `cellAtScreenPoint(svgRef.current.getScreenCTM())`. `onCellHover` викликається лише при зміні клітинки (без rAF — математика дешева). Blocked: клік лише з `clickableBlocked`, наведення дає `null`. Штрих: `pointerdown` → `onStrokeStart(cell, e)` для будь-якої клітинки в межах (як зараз). `wasDragged()` перевіряється як зараз.
- **Шар наведення:** локальний стан клітинки під курсором → один прозорий `<polygon data-grid-hover>` із `<title>` terrain-підказки (`terrainTitle`, як зараз на полігоні клітинки) і курсором (`crosshair`/`pointer`/звичайний для заблокованої). Нового візуального підсвічування не додаємо.
- `TemplateLayer`, `StrokeLayer` — без змін (обмежені площею шаблону/штриха).
- Пропси: `GridLayer` отримує `svgRef` і `window` (видиме вікно; у `MapStage` приходить через `layout.window`) через наявні групи (`cellActions`, `scene`), ≤ 7 пропсів (`components.md`).

### 4.3 FX-контракт
- `<svg>` у `MapStage` отримує `data-fx-grid=""`, `data-cols`, `data-rows`. `data-fx-cell` зникає (полігонів клітинок більше немає); інші `data-fx-*` (`participant`, `anchor`, `clip`, `zone`) — без змін.
- `anchors.ts` `cellPoint(at, root)`: перебирає `[data-fx-grid]` (карта може бути змонтована двічі — телефон/десктоп), бере CTM, рахує `cellScreenPoint`, повертає першу точку, що видима (перевірка точки проти вікна, `[data-fx-clip]` і прокручуваного предка — винести з `visible(el)` у `visiblePoint(point, el)`). Клітинка поза `data-cols/rows` → `undefined`.
- Тести `components/fx/__tests__/anchors.test.ts`: точка без повороту, з поворотом 90° (CTM `b=1, c=-1`), із зумом/панорамою, поза кліпом → `undefined`, дві копії карти — береться видима, `cellScreenPoint ∘ cellAtScreenPoint` — тотожність (у `layout.test.ts`).

### 4.4 Аудиторські виправлення
| Пункт | Рішення | Обґрунтування (Spike 2, 200×200) |
|---|---|---|
| `moveBudget` | Для ДМ `min(cols*rows, MAP_LIMITS.dmMoveCap)`, `dmMoveCap = 60` (клітинок вартості). Далі — режим «Розстановка» ДМ (вже є, ставить куди завгодно). Сервер (`move-mutation`) успадковує. | `searchPaths` ДМ ~100 мс → очікувано ~кілька мс; на ≤ 60×60 різниця лише для звивистих/складних шляхів > 60 (відкрите питання 1). |
| `outOfRangeMarks` | Прибрати позначку `out-of-range` з `marks`; `MapScene.view.range: GridWindow \| null` — прямокутник дальності (метрика Чебишова: `footprintDistance ≤ R` ⇔ рамка footprint + R), обрізаний картою. `composeMapView` більше не копіює ці позначки на наведенні. Рендер — `windowPath`. | 25 мс на зміну прицілу + повний перерендер на кожне наведення → O(1). |
| `cellsByDistance` / `nearestStandable` | Генератор `cellsByRing(map, from)` (кільця Чебишова, всередині кільця — рядками, як нинішній стабільний sort); `cellsByDistance` лишається обгорткою `[...cellsByRing]` для сумісності (maze/move-self), `nearestStandable`, `placeParticipants` (near), `maze/revive`, `maze/tunnel` — переходять на генератор із раннім виходом. | ~2 мс на виклик, але множиться на кількість нерозставлених; ранній вихід дає O(r²). |
| `placeParticipants` / `sideAnchors` (нове) | `sideAnchors` рахувати один раз на сторону за виклик (кеш у межах `placeParticipants`) і лінивим генератором. | ~100 мс на 16 нерозставлених. |
| `hazardCells` | `WeakMap` за ідентичністю `terrain`, як `impassableSet`; повертати `ReadonlySet`. | Дешево (≤ 0,1 мс), але викликається в кожному `moveZoneMarks`; виправлення тривіальне. |
| `playableBounds` | Скан від країв (рядки зверху/знизу, стовпці зліва/справа до першої ігрової клітинки) + `WeakMap` за `blocked`. Порожній `blocked` → O(1). | 2 мс на кожну зміну `map` на телефоні. |
| terrain (`applyTerrainDiff`) | **Не чіпаємо** в D: копія ≤ 3600 записів = 0,27 мс. Чанковий terrain — у етапі E разом із тайлами, якщо ліміт клітинок зросте. | Виміряно; ліміт `maxTerrainCells` не змінюється. |
| `zoneCells` | Зникає як окремий обхід: контури/заливки зон рахуються в `useMemo` за ідентичністю `marks` (`regionFillPath`/`regionOutlinePath`). | 6,7 мс на кожен рендер → лише при зміні `marks`. |

### 4.5 Ліміти й прапорець
**Наявний механізм (етап 0b):** колонка `campaigns.mapLibraryEnabled` (міграція `20261203000000_map_library_flag`, ще не на prod), перемикач у налаштуваннях кампанії, сервер `requireMapLibrary` (сторінки `dm/maps`), клієнт `useMapLibraryEnabled(campaignId)` (`lib/hooks/campaigns`), пункт навігації через `requiresMapLibrary` у `lib/constants/campaigns.ts`. API `/maps` свідомо без прапорця.

**Рекомендація — перевикористати `mapLibraryEnabled`** (без міграції): карта > 60 існує лише в бібліотеці (inline-карти обмежені Zod `photoMaxSide`, фото-карти — 60), тож «великі карти в бою» = «бібліотека увімкнена». Альтернативи: окрема колонка `largeMapsEnabled` (ще одна expand-міграція й перемикач, окремий rollout рендера) або загальна `featureFlags Json` (відкрите питання 2).

- `MAP_LIMITS` лишає `battleMaxSide: 60` як «без прапорця» і отримує чисту функцію `battleMapMaxSide(flags: { mapLibraryEnabled?: boolean }): number` (`lib/utils/battle/map-storage/limits.ts`): `tileMaxSide` з прапорцем, інакше `battleMaxSide`. Фото-карти й далі ≤ 60 (Zod бібліотеки).
- Сервер: `record-service.linkedMapFor` (створення/перепривʼязка) і `map-update` беруть прапорець кампанії (`lib/server/battle-maps/campaign-limits.ts`: `campaignMapMaxSide(campaignId, db)`, один `select`) замість константи. Уже створений великий бій при вимкненні прапорця **продовжує працювати** (перевірка лише на створенні/оновленні карти).
- Клієнт: `BattleMapLibraryPicker` — `battleMapMaxSide({ mapLibraryEnabled })`; `CreateMapDialog`/`MapEditorScreen` — `max` = `tileMaxSide` для карти без фону, `photoMaxSide` з фоном (сторінки вже під прапорцем); `useBattleMapEditor` отримує опцію `maxSide` (за замовчуванням `MAX_SIDE` = 60 для форми бою).
- **Новий `GridLayer` — без прапорця** (для всіх карт): дві реалізації рендера подвоїли б тести й FX-контракт; паритет забезпечують DOM-тести й живий прогін (відкрите питання 3).

### 4.6 Шари й правила
Чисті функції — `lib/utils/battle/grid/*` (тести в `__tests__`), хук видимого вікна — `lib/hooks/battle/useGridWindow.ts` (barrel), компоненти лише викликають хук і рендерять. Ядро не імпортує режим (maze-шари отримують ті самі пропси, що й досі). `MAP_LIMITS` — єдине джерело лімітів.

## 5. Reuse (CLAUDE.md «Working on a feature»)
Перевірено `lib/utils`, `lib/hooks`, `components/common`, `components/ui`, `components/hud`, `lib/utils/api`:
- **Перевикористовуємо:** `cellAtScreenPoint`/`screenToUnit`/`ScreenMatrix` (`grid/layout.ts`; делегований pointer і FX), `useStrokePaint` (`svgRef` уже на `<svg>`), `blockedSet`/`impassableSet`/`difficultSet` (WeakMap-патерн для `hazardCells`/`playableBounds`), `GridWindow` + `fitMapView` (`layout.ts`), `useViewport` (зум/панорама для вікна), `MAP_LIMITS.chunk` (квантування вікна, як чанки ребер `edge-chunks.ts`), `aimInRange`/`feetToCells`/`footprintDistance` (прямокутник дальності), `isDamagingCell`, `terrainTitle`, `useMapLibraryEnabled` + `requireMapLibrary` + колонка `mapLibraryEnabled` (прапорець), наявні `<pattern>` штрихування й `radialGradient` hazard.
- **Не підходить / нове потрібне:** злиття множини клітинок у шлях (`region-path.ts`) — аналогів немає (`WallsLayer` малює ребра, не області; `lib/utils/world/tree.ts mapPath` — інше); `cellScreenPoint` — немає оберненої до `cellAtScreenPoint`; `visibleGridWindow`/`useGridWindow` — `useElementSize`/`useViewport` не дають вікна в клітинках; `cellsByRing` — генератора кілець немає; `battleMapMaxSide` — ліміт тепер залежить від прапорця. `components/common|ui|hud` не мають SVG-шарів карти — UI-примітиви не потрібні. `lib/utils/api` — без змін (немає нових маршрутів).

## 6. Ризики
1. **Візуальний паритет** (злиті шляхи, маска ліній під зонами, товщина `non-scaling-stroke` на межах): перевірка в живому прогоні на 60×60/100×100/200×200, desktop + 375. Запасний варіант для маски — лінії під зонами без маски.
2. **Довгі `d`-рядки** у SSR/HTML (оцінка в «після»-профілі; межа — десятки КБ на 200×200).
3. **Телефон на 200×200 без камери (етап C):** шар `fitMapView` з `MIN_TAP_CELL_PX = 30` → ~6000×6000 px; ризик пам'яті WebKit не перевірити без браузера. Прапорець «бета», телефони великих карт — після C (відкрите питання 5).
4. **`dmMoveCap`** змінює поведінку ДМ на звивистих шляхах > 60.
5. **Тести, що клікають `polygon[data-fx-cell]`** (~40 місць у `BattleMap`, `BattleFormMap`, maze-тестах): міграція на тест-хелпер `clickCell(container, p)` (стаб `getScreenCTM` = одинична матриця, `clientX = (x + .5)·UNIT`).
6. **Наведення на заблоковану клітинку** тепер дає `onCellHover(null)` (раніше лишалась попередня) — перевірити прев'ю шаблону/траєкторії.

## 7. Тестування
- **Чисті:** `region-path.test.ts` (порожня множина, одна клітинка, діра, дві несуміжні області, колінеарне склеювання, детермінізм), `layout.test.ts` (`cellScreenPoint` круговий тест з `cellAtScreenPoint` при повороті/зумі; `visibleGridWindow` квантування й обрізання межами), `geometry.test.ts` (`cellsByRing` = `cellsByDistance` за порядком на 7×5 з кутовою/центровою точкою; ранній вихід), `path.test.ts` (`moveBudget` ДМ = `min(cols*rows, dmMoveCap)`), `map-scene.test.ts` (`view.range` замість `out-of-range`; `composeMapView` зберігає ідентичність `range`), `terrain.test.ts` (`hazardCells` повертає той самий Set для того самого `terrain`), `layout.test.ts` (`playableBounds` = старий результат на випадкових масках), `placement.test.ts` (порядок розстановки не змінився — золотий тест на 3 сценаріях), `limits.test.ts` (`battleMapMaxSide`).
- **Компоненти (happy-dom):** `BattleMap.test.tsx` — кількість елементів сітки не залежить від N (8×8 vs 60×60: та сама кількість `path`), клік/наведення/штрих через `clickCell`, title на `data-grid-hover`, `data-fx-zone`, `data-terrain`, `data-hazard-flame` лише у вікні; `anchors.test.ts` (§4.3); `BattleFormMap`/maze-тести — мігрують на хелпер.
- **Сервер:** `record-service`/`map-update` — карта 100×100 з прапорцем приймається, без прапорця `BATTLE_MAP_TOO_LARGE`; `move-mutation` — ДМ далі за `dmMoveCap` відхиляється.
- **Профілювання «після»:** той самий `scripts/spikes/map-grid-render` (команди в research-документі), таблиця до/після там само.
- **Гейти:** `pnpm test:related`/`test:changed` і `eslint --fix` по файлах; повний `test:run`, `tsc`, repo-wide lint, battle-sweep — один раз наприкінці гілки; живий прогін (Chrome, з основного сеансу) — разом із кінцевим прогоном епіку.

## 8. Відкриті питання до користувача
1. `dmMoveCap = 60` клітинок вартості для учасників ДМ (далі — «Розстановка»)? Альтернатива — без ліміту, але зона ДМ не показується, а шлях рахується лише до клітинки під курсором (A*).
2. Прапорець: перевикористати `mapLibraryEnabled` (рекомендація) чи окрема колонка `largeMapsEnabled` / загальна `featureFlags`?
3. Новий `GridLayer` для всіх карт одразу (рекомендація) чи за прапорцем (дві реалізації до кінця епіку)?
4. Ліміти `blocked`/`terrain` = 3600 клітинок і на 200×200 (печера з нерегулярною формою може впертися в `blocked`). Лишити до етапу E (RLE/тайли) чи підняти зараз (тоді чанковий terrain стає потрібним)?
5. Знімати `battleMaxSide` під прапорцем уже в D (бета, телефони до етапу C можуть гальмувати) чи лише після C?
