# Карти бою — Ч1: фундамент (ребра для обох сіток + сцена арту)

Епік: `2026-11-26-map-art-epic-design.md`. Ч1 має дві частини з окремими планами: **1a** (механіка ребер, без нових даних) і **1b** (сцена арту + запікання, нова таблиця). 1b спирається на 1a.

## 1. Поточний стан (main ac12c9281)

- Тайловий редактор: `lib/utils/battle/tiles/*` (шари `ground|wallfill|objects|edge-art|effects`, chunks 16×16 `Uint16` + RLE), каталог `lib/constants/tilesets/catalog.ts` (149 записів, 256×256; edge-art — смужки 256×64), рендер `components/battle/map/tiles/{TileCanvas,chunk-cache,painter}.ts`.
- **Баг орієнтації:** `edge-art` — тайл клітинки без сторони; `painter.ts drawCell` (рядки 67–89) малює смужку в квадрат `cellPx×cellPx` без повороту. Шар не пов'язаний з `map.walls/doors` і нічого не блокує (`derive.ts`). SVG `WallsLayer`/`DoorsLayer` орієнтацію вміють (`edgeRect`, поворот дверей на 90°), але лише для квадрата.
- Ребра — тільки квадрат: ключ `"x:y:e|s"` (`lib/utils/battle/grid/walls.ts` — `formatEdgeKey`, `edgeKey(a,b)`, `parseEdgeKey`, `edgeCells`, `hasWall`, `cornerOpen`, `canStep`; `grid/edges.ts` — `wallsOf`, `barsOf`, `closedDoorsOf`, `edgeBlocks`, `cellsConnected`). Зберігання: `map-storage/edge-chunks.ts`, 2 біти на ребро × 2 сторони на клітинку.
- Гекс (Ч7c): flat-top, odd-q, `gridType` (`types/battle-grid.ts`, `gridOf`), геометрія `grid/hex.ts`. Стіни, ґрати, двері, тайли й ефекти на гексі заборонені guard'ами: `lib/schemas/battles.ts` (`hexSquareOnly`), `lib/schemas/battle-maps.ts refineBattleMap`, `app/api/campaigns/[id]/maps/[mapId]/tiles/route.ts` (`BATTLE_MAP_HEX_SQUARE_ONLY`), мутації `map-walls`, `map-edge-remove`, `map-door-toggle`, `components/maps/editor/EditorSidebar.tsx HEX_HIDDEN`, `useMapEditorWorkspace`.
- Фон карти вже вміє гекс (`grid/background.ts stepRatio/gridForCellSize`). Upload фону: `lib/server/battle-maps/background-upload.ts`, бакет `battle-maps`.

## 2. Ч1a — ребра для обох сіток

### 2.1 Ключ ребра
- Квадрат: без змін, `x:y:e` / `x:y:s` (сумісність з даними на проді).
- Гекс flat-top: 6 напрямків `n, ne, se, s, sw, nw`. Канонічні сторони клітинки — `n`, `ne`, `se`. Ребро з напрямком `s`/`sw`/`nw` нормалізується до сусіда (`s` → сусід знизу `n` тощо, з урахуванням odd-q). Ключ `x:y:n|ne|se`; формат рядка той самий, тож валідатори розширюються лише набором сторін за сіткою.
- Новий модуль `lib/utils/battle/grid/edge-keys.ts` (чистий, сітко-агностичний):
  - `edgeSidesOf(grid)`; `canonicalEdge(grid, cell, dir) → key`;
  - `edgeKeyBetween(grid, a, b) → key | null`;
  - `edgeCellsOf(grid, key) → [a, b]`;
  - `edgeSegment(grid, key) → [p0, p1]` у map units (квадрат — `UNIT`; гекс — вершини `hexPolygon`);
  - `edgesOfCell(grid, cell)`.
- Наявні функції `walls.ts`/`edges.ts` отримують параметр `grid` (або `map`, з якого береться `gridOf`) і делегують у `edge-keys.ts`. Квадратні виклики поводяться ідентично (тести-таблиці на старі ключі).

### 2.2 Механіка на гексах
- Крок між сусідами: `canStep`/`edgeBlocks` для гекса — перевірка одного ребра. `cornerOpen` (діагональ квадрата) на гексі не потрібен: усі 6 сусідів спільні по ребру.
- Шляхи: `grid/path.ts`, `move-route.ts`, `reach-check.ts`, `adjacency.ts`/`adjacent-attack.ts` (атака крізь стіну заборонена), `nearest.ts`, `placement.ts`, `revive-placement.ts` — через ті самі `canStep`/`edgeBlocks`.
- Видимість і лінія вогню: `grid/sight.ts`, `line-of-fire.ts`, `vision/shadowcast.ts`. На гексі — `hexLine` + блокування, якщо промінь між центрами перетинає сегмент стіни (`edgeSegment`); на квадраті без змін.
- Шаблони й аури (`template.ts`), поштовх (`push.ts hexAwayStep`), fire-wave, chain/cleave — блокування стінами через спільний хелпер.
- Туман: `fog/reveal.ts floodRoom` — заливка по `cellsConnected` для обох сіток.
- Двері: `map-door-toggle` — пошук дверей за гекс-ключем; гравці відкривають незамкнені (правило B6 без змін).
- Знімаємо guard'и `hexSquareOnly` / `BATTLE_MAP_HEX_SQUARE_ONLY` / `mapHexSquareOnly` для walls, bars, doors. `maze` лишається `grids: ['square']`, тож guard на `m.maze` залишається.
- **Зберігання:** `edge-chunks.ts` кодує сторони за сіткою: 2 біти × (2 сторони квадрата | 3 сторони гекса) на клітинку. Версія формату в заголовку chunk'а; старі chunks читаються як квадратні.

### 2.3 Рендер і редактор
- `WallsLayer` малює ребро як повернутий прямокутник уздовж `edgeSegment`: довжина = довжина сегмента, кут = `atan2`. Цегляний pattern повертається разом зі смугою. На стиках — квадратна шапка (як зараз). `DoorsLayer` теж розташовує спрайт уздовж сегмента під кутом, тож двері на вертикальних і діагональних ребрах орієнтовані правильно.
- `EdgeEditor`: hit-test найближчого ребра — клітинка під курсором (`cellAtScreenPoint`), потім найближчий із її сегментів (`edgesOfCell` + відстань точки до відрізка). Прибрати `edges` з `HEX_HIDDEN`.
- Шар `edge-art` у тайловій палітрі ховаємо одразу (у Ч1b він зникне). Механічні двері/ґрати малюють орієнтовані SVG-шари.

### 2.4 Тести
- `grid/__tests__/edge-keys.test.ts`: нормалізація всіх 6 напрямків для парних і непарних колонок; `edgeKeyBetween` ↔ `edgeCellsOf` (round-trip); сегменти збігаються зі спільними вершинами `hexPolygon` сусідів; квадратні ключі не змінились.
- Шлях і видимість крізь гекс-стіну, двері відчинені/зачинені, поштовх у стіну, `floodRoom` з гекс-стінами.
- `edge-chunks` round-trip для гекса + читання старого квадратного chunk'а.
- Ratchet `lib/__tests__/grid-calls.test.ts` не порушувати (нові виклики — через `gridOf`).

## 3. Ч1b — сцена арту + запікання

### 3.1 Дані
- Нова таблиця `battle_map_art`: `mapId` (PK, FK → `battle_maps`, cascade), `scene JSONB`, `sceneVersion int`, `bakedUrl text?`, `bakedAt timestamptz?`, `bakedSceneVersion int?`. Міграція expand-only + `ENABLE ROW LEVEL SECURITY`.
- Сцена (Zod-схема `lib/schemas/map-art.ts`, `v: 1`):
  - `floors`: матеріал на клітинку — chunks 16×16 + RLE (перевикористання `tiles/rle.ts` і формату chunk'ів); індекс `col,row` однаковий для обох сіток;
  - `walls`: `Record<edgeKey, wallMaterialId>`;
  - `openings`: `Record<edgeKey, { kind: 'door'|'window'|'bars'|'portcullis', material, locked? }>`;
  - `blocked`: клітинки-завали або скелі (непрохідні, без стіни), матеріал опційний;
  - `lights`: `{ id, x, y, radius, color, intensity }[]` у map units;
  - `ambient`: `{ tint, darkness }`;
  - `stamps`: `[]` — поле зарезервоване, інструмент з'явиться в Ч2.
- Матеріали — реєстр `lib/constants/map-art/materials.ts`: `floor` (стартово перевикористовує 90 ground-текстур і 6 wallfill), `wall` (текстура вздовж + `cap`/кутовий спрайт), `opening` (спрайти дверей/вікон/ґрат, намальовані горизонтально; рендер повертає).
- **Одне джерело правди:** на Save зі сцени виводяться `map.walls`, `map.bars`, `map.doors`, `blocked` (чиста функція `deriveMechanics(scene, grid)`). Бій, snapshot і мутації не змінюються.

### 3.2 Painter (`lib/utils/canvas/map-art/*`)
Чисті функції над `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`; той самий код для прев'ю й запікання.
- **Підлоги:** текстура у світових координатах (`createPattern` + `setTransform` з seeded поворотом/зсувом на регіон матеріалу), без швів по клітинках. Межі матеріалів м'які: маска з шумом шириною ~0.3 клітинки (розвиток `drawGroundBlend`). Гекс — clip по `hexPolygon`.
- **Стіни:** ребра склеюються в ланцюги (`wallRuns(scene, grid)`). Кожен сегмент — смуга товщиною ~0.25 клітинки; текстура повертається вздовж сегмента. На кутах і Т-стиках — колона або кутовий спрайт (`cap`), на кінцях — торець. Тінь назовні (`shadowBlur`/`shadowOffset`) і AO-градієнт уздовж внутрішнього боку.
- **Отвори:** вікна, ґрати й решітки запікаються в проріз стіни під кутом сегмента. **Двері не запікаються** — проріз лишається, а двері живо малює `DoorsLayer` (стан змінюється в бою).
- **Світло:** шар темряви (`ambient.darkness`, `multiply`) + радіальні градієнти (`lighter`) у точках `lights`. У v1 без оклюзії стінами.

### 3.3 Запікання
- Кнопка «Запекти» і автозапікання на Save, якщо `sceneVersion > bakedSceneVersion`.
- У браузері DM: `OffscreenCanvas` ≈140 px на клітинку з обмеженням 8192 px по більшій стороні (менші карти — більше px) → WebP (якість 0.85) → наявний upload у бакет `battle-maps` → фон карти з `backgroundCols/Rows` рівно під сітку (`gridForCellSize`), без калібрування.
- У бою це звичайний фон: рантайм не платить нічого, `TileCanvas` для таких карт не монтується.
- Великі файли: якщо WebP > 4 MB, понижуємо px/клітинку. Egress: одне зображення на карту, кешоване CDN.

### 3.4 Редактор
- Нова вкладка «Арт» у `MapEditorScreen` (замість «Тайли»). Інструменти:
  - **Підлога** — пензель 1–3 і заливка;
  - **Стіни** — лінія вздовж ребер, «кімната» (прямокутник/регіон з авто-периметром), гумка;
  - **Отвори** — клік на ребро зі стіною: двері / вікно / ґрати / решітка;
  - **Світло** — поставити, перетягнути, радіус, колір;
  - **Ambient** — тон і темрява.
- Прев'ю — живий painter на Canvas з кешем по chunk'ах (за зразком `chunk-cache.ts`). Працює на квадраті й гексі; desktop-only, як тайловий редактор.
- Хуки `lib/hooks/battle-maps/` (`useMapArtEditor`, `useMapArtSave`, `useMapArtBake`), API `app/api/campaigns/[id]/maps/[mapId]/art/route.ts` (GET/PUT сцени, ETag за `sceneVersion`), клієнт `lib/api/battle-maps.ts`.
- Тайловий редактор: шари `edge-art`/`effects`/`wallfill` з палітри зникають. Ground/objects-ассети стають матеріалами. **Перед планом 1b перевірити на проді** (read-only, за «так» власника), чи є рядки з непорожнім `battle_map_chunks.tileLayers`. Якщо немає — тайловий редактор замінюється без конвертера; якщо є — додається одноразовий конвертер `ground → floors`, `objects` лишаються тайлами до Ч2.
- Feature flag: `campaigns.mapLibraryEnabled` (як етапи 0/D/E).

### 3.5 Тести
- `deriveMechanics`: стіни/двері/ґрати/blocked для обох сіток.
- `wallRuns`: склейка, кути, Т-стики, гекс.
- Painter: smoke на `OffscreenCanvas` (happy-dom/канвас-мок) — кількість викликів `drawImage`/`rotate` за сценою; запікання обмежує розмір.
- Схема сцени: межі розмірів, невідомі матеріали, ключі ребер не тієї сітки.
- API: доступ лише DM (`requireDM`, `loadOwned`), ETag-конфлікт → 409.

## 4. Перевикористання

`grid/hex.ts` (`hexPolygon`, `hexCenter`, `hexNeighbors`, `hexLine`), `grid/layout.ts` (`gridMetrics`, `mapPixelSize`, `cellAtScreenPoint`), `grid/background.ts`, `grid/region-path.ts`, `tiles/rle.ts` і формат chunk'ів, `tiles/variant.ts` (seeded), `painter.ts drawGroundBlend`, `tiles/chunk-cache.ts`, `background-upload.ts`, `WallsLayer`/`DoorsLayer`/`EdgeEditor`, `useBattleMapEditor`, `lib/utils/api` (`parseBody`, `loadOwned`, `requireDM`, `errorResponse`), прапорець `mapLibraryEnabled`.

## 5. Ризики й рішення

- **Широка поверхня механіки на гексах** (багато споживачів ребер) → у 1a спершу переводимо `walls.ts`/`edges.ts` на `edge-keys.ts`, потім ідемо по споживачах. Battle-sweep на prodcopy обов'язковий.
- **Запікання великих карт** (200×200 → 8192 px = 41 px/клітинку) → якість падає, але карти >100×100 рідкісні; поріг і px/клітинку фіксуються в плані після вимірювань.
- **Стильова якість залежить від ассетів** → у Ч1b працюємо на наявних текстурах; справжній стрибок якості дадуть Ч2 (AI-ассети) і Ч4 (полірування).

## 6. Перевірка

- Під час роботи `pnpm test:related`; у кінці частини повний `pnpm test:run`, `tsc`, `pnpm cycles`, lint по теках.
- Battle-sweep на prodcopy (за «так»).
- Живий прогін на `next start`:
  - 1a: гекс-карта зі стінами/дверима/ґратами — шлях, видимість, туман, двері відчиняє гравець; вертикальні двері на квадраті й діагональні на гексі зі спрайтом під правильним кутом;
  - 1b: сцена 30×30 і 100×100 (квадрат і гекс), час запікання, вигляд у бою на desktop і 375 px.
