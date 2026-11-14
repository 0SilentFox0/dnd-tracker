# Map modes

`lib/utils/battle/modes`: one mode per battle, `activeMapMode(map)` from `MAP_MODE_REGISTRY` (server/engine/client hooks, `NORMAL_MODE` neutral) + `MAP_MODE_UI` (`components/battle/modes`, UI slots) + mode hooks in `lib/hooks/battle/modes/<key>`. Core never imports a mode directly (ESLint). Rule systems follow the same pattern but with a stricter zone, roots and a generator — see [rule-systems.md](rule-systems.md#як-додати-базу).

**New mode** = a folder in the three places + a row in both registries (+ `satisfies Record<MapModeKey, …>` objects in `lib/hooks/battle/modes/tools.ts`).

Engine hooks include `lineBlocked({ config, map, line })` — a mode wall on a ranged line of fire (see [battle.md](battle.md)); optional, default `false`.

`areHostile({ config, map, a, b })` — режим може оголосити двох учасників ворожими всупереч `side` (`true`; `undefined` = за сторонами). Ядро викликає лише через `isHostile(map, a, b)` з `modes/engine.ts`, режим не імпортує.

## Maze

The first mode: pure geometry/vision/generator, server wake-up in `afterMutation`, hiding client-side in `modes/maze/view.ts`; the server sends the full scene.

**Підміна (illusion swap):** `MazeConfig.illusionSwap.pairs` — пари героїв, які бачать один одного ворогами під масками (`aSees`/`bSees`). Операція ДМ `op:"illusion"` замінює весь список (порожній = «Повернути союзників»); `areHostile` повертає `true` для пари; `pruneIllusion` в `afterSettle` (після перемоги) знімає пару, коли хтось помер/покинув мапу або бій не ACTIVE (DM-подія); `onReset` очищає. Маска — клієнтська: `view.disguiseOf` + `maskMazeScene`/`maskMazeFxAction`/`maskBattleBy` (`illusion-mask.ts`); ДМ бачить справжні особи й позначку маски (`view.maskedIds`, `ParticipantRow`). Деталі межі — [battle.md](battle.md#підміна-в-лабіринті-ishostile).

## Spell terrain (P4)

Difficult terrain, `obscured` cells, spell walls and `spellZones` are core: they live in `map.terrain` / `map.spellZones` and are read by `grid/*` and `spell/zone-*`. Map modes neither import nor change them; the maze never fires zone triggers.

## Стіни й ґрати (core, етап B)

`map.walls` / `map.bars` — ребра `"x:y:e"` / `"x:y:s"` (ліміт 7200 разом із `maze.walls`); ядро, не режим. Примітиви ребер — `grid/walls.ts` (`edgeKey`, `canStep`, `cornerOpen`; `modes/maze/walls.ts` лишився обгорткою над `maze.walls`). Читання лише через `grid/edges.ts`:

- `wallsOf(map)` = `map.walls ∪ modeWalls(map)`; хук режиму `walls?` у `ModeEngineHooks` (диспетчер у `modes/engine.ts`) віддає стіни режиму (maze віддає `maze.walls`), тож рух/постріл/зір по лабіринту ідуть тим самим шляхом. `barsOf(map)` — ґрати.
- `edgeBlocks(map, a, b, kind, mover?)`, `kind`: `move` (стіни + ґрати), `sight` і `fire` (лише стіни). Діагональ блокується, якщо закритий хоч один кутовий шлях. `cellsConnected` — пряма лінія між наборами клітинок.
- Споживачі: `searchPaths` (рух; ранній вихід без ребер), `lineOfFire` і `rayCells`/`templateCells` (`fire`), `grid/sight.ts` (`sightedTargets`, ланцюгові цілі, вибір цілей заклинань/здібностей), `grid/adjacency.ts` (`isAdjacentOnMap`/`cellsAdjacentOnMap` — ближній бій, cleave, fire-burst, move-self, оборонні реакції, opportunity-атаки; `sight`-блок скасовує сусідство). Геометричні `footprintDistance` (аури, ауди, розстановка) не чіпали.
- Модифікатор `passesWalls` (flag): `edgeBlocks(..., 'move', mover)` ігнорує стіни й ґрати для власника; зір і постріл не змінюються. Враховує лише власні здібності мувера (`collectModifiers([mover])`), без аур інших. Контент (Etherealness, привиди) не прив'язано — у «хвостах» STATUS.
- Редактор ребер вимкнено, поки активний maze (`REJECT.mapEdgesInMode`) і на touch-пристроях.
- Двері й руйнування ребер (`doors`, `map-door-toggle`, `map-edge-remove`) — етап B6, потребують `battle_map_state`; `edgeBlocks` розширюється лише джерелом стану.

## Map motion («Рух»)

`BattleMapConfig.motion?: { axis: "x" | "y"; speed } | null` — окреме поле конфігу карти за зразком `weather`, **не** запис у `MAP_MODE_REGISTRY` (реєстр — для режимів, що змінюють правила; рух суто візуальний і сумісний із лабіринтом). `speed` — клітинки/с зі знаком, `|speed| ≤ 6`, `0` = зупинено, відсутнє = вимкнено.

- Операція `map-motion` (`mutations/map-motion`, лише ДМ, активний бій); по мережі лише `axis` і `speed`, фаза **не** синхронізується — кожен клієнт крутить власну в `requestAnimationFrame` через `lib/utils/canvas/ticker`. Жодного полінгу.
- `MapBackground` при `map.motion` віддає рендер `components/battle/map/motion/MotionBackground`: доріжка з парної кількості тайлів (непарні віддзеркалені вздовж осі), період = 2 тайли; `backgroundCols` і `gridOffset` у цьому режимі ігноруються. Фон лишається статичним, доки не відома пропорція картинки; `prefers-reduced-motion` і прихована вкладка анімацію не запускають.
- Мобільний поворот карти (`rotated`): вісь і знак перераховує `motionInMapSpace`, тож напрям лишається екранним.
- Чиста математика (clamp, розгін, обгортання фази, кількість тайлів) — `lib/utils/battle/map-motion/`; панель ДМ — `MapMotionPanel`, хук `useMapMotionTool` (палітра взаємовиключна з режимом/місцевістю/погодою).
- Налаштування при створенні бою: `useBattleMapEditor` тримає `map.motion` і віддає `motionTool` (той самий `useMapMotionTool` з локальною мутацією), `BattleFormMap` рендерить `MapMotionPanel`; прев'ю їде вживу, `battleMapSchema.motion` зберігається в бою, а `resetMutation` не чіпає `motion` (покрито тестом).

## Зміна фону в бою

- Операція `map-background` (`mutations/map-background`, лише ДМ, активний бій): пише `map.background` і скидає `backgroundCols`/`backgroundRows`/`gridOffset` (як `setBackground` у налаштуванні). Файл/data-URL вантажиться в bucket `battle-maps` через `resolveMapBackgroundForPersistence` у самій мутації (`campaignId` береться з `params.id`), у сцені лежить лише URL.
- Для гравців перехід робить `MapBackground`: старий шар лишається, новий монтується з `opacity: 0` і з'являється після `onLoad` (800 мс, `BACKGROUND_FADE_MS`), старий одночасно зникає й знімається. `prefers-reduced-motion` — миттєва заміна. Те саме працює з `map.motion` (`MotionBackground.onReady`).
- Панель ДМ — `MapBackgroundPanel`, хук `useMapBackgroundTool` (палітра `background` у `palettes.ts` взаємовиключна з рештою). У реєстрі асистента — `handoff` (потрібне завантаження файлу).

## Калібрування сітки (setup)

`BattleMapConfig.backgroundRows?` — окрема висота фону в клітинках (неквадратні клітинки зображення; без неї береться з пропорцій). `backgroundBox` враховує її. Чисті `fromCellRect`/`nudge` у `lib/utils/battle/grid/calibration.ts`; стан у `useGridCalibration`, застосування через `applyCalibration` у `useBattleMapEditor`; UI — `components/battle/setup/GridCalibration.tsx`. При заміні фону калібрування пропонується зберегти лише за того самого розміру зображення. Автодетект сітки відкладено: [спайк](../superpowers/research/2026-11-14-grid-autodetect-spike.md).
