# Game UI Ч7: тип сітки, дальність, туман — спека

Гілка `feat/game-ui-ch7` (від `feat/game-ui-ch6` 9db929d62; Ч6 ще не в main). Нумерація епіку: Ч7 = старі Ч3 «Дальність» + Ч4 «Туман». Чернетка 7a: `plans/2026-11-21-game-style-ui-ch7-reach-grid.md`.

Примітка щодо рішень: епік каже «гекси не використовуємо» для **мови форм UI** (лишається заокруглений квадрат). Гекс тут це лише необовʼязкова геометрія ігрової карти (уточнення власника 2026-11-21 і цього промпту). UI-форми не міняються.

## Ч7a. Сітка і дальність

### Рішення

1. **Поле** `gridType?: 'square' | 'hex'` у `BattleMapConfig` (`types/battle-grid.ts:83`) і `battleMapObject` (`lib/schemas/battles.ts:191`). Потік у header бібліотеки, `battle_scenes.map`, clone, content copy іде наскрізь (JSON, без міграції). Відсутнє = square, серіалізація старих карт не змінюється. Zod без `.strict()` мовчки відкидає невідомі ключі, тому поле МУСИТЬ бути в схемі, інакше зникне.
2. **Координати гекса: offset «odd-q»** (flat-top, непарні колонки зсунуті вниз на пів клітинки). `GridPoint {x,y}`, `cellKey`, `cols×rows`, `inBounds`, fog-runs, збережені позиції лишаються без змін; карта залишається прямокутником (axial дав би ромб і зламав bounds). Для відстані/сусідів offset↔cube у pure-хелперах.
3. **Геометрія через `GridKind`.** `lib/utils/battle/grid/hex.ts` (pure): `hexNeighbors`, `hexDistance`, `hexLine`, `hexCenter`, `hexPolygon`, `hexPointToCell`, `hexMapSize`. `geometry.ts` отримує необовʼязковий останній параметр `grid: GridKind = 'square'` у `neighbors`, `cellDistance`, `footprintDistance`, `cellLine`, `cellsByRing`; `gridOf(map)` повертає `map.gridType ?? 'square'`. Дефолтна square-гілка не чіпає наявний код (тести square без змін = доказ byte-for-byte).
4. **Бойові виклики** (`footprintDistance` ~35 викликів у ~25 файлах, `neighbors`, `cellDistance`, `cellLine`) передають `gridOf(map)` там, де карта вже є в області; де карти нема, лишається square (див. ризики). Спершу ходіння і атаки/дальність/реакції, шаблони (cone/line) на hex через `hexLine`/ring.
5. **Hex v1: обмеження** (явно, у UI вимкнено або прихований, а не мовчки зламаний): режим maze лише square; шари тайлів і редактор стін/дверей (edge-chunks 2 біти на ребро, axis-aligned) недоступні для hex-карт; токени розміру >1 на hex = 1 клітинка footprint з центром (див. питання власнику). Фонова картинка, погода, motion, туман працюють.
6. **Створення:** `CreateMapDialog` отримує вибір геометрії (segmented control, square за замовчуванням), `useMapEditorDraft` і форма налаштування бою так само; UVTT/catalog імпорт = square.
7. **Рендер.** `GridLayer/GridStatic/GridMarks/GridHit` беруть геометрію з `gridType`; `cellPolygon/cellCenter/tokenBox/cellAtScreenPoint/fitMapBox/gridLinesPath/regionFillPath/regionOutlinePath/windowPath` стають grid-aware (square без змін). `GridMarks` для hex малює один `<polygon>` на клітинку (merged row-run шлях лише для square).
8. **Дальність, новий вигляд.** `GridMarks`: рух = холодна низькоальфа заливка (`--reach-fill`) + тонкий контур; загроза/атака = легкий тон + пунктирний контур (`stroke-dasharray`); out-of-range приглушено evenodd як зараз; зелений/червоний агресивний вигляд прибрано. Інформація не лише кольором: контур/пунктир/значок вартості. Токени `--reach-*` в `battle-map.css` для темних і світлих (parchment/frost) палітр, контраст UI ≥ 3:1.
9. **Шлях руху.** `deriveMapScene` зараз викидає `PathSearch` (лишає `steps`). Додаємо в `view` поле `search` (існуючий результат `searchPaths`, без нової математики), компонент `MapPathPreview` у `grid/` малює `pathFrom(search, mover, hover)` лінією й підписом вартості біля курсору (одиниці з канонічного `cost`; метри = cost × `moveUnit`, якщо така константа вже є, інакше показуємо клітинки/ft як вихідний state). Hover уже є в BattleMap (trajectory); на touch показ шляху після вибору клітинки/long-press без зміни логіки ходу.
10. **Анімація.** Fade заливки (opacity transition 160 ms) через клас + `@media (prefers-reduced-motion: reduce)` = без transition; видимість лише для активного/вибраного учасника без розширення.

### Reuse (перевірено)
`CreateMapDialog`, `useMapLibrary`, `battleMapObject/headerSchema`, `mergeLibraryHeader` (generic, без змін), `cloneMap`/content copy (проходять через схему), `searchPaths/pathFrom/pathTo`, `moveRoutes`, `deriveMapScene`, `GridMarks/GridHit/GridLayer`, `region-path.ts`, `useReducedMotion`, токени палітр, `HudToggleChip`/існуючий segmented control з `components/hud` для вибору геометрії. Нового: `hex.ts`, `gridOf`, `MapPathPreview`, `--reach-*` токени.

### Матриця «що є → як міняється»
| Є | Зміна |
|---|---|
| `geometry.ts` square | + grid param, дефолт square |
| `layout.ts` cellCenter/Polygon/AtScreenPoint | grid-aware |
| `path.ts` Dijkstra по `neighbors` | neighbors(grid); вартість діагоналі лише square |
| `GridMarks` зелена/червона заливка | холодна заливка + контури |
| `map-scene` викидає PathSearch | експонує `search` |
| `CreateMapDialog` | + вибір геометрії |
| Walls/Doors/Tiles/Maze | не змінюються; hex їх вимикає |

### Ризики
- Обсяг combat call sites: ~25 файлів `footprintDistance`. Мітигація: параметр за замовчуванням, поетапно, grep-ratchet тест «жоден виклик у hex-гілці без grid».
- Сервер і клієнт мають рахувати однаково: усе через pure `lib/utils/battle`, `gridOf(map)` на обох боках.
- Перерендери: `GridMarks` memo; hex polygons мемоїзуємо по marks.
- Egress: нуль (поле в існуючому header).
- Rule system: жодних умов за id; hex залежить лише від `gridType`.
- Правила 5e на hex: «діагональ» (5-10-5) не застосовується, відстань = hex-кроки × 5 ft; задокументувати в battle.md.
- Compat: старі карти/імпорт/клон = square; старий клієнт бачить hex-карту як square (поле ігнорується), прийнятно до деплою.

### Тести
`hex.test.ts` (round-trip center↔cell, 6 сусідів, відстань vs cube еталон, bounds/size), `geometry` square-регресії без змін, schema (поле є/нема, strip), clone/copy зберігає, `GridMarks`/`GridHit` hex і square, `MapPathPreview`, reduced-motion клас, i18n ключі uk/en.

## Ч7b. Туман (лише візуал, видимість не чіпаємо)

### Стан (розвідка)
- **Світ**: `WorldFog` (561 рядок) уже має хмари (WebGL2 fbm → процедурна текстура → плоска заливка), feather-маску, дрейф 30 fps, reveal-fade 400 ms, `still` через `useReducedMotion`, паузу поза екраном. Тобто візуал світу в основі готовий.
- **Бій**: `MapFogLayer` = один `<canvas>`, жорсткі `fillRect` по клітинках (alpha .88 / .48), без анімації. Монтується в `MapStage.tsx:194`.
- **Лабіринт**: `MazeFogOfWar` = SVG-маска з однією `<rect>` на видиму клітинку, всередині `<svg>`.
- Спільне: `lib/utils/canvas/ticker.ts` (shared rAF з fps), `fitCanvas`, `usePageHidden`, `useReducedMotion`, погода як патерн дрейфуючого оверлея (dpr cap 1.5, `phone` scale .5). Low-power хука немає. Текстур хмар у `public/` немає (процедурні, нуль egress).

### Рішення
1. **Спільний `FogSurface`** (`components/battle/map/fog/FogSurface.tsx`, візуал без логіки видимості): вхід `FogMask` = `{kind:'cells', cols, rows, cellPx, visible, explored?}`; растеризація маски в малий offscreen canvas (1–4 px/клітинку) → blur (feather) → композиція хмарної текстури через `destination-out`. Хмари = процедурна текстура, що вже є у світі (`world-cloud-texture.ts`), винесена в спільний модуль (extract, не дублювати); WebGL2-контекст ділимо один на сторінку, інакше (або при `still`) статична текстура. Окремий CC0 PNG/WebP не потрібен для старту, арт підставляється пізніше без зміни коду.
2. **`useFogQuality()`** (`lib/hooks/common`): `'live' | 'still' | 'flat'` з `useReducedMotion`, `phone`, `usePageHidden`, `navigator.hardwareConcurrency/deviceMemory/saveData`. live = дрейф 30 fps через ticker; still = статична хмара; flat = плоска заливка `--fog-flat`.
3. **Reveal-анімація:** ref з попереднім набором `visible`; нові клітинки плавно розчиняються 400 ms (як світ); reduced-motion = миттєво. Кеш маски за вмістом (ключ з `revealed-runs`/хеш), бо `visible`/`explored` мають нову identity при будь-якій зміні учасників. Pan/zoom лише CSS transform, маска не перебудовується.
4. **Бій:** `MapFogLayer` зберігає props і місце монтування, лише внутрішність → `FogSurface`; explored-but-not-visible = легша щільність (раніше .48). DM-editing гілки незмінні.
5. **Лабіринт:** замінити SVG-маску canvas-сиблінгом у CSS-transform просторі карти (як `MapFogLayer`), props `map`, `view` і `data-maze-fow-layer` лишаються; тестовий seam `data-maze-visible` зберігаємо через data-атрибут на контейнері з лічильником або тест переписуємо на маску.
6. **Світ:** `WorldFog` переходить на спільні модулі (ticker замість приватного rAF, `useFogQuality`, спільна текстура); поведінка і props лишаються, shapes-маска теж дає `kind:'shapes'`.
7. **Світлі палітри:** туман на parchment/frost світліший за темний, `--fog-*` токени; контраст токенів/мапи не падає нижче читабельного (тільки заливка, текст не під туманом).
8. **Сервер/приватність:** `fogFilterDelta`, `maskMazeScene`, `fogView` не чіпаємо; візуал читає вже відфільтроване.

### Reuse
`ticker`, `fitCanvas`, `usePageHidden`, `useReducedMotion`, `world-cloud-texture.ts`, `WorldFog` feather/mask-код, `weather/*` як патерн, `normalizeRevealedRuns`, `useBattleMapFog`, `fogView`.

### Ризики
Phone FPS (мітигація: маска 1–4 px/клітинку, canvas scale .5–.72, dpr ≤1.5, пауза поза екраном; перевірка FPS на phone через JS `performance`), ліміт WebGL-контекстів (один спільний), перерендери (кеш за вмістом), тести `MapFogLayer`/`MazeLayers` (переписати на семантику маски), egress без росту, залежність від арту: немає (заглушка).

### Тести
Маска-растеризація (pure, cells→mask), `useFogQuality` матриця, `FogSurface` still/live/flat, reveal diff (нові клітинки), `MapFogLayer`, `MazeFogOfWar`, `WorldFog` без регресій, DM vs player.

## Живий прогін
`next start` (порт 3100, копія БД не prodcopy), square (регресія) і hex, desktop 1440/1920/2560/3840 + phone, темна і parchment/frost, DM і гравець, туман бою/світу/лабіринту, консоль чиста, FPS туману на phone.

## Що не чіпаємо
Правила, руховий бюджет, `runBattleMutation`/`snapshotHash`/`advanceTurn`, дельти, видимість і серверні маски, Walls/Doors/Tiles на square, умови за rule system, арт.
