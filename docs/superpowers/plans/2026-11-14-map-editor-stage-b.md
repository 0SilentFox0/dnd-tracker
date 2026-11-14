# Редактор мап — Етап B1–B5: стіни та ґрати в core (детальний план)

**Дата:** 2026-11-14 · **Гілка:** `feat/map-editor` (після коміту етапу A `4d024195f`) · **Епік:** `2026-11-13-map-editor.md` · **Spec:** `specs/2026-11-13-map-editor-design.md` §3 «Етап B», §5.3–5.4.
**Виконання:** SDD — Sonnet-виконавці, без рев'ю по задачах, одне Opus-рев'ю в кінці (feedback-review-cadence). Тести пишуться разом із кодом; повний `pnpm test:run` — раз у кінці; мід-розробка `pnpm test:related <files>` + `pnpm exec eslint --fix <files>`.

## Рішення обсягу
- **B1–B5 = стіни (`walls`) + ґрати (`bars`).** `doors` і мутації `map-door-toggle`/`map-edge-remove` — B6 (потребують `battle_map_state` з етапу 0). `edgeBlocks` одразу має параметр `kind: 'move'|'sight'|'fire'`, тож B6 додає лише джерело дверей/зруйнованих ребер.
- `passesWalls` (модифікатор) — окрема задача T9 в кінці; ядро не називає систему.
- Maze лишається як є: `maze.walls` читається через `wallsOf = map.walls ∪ modeWalls(map)`; core-інструмент ребер вимкнений, поки активний maze.

## Верифікація spec (файл:рядок на 2026-11-14)
| Spec | Факт у коді |
|---|---|
| `modes/maze/walls.ts` (canStep, wallSet…) | ✔ є; приймає `GridSize` + `ReadonlySet`; `wallSet(maze)` читає `maze.walls`. Споживачі: `maze/{sight,tunnel,movement,vision,carve,connectivity}.ts`, `mutations/maze/maze-ops.ts`, `useMazeEdgeStroke`, `MazeEdgeEditor`, `MazeWallsLayer`, `scripts/sim/battle-sweep.ts` (імпорт `canStep/wallSet` ~l.119–131) |
| Хук `modeWalls` | ✘ **не існує** — додати `walls?` у `ModeEngineHooks` (`modes/types.ts`), диспетчер у `modes/engine.ts` (шаблон — `modeLineBlocked`, l.116) |
| `path.ts searchPaths` l.101 | ✔ l.101; цикл `for (const next of neighbors(cur))` l.~143 (8 напрямків, `neighbors` у `geometry.ts:34`); умова пропуску `!fits(map,next,size,walls)`. Виклики: `move-mutation.ts:134`, `map-view.ts:26 moveMarks`, `grid/hazard.ts:103`, `abilities/engine/core/targets.ts:48,66`, `attack-phase/targets.ts:157` |
| `modeMoveZone` | `map-scene.ts:298` (`modeMoveZone(...) ?? openMoveZone`) — для звичайної карти йде `openMoveZone` → `moveMarks/reachable` |
| `line-of-fire.ts` | ✔ `lineOfFire` l.24; `blocked = cells.length>0 \|\| modeLineBlocked(map,line)` l.69; виклики: `map-scene.ts:182`, `useAttackTargets.ts:66`, `run-attack-phase.ts:366` (spec казав :364) |
| `attack-reach.ts` | **Логіка в `reach-check.ts`** (`attackReachError` l.~125, engaged l.~104/168 через `footprintDistance<=1 && modeEngages`); `attack-reach.ts` — обгортка |
| `isAdjacent` виклики (spec: 7) | `spell/cast/outcome.ts:84`, `grid/adjacent-attack.ts:12`, `abilities/registry/conditions.ts:271`, `systems/d20/rules/actions/availability.ts:80`, `grapple.ts:485,553`, `systems/wfrp/rules/combat/resolve-attack.ts:81,84` — збігається; `isAdjacent` — `grid/occupancy.ts:56` |
| Сирі `footprintDistance<=1` | `attack/process/cleave.ts:70` (вже з `modeMeleeBlockedText`), `maneuvers/fire-burst.ts:35`, `spell/cast/move-self.ts:46`, `reach-check.ts:104,168`, `attack-reach.ts:127` (лише вибір тексту — не чіпати). Інші з spec (`piercing`, `effects`, `bonus.ts:123`, `auto-reaction`, `objects-near`, `map-auras`, `opportunity.ts:135`) однорядковий grep не знайшов — **T4 робить повний `grep footprintDistance` і складає таблицю класифікації** |
| `template.ts` | `rayCells` l.117, `templateCells` l.149; виклики: `piercing.ts:32`, `fire-wave.ts:52`, `maneuvers/squall.ts:38` |
| Zod | `edgeKeySchema` `schemas/battles.ts:34` (не exported); `battleMapSchema` ~l.150; maze walls `.max(7200)` l.73 |
| Типи | `BattleMapConfig` `types/battle.ts:360` (є `backgroundRows` з A) |
| Дельти | `mapChange` `pipeline/client-delta.ts:37`: baseOf-порівняння, потім `diffTerrain` + `modeDeltas`; **новий ключ карти без обробки = повна карта в дельті** |
| Редактор setup | `SetupTool` `grid/map-editor.ts:81`, `TOOLS` `BattleFormMap.tsx:41`, стан у `useBattleMapEditor.ts` (`tool`, `onStroke`) |
| Редактор maze | `MazeEdgeEditor.tsx` (~7000 `<rect data-maze-edge>`), `useMazeEdgeStroke.ts` (шле `MazeActionData`) |
| Мутація бою за зразком | `mutations/map-terrain/map-terrain-mutation.ts`; точки реєстрації: `lib/server/battles/operations.ts`, `lib/utils/api/rate-limit.ts`, `lib/server/assistant/actions/battle-actions.ts` + `__tests__/helpers/coverage.ts` (**реєстр coverage — gotcha**), `useBattleActions.ts`, `schemas/battles.ts` |

## Reuse
`edgeKey/parseEdgeKey/canStep/…` (піднімаємо з maze), `cellLine` (`geometry.ts`), `diffTerrain`-патерн, `useStrokePaint`, `cellAtScreenPoint` (`layout.ts`), `modeLineBlocked`-патерн для хука, `MAZE_WALL_WIDTH`/`MazeWallsLayer` для рендеру, `fixtures.ts (mazeMap)` та `testMap`. `isAdjacent` у `systems/d20|wfrp` — лише споживачі `grid/occupancy`, нових копій не створюємо; нове: `isAdjacentOnMap`.

## Задачі

### T1 — Модель і ядро (B1)
- `types/battle.ts`: `BattleMapConfig.walls?: string[]; bars?: string[]`.
- `lib/utils/battle/grid/walls.ts` (новий): переносимо код з `maze/walls.ts` без змін поведінки; `wallSet(list?: string[])` приймає масив (WeakMap-кеш), `hasWall/cornerOpen/canStep(grid, walls, a, b)`, `edgeKey`, `parseEdgeKey`, `edgeCells`, `allInteriorEdges`. `modes/maze/walls.ts` → тонкий re-export + `wallSet(maze)` обгортка над `wallSet(maze.walls)` (сигнатури maze не міняються). Експорт у `grid/index.ts`.
- `modes/types.ts`: `ModeEngineHooks.walls?(args:{config:C; map}): readonly string[]`; `modes/engine.ts`: `modeWalls(map)`; maze: `walls: ({config}) => config.walls`.
- `grid/edges.ts` (новий): `wallsOf(map): ReadonlySet<string>` (walls ∪ modeWalls, мемо за ідентичністю обох масивів), `barsOf(map)`, `edgeBlocks(map, a, b, kind, mover?)` (`move`: walls∪bars; `sight`/`fire`: лише walls; діагональ — `cornerOpen`), `cellsConnected(map, kind, fromCells, toCells)`.
- Zod: `edgeKeySchema` експортувати; `battleMapSchema`: `walls`, `bars` `.max(7200)` + `superRefine` (ребро в межах cols/rows, без дублікатів, `bars ∩ walls = ∅`).
- Тести: `grid/__tests__/{walls,edges}.test.ts` (перенос maze-кейсів, діагональ/кут, union із maze, kind move/sight/fire), `modes/__tests__/engine-hooks.test.ts` (`modeWalls`), `battle-map-schema.test.ts`. **Регресія:** усі `modes/maze/__tests__` без змін.

### T2 — Рух (B2a)
- `searchPaths`: перед `fits` — footprint-aware `moveAllowed(map, cur, next, size, mover)`: для кожної клітинки footprint(cur) → відповідна footprint(next) (зсув d) `!edgeBlocks(…,'move')`. Хот-лупа: `wallsOf` береться один раз до циклу.
- `moveMarks/reachable/pathFrom` успадковують. Перевірити server `move-mutation.ts:134` і `hazard.ts:103`, `targets.ts:48,66` (досяжність цілі — тепер через стіну недосяжна).
- **Maze gotcha:** сервер maze також ходить через `searchPaths` → union дає ті самі стіни; виконавець підтверджує тестом `move-mutation` на `mazeMap`, що maze-рух не змінився.
- Тести: `grid/__tests__/path-walls.test.ts` (1×1, 2×2 footprint, діагональний кут, ґрати блокують рух, стіна блокує обхід — довший шлях), `map-view` для `moveMarks`.

### T3 — Лінія вогню, шаблони, видимість (B2b)
- `lineOfFire`: між кожною парою послідовних клітинок лінії `edgeBlocks(…,'fire')` → `blocked`; `cells` не додаємо (як у maze). `modeLineBlocked` лишається.
- `template.ts`: `rayCells` зупиняється на стіні (`fire`); `templateCells` для не-променевих форм відсікає клітинки без «чистої лінії» від джерела (`cellLine` + `edgeBlocks 'fire'`). Перевірити `zone-hazard.ts:164`.
- Видимість/ціль: `attack/process/chain.ts:57`, `abilities/engine/core/targets.ts:29`, `spell/spell-targeting.ts` — додати core-LOS (`sight`) поряд із `modeSees`. Виконавець читає кожне місце й фіксує в коментарі коміту, де саме додано.
- Тести: `line-of-fire-walls`, `template-walls` (конус/коло/куб/промінь/хрест через стіну), `bars` не блокують вогонь.

### T4 — Ближній бій і сусідство (B2c)
- `isAdjacentOnMap(map, a, b)` у `grid/occupancy.ts` (або `grid/adjacency.ts`, якщо `import/no-cycle`): `isAdjacent` ∧ `cellsConnected(map,'move'…)` для хоч однієї пари сусідніх клітинок footprint. **Рішення:** ґрати не блокують ближній бій (удар крізь ґрати), блокують лише рух; тому для сусідства/досягу kind = `'sight'` (лише `walls`).
- `reach-check.ts attackReachError`: для будь-якого досягу ≥1 вимагати чистий шлях (`cellLine` + `edgeBlocks 'sight'`) між найближчими клітинками; відмова — новий текст `battleLog…` або існуючий `REJECT.targetNotNear` (виконавець обирає наявний ключ, нових літералів без i18n немає). Engaged (l.104,168): сусід через стіну не «зв'язує».
- Заміна викликів `isAdjacent` → `isAdjacentOnMap` там, де є `map` у контексті: `adjacent-attack.ts:12`, `spell/cast/outcome.ts:84`, `systems/d20/rules/actions/availability.ts:80`, `grapple.ts:485,553`, `systems/wfrp/rules/combat/resolve-attack.ts:81,84`, `abilities/registry/conditions.ts:271`; якщо `map` недоступна — лишити, записати причину в плані (розділ «Знахідки»).
- Повний `grep footprintDistance` → таблиця: ближньобійна семантика (cleave, fire-burst, move-self, opportunity-атаки, bonus.ts:123, auto-reaction, piercing) → wall-aware; геометрична (auras, summon `objects-near`, teleport/placement/push) → не чіпати (spec §B2 «Не чіпаємо»).
- Тести: `attack-reach-walls`, `adjacent-attack` через стіну/діагональ, один тест на d20 `availability` і один на wfrp `resolve-attack`.

### T5 — Симулятор і ESLint-ratchet
- `scripts/sim/battle-sweep.ts`: імпорти `canStep/wallSet` з нового `grid/walls` (maze-обгортки лишаються для `wallSet(maze)`); додати 1 сценарій зі стіною між двома бійцями (рух/удар/постріл заборонені).
- `pnpm exec eslint --fix` на змінені файли; `system-imports-exempt`/ratchet не росте.

### T6 — Setup-редактор ребер (B3a)
- `grid/layout.ts`: `edgeAtScreenPoint(map, x, y /* координати в UNIT */, tolerance?)` → ключ ребра або `null` (дробова частина → найближче ребро; поблизу кута — ближче за відстанню; поза межами/зовнішнє ребро → null) + тест.
- `grid/map-editor.ts`: `SetupTool += 'edge-wall'|'edge-bars'|'edge-erase'`; `paintEdges(map, edges, op)` (add walls/add bars/erase обох; ліміт 7200; конфлікт walls/bars → остання дія перемагає) + тест.
- `components/battle/map/EdgeEditor.tsx` + `lib/hooks/battle/useEdgeStroke.ts` (props ≤ 7): один обробник pointer на SVG-групі через `edgeAtScreenPoint` замість тисяч `<rect>`; перший клік визначає add/remove; протяг по ломаній (ребра між послідовними точками інтерполюються); `pending` для прев'ю; параметри `(edges, onCommit(add, remove))`.
- `BattleFormMap`: кнопки інструментів + повідомлення «вимкнено в режимі лабіринту»; `useBattleMapEditor.actions.onEdgeStroke`; на тач-пристроях — лише перегляд (spec §6.1).
- Тести: `useEdgeStroke.test.tsx` (happy-dom), `BattleFormMap.test.tsx` (інструменти), `paintEdges`, `edgeAtScreenPoint`.

### T7 — Рендер і бій-DM (B3b)
- `WallsLayer` у `MapLayers.tsx` (або окремий файл `components/battle/map/WallsLayer.tsx`, якщо `MapLayers` перевищує ліміти): лінії по ребрах зі стилем `MAZE_WALL_WIDTH`, квадратні кінці; ґрати — тонка пунктирна лінія іншого кольору; текстура-маска — **поза B (E)**, зараз суцільний колір з токенів теми. `ModeView.showWalls` для maze не міняємо; core-стіни видимі завжди.
- Мутація `lib/server/battles/mutations/map-walls/` (за зразком `map-terrain`): Zod `{ add, remove, kind: 'walls'|'bars' }`, ≤ 400 ребер за операцію (константа поруч із `MAZE_LIMITS`), `runBattleMutation`, відповідь дельтою; **зареєструвати:** `operations.ts`, `rate-limit.ts`, `assistant/actions/battle-actions.ts` + `coverage.ts`, `useBattleActions.ts`, `lib/api/battles.ts`; блок для maze-карти (`blockedByMode`).
- Кнопка в `MapTerrainToolbar`/`useMapTerrainTool` (DM): інструмент стін у бою з тим самим `EdgeEditor`.
- Тести: `map-walls-mutation.test.ts`, `map-scene-walls.test.ts`, hook-тест інструмента.

### T8 — Дельти (B4)
- `ClientBattleDelta.scene.map.walls?/bars?: {add: string[]; remove: string[]}` (типи в `types/…`/`store/types`), `mapChange` будує diff (`diffEdges(before, after)`; шаблон — `diffTerrain`), `baseOf` виключає `walls/bars`; клієнтський merge у сторі сцени (`applyDelta`) — знайти й додати; ліміт Pusher 9 500 байт: diff понад ~400 ребер → повна карта (як fallback `modes === null`).
- Тести: `client-delta.test.ts` (diff, fallback, роундтріп merge).

### T9 — `passesWalls` (B2d)
- Новий ключ модифікатора `passesWalls` у реєстрі модифікаторів (`lib/utils/abilities/…` — виконавець знаходить реєстр `collectModifiers`), `edgeBlocks(..., 'move', mover)` повертає false, якщо `statWithModifiers`/boolean-модифікатор активний; `sight/fire` не змінюються. Тест у `abilities` + `path-walls` (ефірний проходить).
- Прив'язка до конкретних здібностей (Etherealness, привид) — лише якщо вони вже є в SRD-даних як ефекти; інакше лише механізм + тест, а контент → STATUS «хвости».

### T10 — Документація, онбординг, i18n
- `messages/{uk,en}/battleSetup.json`: `map.tools.{edgeWall,edgeBars,edgeErase}`, підказка про лабіринт/мобільний; `messages/*/battle*.json` — тексти відмов (`wallBetween`-аналог для core); `lib/onboarding/whats-new.ts` + `whatsNew.mapWalls` у обох локалях; hint у `hints.ts`.
- Оновити `docs/architecture/map-modes.md` (core-стіни, `wallsOf`, `edgeBlocks`, хук `walls`), `battle.md` (мутація `map-walls`, дельта), `docs/STATUS.md`.

## Порядок виконання (SDD)
1. **Одна диспетчеризація:** T1 (фундамент, сам по собі).
2. **Паралельно після T1** (різні файли): [T2 + T3 + T4 — один Sonnet послідовно, бо спільні `edges.ts`/тести] ∥ [T6 → T7] ∥ [T8]. Якщо конфлікти — послідовно.
3. T5, T9, T10 → один виконавець.
4. Гейти раз у кінці: `tsc --noEmit`, повний `pnpm test:run`, repo-lint **пропускаємо** (feedback-skip-repo-lint) → `eslint` по змінених папках, `pnpm battle-sweep` на prodcopy (перед `ps`-перевіркою), живий прогін Sonnet-субагентом (стіна: рух/удар/постріл/шаблон, регресія maze, desktop 1280 + mobile 375).
5. `/simplify` (1–2 агенти) → одне Opus-рев'ю → docs.

## Ризики
- Продуктивність `searchPaths` на 60×60 з footprint: `wallsOf` один раз, ранній вихід при порожніх `walls/bars`.
- Maze: union змінює зону ходу для сервера (див. T2) — тест-страж.
- Імпорт-цикли: `grid/edges.ts` імпортує `modes/engine` (як вже робить `line-of-fire.ts`) — дотримуватись.
- B6 (двері/руйнування) не входить: `edgeBlocks` пізніше отримає додаткове джерело стану.

## Знахідки (заповнює виконавець)
- T2-T4: `conditions.ts:271` лишив `isAdjacent` (немає `map` у `ConditionContext`). `grid/adjacency.ts` винесено окремо, щоб уникнути циклу occupancy→edges→engine. Класифікацію `footprintDistance` див. у task-234-report. Тести wfrp/template написані за припущеннями (не запускались).
- T6-T7: `WALL_WIDTH` дубльовано з maze (modes не імпортують `components/battle/map`); редактор ребер прихований на touch; без optimistic-прев'ю у бою; maze відхиляє `map-walls` (`REJECT.mapEdgesInMode`).
- T8: дельта `scene.walls/bars` (`EdgeDiff`), fallback у повну карту при > 400 ребер.
- T9: `passesWalls` — flag-ефект (`collectModifiers([mover])`, без аур); `searchPaths` пропускає перевірку ребер, якщо є флаг; контент не прив'язано.
- T5: sweep імпортує `canStep` з `grid/walls`; сценарій `mapWallsCheck` (оточення бійця стінами → рух відхилено, після зняття дозволено). Удар/постріл через стіну в sweep не перевіряються (покрито unit-тестами).
- Жоден тест, tsc чи sweep у B2–B5 не запускались.
