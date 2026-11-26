# Карти бою Ч2 — штампи + пайплайн ассетів. План

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (рекомендовано) або superpowers:executing-plans. Кроки — чекбокси `- [ ]`.

**Goal:** вільні штампи в арт-сцені (позиція/поворот/масштаб/flip/z/тінь, опційне блокування клітинок), реєстр із CSV, редактор, пайплайн ассетів (промпти 4 біомів, нарізка аркушів), конвертер тайлових `objects` → штампи.

**Architecture:** `scene.stamps: MapArtStamp[]` (v лишається 1, без міграції). Механіка виводиться чистою `stampBlockedCells` усередині `deriveMechanics`. Painter малює штампи трьома шарами між підлогами/стінами/світлом тим самим кодом для прев'ю й запікання. Реєстр `lib/constants/map-art/stamps.ts` читає згенерований `stamps-data.ts`; єдине джерело — `docs/assets/stamp-prompts/stamps.csv`.

**Tech Stack:** Next.js 16, React 19, TS strict, Zod, Canvas 2D (`ArtCtx`), sharp (скрипти), vitest (+ happy-dom для хуків/UI).

**Spec:** `docs/superpowers/specs/2026-11-26-map-art-ch2-stamps-design.md` (затверджений). Епік: `2026-11-26-map-art-epic-design.md`.

## Global Constraints

- Робоча тека `/Users/silentfox/Work/dnd-tracker-stamps`, гілка `feat/map-art-ch2`. Головну теку `/Users/silentfox/Work/dnd-tracker` не чіпати.
- **Агенти тести не запускають** (лише пишуть). Один повний `pnpm test:run` + `tsc` + `pnpm cycles` + `pnpm lint:dirs --changed main` у Task 7. Під час роботи дозволено `pnpm exec tsc --noEmit -p .` лише в Task 7.
- Коміти: `git add <конкретні шляхи>`, трейлер `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; один коміт на задачу (можна 2–3 для великих).
- Коментарі — англійською, мінімальні. Кирилиця в коді заборонена (ESLint), тексти — `messages/{uk,en}/maps.json`.
- Шари: компоненти не імпортують `@/lib/api/*`; логіка в хуках (`lib/hooks/battle-maps/`), чисте — в `lib/utils/`. `lib/utils` не імпортує `lib/server`. Шляхи через `@/`.
- Ліміти: `MAP_ART_LIMITS.stamps = 2000`; тіло ≤ `MAP_ART_LIMITS.bodyBytes` (2 MB); `id` ≤ 40; `scale` 0.25..4; `rot` 0..<360; `z` ціле; блоковані клітинки (`scene.blocked` ∪ штампи) ≤ `MAP_LIMITS.maxTerrainCells` (3600).
- Ассет ≤ 200 KB, WebP, 256 px на клітинку, `public/assets/map-stamps/<biome>/<id>.webp`. 35 наявних — без копіювання, з `public/assets/battle-tiles/objects/tiles_<key>.png`.
- Бій/snapshot/мутації не змінюються (читають `map.blocked`). У бою ассети штампів не вантажаться.
- Desktop-only, як уся вкладка «Арт»; `whats-new` не потрібен.

## Review Focus

1. **Штамп на краю/за межами карти після resize** — `clipScene` прибирає штампи з центром поза картою; виведені клітинки поза картою відкидаються (тест у Task 1).
2. **Повернутий прямокутник `blocks` на гексі** — центр гекс-клітинок не на цілій сітці; правило «центр клітинки всередині фігури + клітинка з центром штампа завжди» (тест квадрат + гекс у Task 1).
3. **`blocks`-штампи вичерпують ліміт 3600** або перекривають усю карту → схема відхиляє (`tooManyBlocked`) і `hasPlayableArea` рахує вже об'єднані клітинки (Task 1).
4. **Невідомий `asset`** у збереженій сцені (ассет видалено з реєстру) — схема відхиляє при Save, але painter/редактор не падають на вже збереженому рядку: штамп пропускається (Task 3, Task 4).
5. **Прозорі пікселі не перехоплюють клік** — клік по прозорому куту дерева виділяє штамп під ним (`alphaHit`, Task 4).

## Рішення плану (уточнення spec)

- **Тінь** — не через offscreen-силует, а через `ctx.shadowColor/shadowBlur/shadowOffset*` під час `drawImage` (як `paint-walls.ts:55`): canvas сам бере альфу спрайта, зсув у device-space не обертається разом зі штампом (єдиний напрям світла), кеш не потрібен. Параметри: `soft` — blur `0.25·cellPx`, offset `(0.03, 0.05)·cellPx`, alpha 0.45; `hard` — blur `0.08·cellPx`, offset `(0.08, 0.12)·cellPx`, alpha 0.55. Для `decal` тінь завжди вимкнена.
- **Розмір «клітинки» на гексі** = `cellPx` (UNIT), як і для світла; `cols/rows` — у UNIT.
- **Невідомий ассет у painter/редакторі** — штамп пропускається мовчки (дані могли пережити видалення з реєстру).
- **Конвертер** (Task 6) після `fix/map-art-tails` мусить працювати і з картами, що **вже мають** арт-рядок (на проді обидві карти отримають його в tails): окремий режим `--objects` додає штампи в наявну сцену. Деталі й умови — в Task 6.
- `deriveMechanics(scene, map: MapDims)` замість `grid` (потрібні розміри для відкидання клітинок поза картою).

## Карта файлів

| Файл | Що |
|---|---|
| `types/battle-map.ts` | `MapArtStamp`, `stamps: MapArtStamp[]` |
| `lib/constants/map-art/stamps.ts` (новий) | `StampDef`, `STAMP_BIOMES`, `STAMPS`, `stampDef(id)`, `stampUrl(def)` |
| `lib/constants/map-art/stamps-data.ts` (генерований) | `STAMP_DATA: readonly StampDef[]` |
| `lib/schemas/map-art.ts` | `stampSchema`, ліміт, refine |
| `lib/utils/battle/map-art/stamp-cells.ts` (новий) | `stampBlockedCells`, `stampFootprintContains` |
| `lib/utils/battle/map-art/stamp-geometry.ts` (новий) | `stampBox`, `stampCorners`, `toStampLocal` (спільне для painter, dirty, hit-test) |
| `lib/utils/battle/map-art/{derive,scene,dirty,index}.ts` | зміни |
| `lib/utils/canvas/map-art/paint-stamps.ts` (новий), `paint-scene.ts`, `assets.ts` | painter |
| `lib/utils/canvas/map-art/alpha-mask.ts` (новий) | `buildAlphaMask`, `alphaHit` |
| `lib/hooks/battle-maps/useMapArtEditor.ts`, `useStampSelection.ts` (новий), `useStampPalette.ts` (новий) | стан і дії |
| `components/battle/map/art/ArtStampsLayer.tsx` (новий), `battle-map-types.ts`, `MapStage.tsx` | оверлей на канві |
| `components/maps/editor/art/{ArtToolBar,ArtPanel}.tsx`, `StampPalette.tsx`, `StampControls.tsx` (нові) | UI |
| `docs/assets/stamp-prompts/{README.md,stamps.csv,stamps.md}` | маніфест і промпти |
| `scripts/assets/stamps/{csv,build,prompts,slice,validate,run}.ts` | пайплайн; `package.json` `assets:stamps` |
| `scripts/maps/lib/objects-to-stamps.ts` (новий), `convert-map.ts`, `convert-tiles-to-art.ts` | конвертер |

---

### Task 1: Модель, схема, механіка

**Files:**
- Modify: `types/battle-map.ts`, `lib/schemas/map-art.ts`, `lib/utils/battle/map-art/{derive,scene,compose,index}.ts`, `components/maps/MapEditorScreen.tsx:168`
- Create: `lib/utils/battle/map-art/stamp-geometry.ts`, `lib/utils/battle/map-art/stamp-cells.ts`, `lib/constants/map-art/stamps.ts` (лише тип + порожній каркас, дані — Task 2)
- Test: `lib/utils/battle/map-art/__tests__/{stamp-cells,stamp-geometry,derive}.test.ts`, `lib/schemas/__tests__/map-art.test.ts` (наявний — доповнити)

**Interfaces — Produces:**

```ts
// types/battle-map.ts
export interface MapArtStamp { id: string; asset: string; x: number; y: number; rot: number; scale: number; flip: boolean; z: number }
// MapArtScene.stamps: MapArtStamp[]

// lib/constants/map-art/stamps.ts
export type StampBiome = 'dungeon' | 'building' | 'nature' | 'settlement';
export type StampLayer = 'decal' | 'object' | 'canopy';
export interface StampBlocks { shape: 'rect' | 'ellipse'; w: number; h: number }
export interface StampDef { id: string; biome: StampBiome; category: string; nameKey: string; file: string; cols: number; rows: number; layer: StampLayer; shadow: 'none' | 'soft' | 'hard'; blocks?: StampBlocks; priority: 1 | 2 }
export const STAMP_BIOMES: readonly StampBiome[];
export const STAMPS: readonly StampDef[];          // = STAMP_DATA
export function stampDef(id: string): StampDef | undefined;
export const isStampId: (id: string) => boolean;

// stamp-geometry.ts (map units; UNIT = 1 cell)
export interface StampBox { cx: number; cy: number; w: number; h: number; rot: number } // w/h = cols·UNIT·scale
export function stampBox(s: MapArtStamp, def: Pick<StampDef, 'cols' | 'rows'>): StampBox;
export function stampCorners(b: StampBox): [number, number][];              // 4 повернуті кути
export function stampAabb(b: StampBox): { x0: number; y0: number; x1: number; y1: number };
export function toStampLocal(b: StampBox, p: { x: number; y: number }): { u: number; v: number }; // 0..1 у системі спрайта, без flip

// stamp-cells.ts
export function stampFootprintContains(s: MapArtStamp, blocks: StampBlocks, p: { x: number; y: number }): boolean;
export function stampBlockedCells(stamps: readonly MapArtStamp[], map: MapDims, lookup?: (id: string) => StampDef | undefined): Set<string>;

// derive.ts
export function deriveMechanics(scene: MapArtScene, map: MapDims): DerivedMechanics;
```

Алгоритм `stampBlockedCells`: для кожного штампа з `def.blocks` — AABB footprint (`w·scale × h·scale` UNIT, повернутий) → діапазон кандидатів через `gridMetrics(grid)` (`colStep/rowStep`, +1 клітинка запасу) → для кожної клітинки в межах карти `cellCenter(p, grid)` у фігурі (строго всередині, щоб центр на межі не блокувався: rect `|u| < W/2−ε && |v| < H/2−ε` після оберту на `−rot`; ellipse `(u/(W/2))²+(v/(H/2))² < 1−ε`, ε=1e-6) → `cellKey`. Плюс клітинка, що містить центр штампа, якщо в межах: додати в `layout.ts` `cellAtUnitPoint(p, grid): GridPoint` = hex → `hexPointToCell(p.x, p.y)` (`grid/hex.ts:169`), square → `{ x: floor(p.x/UNIT), y: floor(p.y/UNIT) }` (та сама логіка, що в `cellAtScreenPoint`, без матриці) + тест. Гекс flat-top: `HEX_R = 50`, `HEX_H ≈ 86.6`, відстань між сусідами = 86.6, не 100. Flip ігнорується.

Схема:

```ts
const stampSchema = z.object({
  id: z.string().min(1).max(40), asset: z.string().max(60),
  x: z.number().finite(), y: z.number().finite(),
  rot: z.number().min(0).lt(360), scale: z.number().min(0.25).max(4),
  flip: z.boolean(), z: z.number().int().min(-1000).max(1000),
});
// mapArtSceneSchema.stamps: z.array(stampSchema).max(MAP_ART_LIMITS.stamps)
```

`refineSceneForMap` додає: `unknownStamp` (`!isStampId`), `outOfBounds` для `x/y` поза `mapSize(map, grid)`, `duplicateStamp`, `tooManyBlocked` (розмір `scene.blocked ∪ stampBlockedCells` > `maxTerrainCells`); `hasPlayableArea` отримує об'єднаний список. Ключі `maps.editor.art.validation.{unknownStamp,duplicateStamp,tooManyBlocked}` — у `messages/{uk,en}/maps.json`.

`deriveMechanics`: `blocked = sorted(new Set([...Object.keys(scene.blocked), ...stampBlockedCells(scene.stamps, map)]))`; `grid = gridOf(map)`. Виклики: `compose.ts` → `deriveMechanics(scene, save.map)`; `MapEditorScreen.tsx:168` → `deriveMechanics(artScene, map)`.

`clipScene`: `stamps = scene.stamps.filter(s => s.x >= 0 && s.y >= 0 && s.x <= size.width && s.y <= size.height)` (той самий `size`, що для світла); включити в перевірку «нічого не змінилось».

- [ ] **Step 1: Тести** (`stamp-cells.test.ts`, мок-lookup з двома def: `rect 2×1`, `ellipse 2×2`):
  - square 10×10, rect 2×1 у `(300, 250)`, rot 0 → `{"2:2","3:2"}`; rot 90 → `{"3:2"}` (центри x=250/350 рівно на межі — виключені; лишається клітинка з центром штампа, `floor(300/100)=3`);
  - rect 2×1 у `(100, 50)` (як legacy table-long у `0:0`) → `{"0:0","1:0"}`; rect 1×1 у центрі клітинки → рівно ця клітинка;
  - rect 1×1 scale 2 у `(300, 300)` → `{"2:2","3:2","2:3","3:3"}`; ellipse 2×2 у `(300, 300)` → ті самі 4 (відстань центрів √2·50 < 100);
  - штамп `blocks` 0.2×0.2 → рівно клітинка з центром штампа;
  - штамп біля краю → лише клітинки в межах карти; штамп без `blocks` → порожньо;
  - hex 10×10: rect 1×1 у центрі клітинки `3:3` → `{"3:3"}`; ellipse 2.5×2.5 (радіус 125: кільце 1 на 86.6 — всередині, кільце 2 від 150 — ні) → клітинка + 6 сусідів (`neighbors`);
  - `flip` не змінює результат.
- [ ] **Step 2:** `derive.test.ts`: `scene.blocked` ∪ штампи, сортування, дублі зливаються; клітинки поза картою відкидаються.
- [ ] **Step 3:** схема: невідомий asset, дубль id, `scale` 0.2/4.1, `rot` 360, `z` 1.5, 2001 штамп → помилка; тіло: 2000 штампів < 2 MB (рахувати `JSON.stringify().length`); `tooManyBlocked` (сцена з 3600 `blocked` + один `blocks`-штамп на нову клітинку); `clipScene` відкидає штамп за межами й повертає той самий об'єкт, якщо нічого не змінилось.
- [ ] **Step 4:** реалізація. `lib/constants/map-art/stamps.ts` поки експортує `STAMPS = STAMP_DATA` з порожнього `stamps-data.ts` (`export const STAMP_DATA: readonly StampDef[] = []`), тести використовують `lookup`-параметр.
- [ ] **Step 5:** коміт `feat(map-art): stamp model, schema and derived blocking`.

---

### Task 2: Реєстр + CSV-маніфест + build, 35 наявних об'єктів

**Files:**
- Create: `docs/assets/stamp-prompts/stamps.csv` (поки 35 рядків legacy), `scripts/assets/stamps/csv.ts`, `scripts/assets/stamps/build.ts`, `lib/constants/map-art/stamps-data.ts` (генерований), `lib/constants/map-art/__tests__/stamps.test.ts`, `scripts/assets/stamps/__tests__/csv.test.ts`
- Modify: `lib/constants/map-art/stamps.ts` (`package.json`-скрипт `assets:stamps` додається в Task 5 разом із `run.ts`; тут `build` запускається як `pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/stamps/build.ts`)

**Interfaces — Produces:**

```ts
// scripts/assets/stamps/csv.ts
export interface StampRow { file: string; name: string; biome: StampBiome; category: string; layer: StampLayer; cols: number; rows: number; shadow: 'none'|'soft'|'hard'; blocks: StampBlocks | null; prompt: string; priority: 1 | 2 }
export function parseStampsCsv(text: string): StampRow[];          // кидає з номером рядка
export function parseBlocks(v: string): StampBlocks | null;        // '' | 'rect:2x1' | 'ellipse:1.6x1.6'
export function rowToDef(row: StampRow): StampDef;
export function renderStampsData(defs: readonly StampDef[]): string; // детермінований TS-текст (prettier-стиль 4 пробіли)
```

Правила `rowToDef`:
- `file` виду `tiles_<key>.png` → legacy: `id = key`, `file = '/assets/battle-tiles/objects/tiles_<key>.png'`, `nameKey = 'tileLabels.<key>'` (усі 35 назв є в `messages/{uk,en}/tileLabels.json`; `TILE_CATALOG.nameKey` вказує на `maps.editor.tiles.name.*`, де більшості ключів немає — не використовувати), `cols/rows` у CSV мають збігатися з `footprint` каталогу (перевірка в тесті).
- Інакше `id = basename без .webp`, `file = '/assets/map-stamps/<biome>/<id>.webp'`, `nameKey = 'maps.editor.stamps.name.<id>'`.
- CSV-парсер: наявного парсера CSV у репо немає (перевірити `grep -rn "parseCsv\|csv-parse" lib scripts`); якщо немає — мінімальний RFC4180 (лапки, `""`), без залежностей.

Legacy-рядки (35): `biome/category/layer/shadow/blocks` за таблицею нижче; `blocks` = `rect:<cols>x<rows>` для непрохідних (`TILE_CATALOG` `blocks: true`), порожньо для `cobweb, stairs-down, stairs-up` та decal-ів; `prompt` — опис із `docs/assets/tile-prompts/tiles.csv` (частина після `The object: `); `priority` 1.

| biome | ключі (layer object, shadow soft, якщо не вказано) |
|---|---|
| dungeon | altar, bones (decal, none, без blocks), brazier, cauldron, cobweb (decal, none), grave, pillar (hard), rubble-pile, stairs-down (decal, none), stairs-up (decal, none), statue (hard), trapdoor (decal, none), treasure-pile, blood-stain (decal, none, без blocks) |
| building | anvil, barrel, bed, bookshelf, chair, chest-closed, chest-open, crate, stool, table-long, table-round |
| nature | boulder (hard), bush, rock-small, tree-oak (canopy), tree-pine (canopy), campfire |
| settlement | cart, fountain, tent, well |

Сума = 35 (14 + 11 + 6 + 4). **Механіка legacy = механіка каталогу** (інакше конвертер змінить бій на наявних картах): `blocks = rect:<cols>x<rows>` рівно для тих ключів, де в `TILE_CATALOG` `blocks: true` (усі, крім `passable`: `blood-stain, bones, cobweb, stairs-down, stairs-up`). Тобто `trapdoor` — decal **з** `rect:1x1`, дерева — canopy з `rect:2x2`. Footprint — з каталогу (`bed` і `cart` — `WIDE` 2×1, `fountain/tent/tree-*` — `BIG` 2×2, решта 1×1), навіть якщо промпт тайла каже інакше. Тест Task 2 перевіряє цю рівність.

- [ ] **Step 1: Тести** `csv.test.ts`: лапки й коми в prompt; `parseBlocks` валідні/невалідні; помилка з номером рядка для невідомого `biome`/`layer`; `rowToDef` legacy і new.
- [ ] **Step 2: Тести** `stamps.test.ts`: `renderStampsData(buildDefs(parseStampsCsv(csv), existsInPublic)) === readFileSync(stamps-data.ts)` (CSV — джерело правди; `buildDefs(rows, exists)` — спільна функція `csv.ts`, що відкидає рядки без файла, її ж викликає `build.ts`); legacy `blocks` ⇔ `TILE_CATALOG.blocks`; файл кожного def існує в `public/`; id унікальні; `blocks.w ≤ cols && blocks.h ≤ rows`; legacy `cols/rows` = `footprint` каталогу; кожен `nameKey` є в `messages/en` і `messages/uk` (через наявний хелпер тестів i18n-ключів — знайти в `lib/__tests__` за `messages`).
- [ ] **Step 3:** `build.ts`: читає CSV → пише `stamps-data.ts` (`--check` — лише порівняння, exit 1). Згенерувати файл.
- [ ] **Step 4:** коміт `feat(map-art): stamp registry generated from CSV (35 legacy objects)`.

---

### Task 3: Painter штампів + dirty + завантаження ассетів

**Files:**
- Create: `lib/utils/canvas/map-art/paint-stamps.ts`, `lib/utils/canvas/map-art/__tests__/paint-stamps.test.ts`
- Modify: `paint-scene.ts`, `assets.ts` (`artTextureUrls` додає `def.file` використаних штампів), `lib/utils/battle/map-art/dirty.ts`, `__tests__/dirty.test.ts`

**Interfaces — Produces:**

```ts
export function orderedStamps(stamps: readonly MapArtStamp[], layer: StampLayer, lookup = stampDef): { s: MapArtStamp; def: StampDef }[]; // z, потім y, потім id
export function paintStamps(env: PaintEnv, layer: StampLayer): void;
```

`paintScene`: `paintFloors → paintStamps('decal') → paintWalls → paintOpenings → paintStamps('object') → paintStamps('canopy') → paintLight`.

`paintStamps`: для кожного — `img = env.assets.get(def.file)`; немає → skip. Box у px = `stampBox` × `env.k`; пропуск, якщо `!touches(env.clip, aabb…, 0)`. `ctx.save(); translate(cx,cy); rotate(rot·π/180); if (flip) scale(-1,1); shadow (див. «Рішення плану»); drawImage(img, -w/2, -h/2, w, h); ctx.restore()`.

`dirtyChunks`: штампи з `prev.stamps !== next.stamps` → мапа `id → stamp` для обох; для кожного id, де об'єкти різні (порівняння полів), додати чанки AABB старого й нового (через `stampBox`+`stampAabb`, UNIT→клітинки через `gridMetrics(grid).colStep/rowStep`, далі `addCell` для кутів діапазону — `addAround` вже додає ±1 chunk запасу на тінь). Невідомий ассет → `cols=rows=1`. Сигнатура `dirtyChunks(prev, next, grid)` не змінюється.

- [ ] **Step 1: Тести** `paint-stamps.test.ts` на мок-ctx (записує виклики `drawImage/rotate/scale/save/restore` і значення `shadowBlur` у момент `drawImage`; патерн моку взяти з наявних тестів `lib/utils/canvas/map-art/__tests__`):
  - порядок: сцена з decal/object/canopy + стіна → послідовність малювання `decal < wall-stroke < object < canopy` (через `paintScene` з моками);
  - сортування z → y → id;
  - `clip` поза штампом → 0 `drawImage`; повернутий штамп, чий AABB перетинає clip, — малюється;
  - `flip` → `scale(-1, 1)`; `shadow: 'none'` → `shadowBlur 0`; `soft` → `0.25·cellPx`; decal завжди 0;
  - невідомий ассет / незавантажене зображення → пропуск без винятку.
- [ ] **Step 2: Тести** `dirty.test.ts`: переміщення штампа на іншу частину 64×64 карти → чанки старого й нового місця; поворот 2×1 на 90° біля межі чанка → обидва чанки; незмінні штампи (новий масив, ті самі значення) → порожньо; `artTextureUrls` містить файл використаного штампа і не містить невикористаних.
- [ ] **Step 3:** реалізація; коміт `feat(map-art): stamp painter, dirty chunks and asset loading`.

---

### Task 4: Редактор

**Files:**
- Create: `lib/hooks/battle-maps/useStampSelection.ts`, `lib/hooks/battle-maps/useStampPalette.ts`, `lib/utils/canvas/map-art/alpha-mask.ts`, `components/battle/map/art/ArtStampsLayer.tsx`, `components/maps/editor/art/StampPalette.tsx`, `components/maps/editor/art/StampControls.tsx`
- Modify: `lib/hooks/battle-maps/useMapArtEditor.ts` (`ArtTool`, дії), `lib/hooks/battle-maps/index.ts`, `components/battle/map/battle-map-types.ts` (`ArtPreviewState.stamps`), `components/battle/map/MapStage.tsx` (рендер шару поруч з `ArtLightsLayer`, рядок ~197), `components/maps/MapEditorScreen.tsx` (~213–225, передача `stamps` для `artTool ∈ {stamp, stamp-select}`), `components/maps/editor/art/{ArtToolBar,ArtPanel}.tsx`, `messages/{uk,en}/maps.json`
- Test: `components/maps/editor/art/__tests__/useMapArtEditor.test.tsx` (доповнити), `lib/hooks/battle-maps/__tests__/useStampSelection.test.tsx`, `lib/utils/canvas/map-art/__tests__/alpha-mask.test.ts`, `components/maps/editor/art/__tests__/StampPalette.test.tsx`

**Interfaces — Produces:**

```ts
// useMapArtEditor: ArtTool += 'stamp' | 'stamp-select'; повертає
stamps: {
  asset: string | null; setAsset(id: string | null): void;
  snap: boolean; setSnap(v: boolean): void;
  showAllBlocking: boolean; setShowAllBlocking(v: boolean): void;
  ghost: { rot: number; flip: boolean }; rotateGhost(dir: 1 | -1): void; flipGhost(): void;
  selectedId: string | null; select(id: string | null): void;
  place(at: { x: number; y: number }): void;                // snap → cellCenter(cellAtUnitPoint(at)); новий id = `s${Date.now().toString(36)}${n}` (≤40), z = max(z шару)+1
  update(id: string, patch: Partial<Omit<MapArtStamp, 'id'>>, coalesceKey?: string): void; // нормалізація rot у [0,360), clamp scale, x/y у межах карти
  remove(id: string): void; duplicate(id: string): void;    // копія зі зсувом +0.5 клітинки, виділяється
  reorder(id: string, dir: 1 | -1): void;                   // z ± 1
}
// Ліміт 2000 → place/duplicate нічого не роблять і ставлять lastNotice (ключ maps.editor.stamps.limit), як MAX_LIGHTS.

// alpha-mask.ts
export interface AlphaMask { w: number; h: number; data: Uint8Array } // 1 = непрозорий (alpha > 32)
export function buildAlphaMask(img: CanvasImageSource, size?: number /* 64 */): AlphaMask | null;   // OffscreenCanvas/getImageData; null, якщо недоступно
export function alphaHit(mask: AlphaMask | null, u: number, v: number): boolean;                   // null → true (bbox-hit)

// useStampSelection(scene, editing) — чистий стан жестів поверх editor.stamps:
export function pickStamp(stamps: readonly MapArtStamp[], at: {x:number;y:number}, masks: (asset: string) => AlphaMask | null, lookup = stampDef): string | null;
// найвищий у порядку малювання (canopy > object > decal, далі зворотний orderedStamps), всередині bbox і alphaHit(toStampLocal з урахуванням flip)
export function useStampSelection(args: { stamps: MapArtStamp[]; api: EditorStamps; masks: ... }): {
  onPointerDown(at, e): void; onPointerMove(at): void; onPointerUp(): void;   // drag = update(..., 'stamp-move:<id>')
  onRotateHandle(at): void;            // кут від центру, крок 15° із Shift; coalesce 'stamp-rot:<id>'
  onScaleHandle(at): void;             // відстань від центру / початкова; coalesce 'stamp-scale:<id>'
  onWheel(deltaY): void;               // scale ×1.1^sign; stopPropagation, щоб не зумити мапу
  onKey(e: KeyboardEvent): boolean;    // R / Shift+R (±15°), F, Delete/Backspace, Cmd/Ctrl+D, [ / ]; true = оброблено
}
```

`ArtStampsLayer` (SVG у map units, як `ArtLightsLayer`; `svgPoint` винести зі `ArtLightsLayer` у спільний `components/battle/map/art/svg-point.ts`):
- режим `stamp`: прозорий `<rect>` на всю карту ловить `pointermove` (привид `<image href=def.file opacity=0.6>` з тим самим transform, що painter) і `click` → `place`;
- режим `stamp-select`: прозорий rect ловить `pointerdown` → `pickStamp`; виділений — пунктирний повернутий прямокутник (`stampCorners`), ручка повороту (коло над верхньою стороною), ручка масштабу (правий нижній кут);
- оверлей блокування: полігони `cellPolygon` для `stampBlockedCells([selected])` або для всіх штампів, якщо `showAllBlocking`;
- клавіші: `useEffect` keydown на `window`, коли інструмент активний і фокус не в input (наявний патерн гарячих клавіш редактора — знайти `useHotkeys`/`keydown` у `components/maps`).

Маски: `useStampSelection` будує `buildAlphaMask` ліниво для ассетів сцени з тих самих `loadArtAssets` (кеш у `assets.ts` уже є — додати `loadedImage(url)` getter без нового завантаження).

`StampPalette`: вкладки біомів (`STAMP_BIOMES`), селект категорій, пошук за перекладеною назвою; сітка мініатюр `<img src={def.file} loading="lazy">` (не `next/image`: статичні локальні файли в редакторі — так само робить наявна палітра тайлів; перевір і повтори її підхід); дані фільтрації — `useStampPalette(t)` (хук повертає `{ biome, setBiome, category, setCategory, query, setQuery, items }`). `StampControls` (для виділеного): поворот/масштаб числами, flip, z ±, дублювати, видалити, «snap», «показати блокування всіх».

Назви: `def.nameKey` — повний ключ із двох namespace (`tileLabels.<key>` для legacy, `maps.editor.stamps.name.<id>` для нових); обидва namespace вже є в route-scope редактора (`lib/i18n/route-scopes.ts:74`), перекладати кореневим `useTranslations()` без namespace.

i18n `maps.editor.stamps.*`: `tool`, `select`, `biome.{dungeon,building,nature,settlement}`, `category.<cat>` (усі категорії CSV), `search`, `snap`, `showBlocking`, `rotate`, `scale`, `flip`, `forward`, `backward`, `duplicate`, `delete`, `limit`, `empty`, `hints` (клавіші). Назви `name.<id>` — для нових штампів у Task 5.

- [ ] **Step 1: Тести** хука (`useMapArtEditor.test.tsx`, happy-dom): place (snap on/off), update + coalesce (два move з тим самим ключем → один крок undo), remove, duplicate (новий id, зсув, виділення), reorder, undo/redo, ліміт 2000 → notice; `rot` 370 → 10, `scale` 9 → 4.
- [ ] **Step 2: Тести** `alpha-mask.test.ts` (`alphaHit` на синтетичній масці: прозорий кут false, центр true, null → true, межі u/v 0/1); `pickStamp`: верхній за шаром/z, прозорий кут верхнього → нижній, flip віддзеркалює u, невідомий ассет ігнорується.
- [ ] **Step 3: Тести** `useStampSelection.test.tsx`: onKey R/Shift+R/F/Delete/Cmd+D/[/] викликають api з очікуваними аргументами; ввід у `<input>` → false; onRotateHandle зі Shift кратний 15.
- [ ] **Step 4: Тест** `StampPalette.test.tsx`: перемикання біому, пошук фільтрує, клік → `setAsset`.
- [ ] **Step 5:** реалізація + i18n; коміти `feat(map-art): stamp editor state and hit-test`, `feat(map-art): stamp palette, canvas layer and controls`.

---

### Task 5: Пайплайн ассетів + промпти 4 біомів

**Files:**
- Create: `docs/assets/stamp-prompts/README.md`, доповнити `stamps.csv` (4 біоми × 40–60 рядків, P1 ≈ 15–20 на біом), `docs/assets/stamp-prompts/stamps.md` (генерується), `scripts/assets/stamps/{prompts,slice,validate,run}.ts`, `scripts/assets/stamps/__tests__/{slice,validate,prompts}.test.ts`
- Modify: `package.json` (`assets:stamps`), `messages/{uk,en}/maps.json` (`maps.editor.stamps.name.<id>` для всіх нових рядків CSV)

**Важливо:** нові рядки CSV **не** потрапляють у `stamps-data.ts`, поки файла ассета немає. `build.ts`: рядок без файла в `public/` пропускається (лог `missing asset`), тест Task 2 «файл існує» лишається чесним. Тест на i18n перевіряє ключі лише для def'ів у реєстрі, плюс окремий тест: кожен рядок CSV має `name.<id>` в обох локалях.

**Interfaces — Produces:**

```ts
// prompts.ts
export const STAMP_STYLE_CORE: string; // ядро з tile-prompts (painterly fantasy, strictly top-down, soft contact shadow only — no cast shadow, flat #FF00FF)
export function sheetsOf(rows: readonly StampRow[]): { biome: StampBiome; priority: 1|2; rows: StampRow[] }[]; // групи ≤9 за CSV-порядком у межах biome+priority
export function sheetPrompt(sheet): string;   // 3×3, зліва направо згори вниз, проміжки ≥ 8% сторони, об'єкти не торкаються, кожен описаний із розміром у клітинках
export function renderStampsMd(rows): string; // → stamps.md

// slice.ts
export interface Rgba { width: number; height: number; data: Uint8Array } // raw RGBA (sharp .raw())
export function keyMagenta(img: Rgba, opts?: { threshold?: number /* 90 */; soft?: number /* 40 */ }): Rgba; // alpha за відстанню до #FF00FF + despill (зменшити R/B до G у краєвих пікселях) + erode 1px
export function components(img: Rgba, minArea?: number): { x0: number; y0: number; x1: number; y1: number; area: number }[]; // 8-зв'язність по alpha>0, порядок: рядки (кластеризація за y-центром з допуском 1/6 висоти), потім x
export function crop(img: Rgba, box, pad: number): Rgba;
export async function normalize(img: Rgba, cols: number, rows: number): Promise<Buffer>; // trim прозорих країв, contain у cols·256 × rows·256, WebP quality 85 → якщо > 200 KB, quality 70
export async function sliceSheet(file: string, rows: StampRow[], mapping?: number[]): Promise<{ row: StampRow; webp: Buffer }[]>; // кидає, якщо кількість компонент ≠ rows.length (злиті об'єкти)

// validate.ts
export type StampAssetError = 'not-webp' | 'no-alpha' | 'magenta-fringe' | 'too-large' | 'bad-size' | 'not-in-csv' | 'duplicate';
export async function validateStampAsset(file: string, row: StampRow | undefined): Promise<StampAssetError[]>;
// magenta-fringe: частка пікселів з alpha>0 і (R>200, B>200, G<80) > 0.2%; bad-size: сторони ≠ cols·256 × rows·256 (±2 px після trim — допуск trim: більша сторона = рівно цільова)
```

Перевикористати з `scripts/assets/tiles/validate.ts` перевірки MIME/альфи/`TILE_ASSET_MAX_BYTES` (імпорт, не копія; якщо функція внутрішня — винести експорт).

`run.ts` (`pnpm assets:stamps <cmd>`):
- `prompts` → пише `stamps.md`;
- `slice <sheet.png> --biome <b> --priority <1|2> --sheet <n> [--map 2,0,1,...]` → `public/assets/map-stamps/<biome>/<id>.webp` (без `--write` — лише звіт), потім `validate` для кожного;
- `validate [dir]` → усі файли `public/assets/map-stamps/**`;
- `build [--check]` → `stamps-data.ts`.
Аплоаду в хмару немає: ассети в репо (`--upload` зі spec = `slice --write`).

Промпти (контент): за §7 spec — P1 на біом ≈ 15–20 предметів (2 аркуші), P2 — решта до 40–60. Категорії: `furniture, container, light, plant, tree, rock, water, structure, decor, remains, vehicle, market`. Рядки, що вже покриті legacy (бочка, ящик, стіл…), у P1 не дублювати — нові варіанти (наприклад, «barrel-stack», «table-tavern-set»). Пілот (§7): перший аркуш кожного біому містить один з пілотних: `column-carved` (dungeon), `table-tavern-set`, `carpet-ornate` (decal) (building), `tree-willow` (canopy), `rock-mossy` (nature), `lantern-post` (settlement).

- [ ] **Step 1: Тести** `slice.test.ts`: синтетичний 300×300 магентовий аркуш (sharp `create` + `composite` з трьох кольорових кіл/прямокутників із 1-px рожевою каймою) → 3 компоненти в правильному порядку; `keyMagenta` → у результаті жодного пікселя, що проходить критерій `magenta-fringe`; два об'єкти, що торкаються → `sliceSheet` кидає `merged`; `normalize` 2×1 → 512×256 WebP.
- [ ] **Step 2: Тести** `validate.test.ts`: PNG → `not-webp`; WebP без альфи → `no-alpha`; неправильний розмір; файл без рядка CSV → `not-in-csv`. `prompts.test.ts`: групування по 9, порядок, у промпті немає «cast shadow», є `#FF00FF` і «8%».
- [ ] **Step 3:** реалізація скриптів, `README.md` (процес: згенерувати аркуш за `stamps.md` → `pnpm assets:stamps slice … --write` → переглянути → `build` → коміт), CSV + i18n назв, згенерувати `stamps.md`.
- [ ] **Step 4:** коміти `feat(assets): stamp sheet slicing and validation pipeline`, `docs(assets): stamp prompts for four biomes`.
- [ ] **Step 5 (власник, поза SDD):** пілот — згенерувати по одному аркушу на біом, прогнати `slice`, оцінити ключ/стиль. До пілоту в реєстрі лише 35 legacy — фіча працює без нових ассетів.

---

### Task 6: Конвертер `objects` → штампи

**Передумова (блокує задачу):** `fix/map-art-tails` злито в `main`, на проді конвертер ground/wallfill застосовано. Перед задачею: `git fetch && git rebase origin/main` (конфлікти лише в `scripts/maps/*` — пункт M6 tails додає лічильники в dry-run; зберегти обидва). Read-only підрахунок карт з `objects` на проді — лише за «так» власника (див. «Відкриті питання»).

**Files:**
- Create: `scripts/maps/lib/objects-to-stamps.ts`, `scripts/maps/lib/__tests__/objects-to-stamps.test.ts`
- Modify: `scripts/maps/lib/convert-map.ts`, `scripts/maps/lib/tiles-to-scene.ts` (`ART_LAYERS` + `'objects'` лише в режимі об'єктів — див. нижче), `scripts/maps/convert-tiles-to-art.ts`
- Test: наявні тести `scripts/maps/lib/__tests__` доповнити

**Interfaces — Produces:**

```ts
export interface ObjectsConversion { stamps: MapArtStamp[]; unknown: number; outside: number }
export function objectsToStamps(tileLayers: ChunkTileLayers, map: ConvertMap, existing: readonly MapArtStamp[]): ObjectsConversion;
// для кожної ненульової клітинки шару objects: def = tileDefinition(code) (layer 'objects') → stampDef(def.key); немає → unknown++.
// Якір тайла = верхня-ліва клітинка footprint (див. components/battle/map/tiles/painter.ts drawCell).
// Центр: square — ((x + cols/2)·UNIT, (y + rows/2)·UNIT); hex — cellCenter(якір) + ((cols-1)/2·colStep, (rows-1)/2·rowStep).
// id = `t${x}-${y}` (детермінований → ідемпотентність: id, що вже є в existing, пропускається); rot 0, scale 1, flip false, z 0.
```

Режими скрипта:
- без змін (за замовчуванням): карти **без** арт-рядка — як зараз + `scene.stamps = objectsToStamps(...)`; `objects` прибираються з CURRENT chunk'ів і нового snapshot разом з ground/wallfill (додати `'objects'` до strip-списку цієї гілки).
- `--objects`: карти **з** арт-рядком і непорожнім шаром `objects`: у транзакції `scene = {...scene, stamps: [...existing, ...new]}`, перевірка `mapArtSceneSchema` + ліміт блокованих (через `deriveMechanics` → `blocked.length ≤ maxTerrainCells`; інакше skip з причиною), `sceneVersion + 1`, `objects` прибираються з CURRENT chunk'ів і нового snapshot (`mapVersion + 1`, як `applyConversionTx`). Карти з **запеченим** артом (`bakedSceneVersion !== null`) за замовчуванням пропускаються з рядком `needs re-bake: <id> <name>` (після конвертації запечений фон був би без об'єктів, поки DM не збереже карту); `--include-baked` вмикає їх. **Механіка в тій самій транзакції:** сьогодні тайлові об'єкти блокують рух і погляд не через `map.blocked`, а через `deriveTileCells` під час завантаження бою (`lib/server/battles/store/load-battle.ts:198`, `useBattleMapFog.ts:51`). Якщо прибрати `objects` з chunk'ів і не записати клітинки, об'єкти перестануть блокувати до першого Save DM. Тому скрипт записує в header `blocked = sorted(header.blocked ∪ stampBlockedCells(newStamps, map))` (і в новий snapshot). Для `blocksSight` див. відкрите питання 3. Обидва режими (з арт-рядком і без) роблять це однаково. Тест: після `applyConversionTx` header.blocked містить footprint непрохідного об'єкта.
- Dry run друкує на карту: `objects N → stamps M · unknown U · outside O · new blocked B`.

Тайловий painter об'єктів не видаляти (лишаються карти без арт-рядка).

- [ ] **Step 1: Тести** `objects-to-stamps.test.ts`: barrel 1×1 у `3:4` → stamp у `(350, 450)`; table-long 2×1 у `0:0` → `(100, 50)`; невідомий код → `unknown`; повторний виклик з `existing` = результат → 0 нових (ідемпотентність); клітинка поза картою → `outside`.
- [ ] **Step 2: Тести** `convert-map`: `buildConversion` для карти з ground + objects → сцена має stamps і проходить `mapArtSceneSchema`; strip прибирає `objects` у режимі об'єктів; `buildObjectsConversion(existingScene, header, chunks)` повертає `null`, якщо шару `objects` немає.
- [ ] **Step 3:** реалізація; коміт `feat(maps): convert tile objects to art stamps`.
- [ ] **Step 4 (власник):** прод — лише після «так», резервної копії (`scripts/db/backup-database.sh`) і деплою Ч2: dry run → `--objects [--include-baked]` за рішенням власника.

---

### Task 7: Gates, живий прогін, документація

- [ ] **Step 1:** `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`, `pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/stamps/build.ts --check`, один повний `pnpm test:run` (перед цим `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`). Падіння — виправити й перезапустити лише `pnpm test:related <файли>`.
- [ ] **Step 2:** `/simplify` по diff гілки (1–2 агенти).
- [ ] **Step 3:** Живий прогін (субагент Sonnet, `next build && next start -p <вільний порт>`, локальна БД prodcopy за «так»; власник логіниться в Chrome розширення): квадрат 30×30 і гекс 30×30 — штампи всіх трьох шарів, поворот/масштаб/flip/z, дублювання й undo, `blocks`-штамп блокує шлях у бою, запекти, відкрити бій desktop і 500 px (мінімум Chrome); таблиця прогресу у звіті.
- [ ] **Step 4:** Battle-sweep на prodcopy — лише за «так».
- [ ] **Step 5:** Документація: `docs/architecture/` (файл про map-art — знайти через `docs/architecture/README.md`; розділ «Штампи»: модель, механіка, порядок шарів, пайплайн), `docs/STATUS.md` (Ч2, хвости: пілот, прод-конвертер), `git mv` spec/plan в `docs/archive/superpowers/` у merge-коміті.
- [ ] **Step 6:** Фінальний Opus-ревʼю всієї гілки; merge — за рішенням власника.

---

## Відкриті питання до власника

1. Read-only підрахунок карт з шаром `objects` на проді (зараз; з `DIRECT_URL` з `.env.production-db.local`, без запису) — так/ні?
2. Конвертер для вже запечених карт: за замовчуванням пропускати (рекомендую) чи конвертувати з умовою, що DM перезбереже карту?
3. **Погляд.** Непрохідні тайлові об'єкти сьогодні блокують і рух, і погляд (`blocksSight` у `deriveTileCells` → туман/видимість). Spec для штампів описує лише рух (`map.blocked` погляд не блокує). Варіанти: (а) додати в `StampDef` `sight?: boolean` і виводити ці клітинки в `map.terrain[k].blocksSight` (зачіпає `deriveMechanics`, `ArtMapPatch`, `composeArtSave`; +½ задачі в Task 1); (б) прийняти: штампи погляд не блокують, після конвертації колони/статуї/дерева стануть «прозорими». Рекомендую (а) — інакше конвертер змінює бій на наявних картах.
