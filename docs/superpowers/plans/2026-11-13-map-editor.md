# Редактор бойових мап — план реалізації (епік)

**Дата:** 2026-11-13 · **Spec:** `docs/superpowers/specs/2026-11-13-map-editor-design.md` · **Статус:** реалізація НЕ почата. Це план рівня епіку: порядок, залежності, умови старту, перелік завдань по етапах. Перед кожним етапом пишеться власний детальний plan (сигнатури, тести, файли) з повторною верифікацією `файл:рядок`.

## Умови старту
Рефактор E2 (`docs/archive/superpowers/plans/2026-11-11-e2-d20-homm-modules.md`): на момент написання Ч1–Ч10 готові, Ч11 у роботі; далі Ч12 (UI бою), Ч13 (backfill), Ч14–Ч15 (стан у `battleData.system`), Ч16, Ч17, Ч18 (шарування UI-компонентів), Ч19 (аудит).
- **Старт етапів, що чіпають UI/правила карти (B, C, D, 0, E–G): після злиття Ч18** (мінімум — після Ч12 і Ч15). Причини: Ч12 змінює `components/battle/**`, view-типи `BattleMapView/BattleMapActions`; Ч18 може перекласти `components/battle/map/*` і додасть ESLint-межі (props ≤ ~7, UI-примітиви без доменних типів, контексти замість prop drilling); Ч14/Ч15 чіпають місця з `isAdjacent` у `systems/d20`, `systems/wfrp`.
- **До цього можна готувати лише нові самодостатні чисті модулі** (без правок існуючих файлів): `lib/utils/battle/grid/calibration/*`, `lib/utils/battle/grid/walls.ts` (без заміни викликів), `lib/utils/battle/vision/shadowcast.ts`, `lib/utils/battle/camera/*`, `lib/utils/battle/tiles/*`. Також спайки (нижче) і генерація текстур.
- Prisma-міграції (етап 0, E, стан бою) — окреме рішення власника; expand-only; кожна `CREATE TABLE` з `ENABLE ROW LEVEL SECURITY`; міграції ідуть лише в production-збірках з `main`.
- Розгортання: feature flag (на рівні кампанії) на етапи 0, D, E, F, G; A, B, C без прапора. Деплой — після Ч13 backfill (правило E2).

## Спайки (до відповідних етапів, 1–2 дні кожен, результат — запис у `docs/superpowers/research/`)
1. **Автодетект сітки** — до етапу A: 5 реальних карт користувача; метрика: частка карт, де знайдено сітку з похибкою < 5% клітинки. Якщо < 3/5 — A робить лише ручне калібрування, автодетект переноситься.
2. **Canvas 2D на чанках 16×16, 200×200, середній телефон** — до етапу D: прототип із pan/zoom; FPS ≥ 30 і відсутність OOM на iOS Safari; інакше переглянути підхід (OffscreenCanvas, менший чанк, WebGL).
3. **Пілот AI-текстур** — до етапу E: 6 зображень (`tiles_stone-floor_1`, `tiles_grass_1`, `tiles_wood-planks_1`, `tiles_wall-stone`, `tiles_barrel`, `tiles_door-wood-closed`), перевірка за `docs/assets/tile-prompts/README.md`.
4. **Аудит міграції сховища** — до етапу 0: scene templates, content/constructor layers, import/export (`content-snapshot.ts`), AI-проєкція карти (`lib/ai/tools/projection.ts`), `grep -rn "BattleMapConfig\|battleMapSchema" lib/server lib/ai`.

## Порядок і залежності
```
 0 (сховище, L) ──► D (рендер, M–L) ──► E (тайли, XL) ──► F (туман A) ──► G (туман B)
 A (калібрування, S–M)  — незалежний, можна першим і паралельно
 B (стіни/ґрати/двері, L) — незалежний від 0/D (працює з поточним inline-JSON), але стан бою (двері/зруйновані стіни) використовує шар з етапу 0 ⇒ B1–B5 до 0, дверна/руйнівна частина B6 — після 0
 C (камера, M–L) — після D для карт >60×60; для малих карт можна раніше
 H (UVTT) — після B
```
Рекомендований перший пакет після рефактора: **A + B1–B5** (видимий результат без нової інфраструктури), далі **0 → D → C**, потім **E → F → G**, потім **B6-стан + H**.

## Етап A — Калібрування сітки
- [ ] Модель: `backgroundRows?` у `BattleMapConfig` + Zod (`lib/schemas/battles.ts`); `backgroundBox` враховує окремі осі (`grid/background.ts`).
- [ ] Чисті модулі `grid/calibration/`: `fromCellRect`, `detectGrid`, `nudge` + тести (синтетичні сітки, шум, зсув, неквадратні, «немає сітки»).
- [ ] `lib/utils/common/image-pixels.ts` (`grayPixels` через `drawResized` + `getImageData`).
- [ ] UI: `GridCalibration` у `BattleFormMap`, хук `useGridCalibration`, `actions.applyCalibration` у `useBattleMapEditor`.
- [ ] Поведінка при заміні фону (зберегти калібрування лише за того самого розміру).
- [ ] i18n (`battleSetup.map.calibration.*`, uk+en), whats-new, hint.
- [ ] Живий прогін на 3–5 реальних картах.

## Етап B — Стіни, ґрати, двері в core
- [ ] B1 модель: `BattleMapConfig.walls/bars/doors`, Zod, `grid/walls.ts` (перенос із maze, `maze/walls.ts` лишається re-export), хук режиму `walls?(map)` + `modeWalls`, `wallsOf`.
- [ ] B2 правила: `edgeBlocks(map, a, b, kind)`; рух (`path.ts` + footprint), лінія вогню, ближній бій (`attack-reach.ts`), `isAdjacentOnMap` і заміна викликів (список у spec, перегрепити), шаблони AoE, досяг ≥2 через стіну, `passesWalls` (модифікатор), оновлення `scripts/sim/battle-sweep.ts`.
- [ ] B3 редактор: `EdgeEditor` + `useEdgeStroke` (узагальнення maze), `edgeAtScreenPoint`, `SetupTool 'edge-wall'`, `paintEdges`; рендер `WallsLayer` (лінії з квадратними кінцями + текстура маскою).
- [ ] B4 дельти: `ClientBattleDelta.map.walls/bars` diff; тести `client-delta`.
- [ ] B5 тести (список у spec) + регресія maze + `pnpm battle-sweep` на prodcopy.
- [ ] B6 двері/ґрати: `doors` (open/locked), мутації `map-door-toggle` (гравці лише незамкнені) і `map-edge-remove` (DM) — пишуть у `battle_map_state` (після етапу 0; до того — тимчасово в `map`).
- [ ] i18n, whats-new, hint/help.

## Етап 0 — Сховище карт (feature flag)
- [ ] Spike 4 (аудит) виконано, рішення по шаблонах/імпорту зафіксовані.
- [ ] Міграція (рішення власника): `battle_maps`, `battle_map_chunks`, `battle_map_state`, колонки `battles.map_id`, `battles.map_version`; RLS на всіх; історія версій карти (content-addressed `battle_map_versions`) до закриття бою.
- [ ] Серверний API: `GET /maps/[mapId]` з weak ETag + `Cache-Control: private, max-age=0, must-revalidate`; CRUD бібліотеки; payload сцени з `{mapId, mapVersion, header}`; `structuralSharing: false` для сцени; query карти за `mapVersion`.
- [ ] Снапшоти: писати карту лише при зміні (hash); rollback за hash.
- [ ] `MAP_LIMITS` — одна константа для всіх Zod-лімітів і `MAX_SIDE`; фото-карти ≤ 60×60, тайлові ≤ 200×200; фон лише URL сховища.
- [ ] Сторінка DM «Карти» (`app/campaigns/[id]/dm/maps`, server page → `*-client.tsx`), вибір карти у формі бою, «оновити карту в бою» з перевіркою колізій.
- [ ] Старі inline-карти працюють без міграції даних.
- [ ] Feature flag на рівні кампанії (перевірити наявний механізм).

## Етап D — Рендер сітки для великих карт (feature flag)
- [ ] Spike 2 пройдено.
- [ ] `GridLayer`: один path/pattern, делегований pointer, рендер лише клітинок з позначками, культинг за камерою; `zoneCells` memo.
- [ ] FX-контракт: `[data-fx-grid]` + геометричний `cellPoint` в `fx/runtime/anchors.ts` + тести.
- [ ] Аудиторські виправлення: cap `moveBudget`, `outOfRangeMarks`, кільцевий `cellsByDistance`/`nearestStandable`, кеш `hazardCells`, `playableBounds`, чанковий/інкрементальний terrain.
- [ ] Профілювання до/після (60×60, 100×100, 200×200).

## Етап C — Камера
- [ ] `lib/utils/battle/camera/` (математика) + тести.
- [ ] `useMapCamera` (focus, follow, userMoved, recenter), режим камери для карт, що не вміщуються; на телефоні без обертання.
- [ ] `RecenterButton`, мінімапа (клік = перельот; під туманом лише відкрите).
- [ ] `followTurn` пропускає токени, невидимі глядачу; перемикач для DM (localStorage), за замовчуванням вимкнено.
- [ ] Покрити тестами `useScrollToCurrent` перед заміною; DOM-контракт `data-fx-*` збережено.

## Етап E — Редактор тайлів (feature flag, лише десктоп)
- [ ] Spike 3 пройдено; текстури з `docs/assets/tile-prompts` (P1) завантажені.
- [ ] Реєстр тайлсетів `lib/constants/tilesets/` (`source: bundled|generated|campaign`), бакет `battle-tiles`, `assets:attach --kind tiles`, ліміт 50 МБ/кампанію, валідація (256 px на клітинку, ≤200 КБ).
- [ ] Чисті модулі `tiles/`: чанки, RLE, autotile-маска, детермінований `variantFor`, `diffChunks` + тести.
- [ ] Canvas-рендер чанками, програмне змішування ґрунтів.
- [ ] Редактор: палітра, пензель, прямокутник, лінія, заливка, гумка, піпетка, 2 шари, стіни, undo/redo; повідомлення на тач-пристроях.
- [ ] Збереження чанків, дельти патчами, тести.

## Етап F — Туман A (відкриті місця) · Етап G — Туман B (зір)
- [ ] F: `battle_map_state.fog` (режим на бій), DM-інструменти (пензель, прямокутник, «відкрити кімнату» в межах стін), Canvas-шар за зразком `WorldFog`, `fogView` (ховання токенів, UI-only), дельти.
- [ ] G: `vision/shadowcast.ts` (власний симетричний shadowcasting по ребрах-стінах) + тести; фіксований `visionRadius` від DM; пам'ять дослідженого в localStorage; перегляд DM «очима гравця X».
- [ ] Взаємодія з maze: у режимі maze туман ядра ігнорується.

## Етап H — Імпорт UVTT
- [ ] `.dd2vtt/.uvtt` → зображення, PPI → `backgroundCols`, `line_of_sight` → `walls`, портали → `doors`; завантаження через підписаний URL; стиск 2400 px.

## Верифікація (кожен етап)
- Мід-розробка: `pnpm exec eslint --fix <файли>`, `pnpm test:related <файли>`; повний `pnpm test:run` і репо-lint — один раз перед злиттям (перед ними `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`).
- Живий прогін Sonnet-субагентом (desktop 1280 + mobile 375, JS/текстові перевірки): A — реальні карти; B — рух/удар/постріл/шаблон через стіну, регресія maze; C — 100×100, хід за ходом; D — профіль; E — 100×100 тайлів; F/G — два гравці й DM.
- `pnpm battle-sweep` на prodcopy для B.
- Після гілки: `/simplify`, одна фінальна Opus-рев'ю, оновити `docs/architecture/{map-modes,battle}.md`, `docs/STATUS.md`; spec/plan → `docs/archive/superpowers/` при злитті.
- Правила battle.md: `snapshotHash` при записі snapshot; хід лише `advanceTurn`; відповіді дельтами; не мутувати спільний `rules`.

## Процес
- На старті кожного етапу — grep усіх згаданих `файл:рядок`; помітки «верифікувати» знімаються лише після власного читання коду.
- Кожен етап — окрема гілка/worktree від актуального `main`, spec → plan → SDD (Sonnet виконавець, Opus рев'ю).
- Користувацькі фічі: whats-new + `whatsNew.<id>` у `messages/{uk,en}`, hint/help для нових екранів.
