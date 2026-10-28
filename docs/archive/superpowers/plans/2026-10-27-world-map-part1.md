# Карта світу, частина 1 — дані + редактор ДМ. План

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ створює кореневу карту континенту й вкладені карти, ставить точки й малює зони-королівства в редакторі `/campaigns/[id]/dm/world`; уся схема світу (включно з таблицями частини 2/3) уже в БД; локальний seed Ашана.

**Architecture:** Prisma-моделі `world_*` + `campaign_shows.world` однією expand-only міграцією. Картинки — прямий upload у bucket `world-maps` за підписаним URL (як слайди, через спільну фабрику). Тонкі routes → `lib/server/world/*-handlers.ts` → `map-store.ts`. Клієнт: `lib/api/world.ts` → `lib/hooks/world/` → `components/world/`. Рендер карти: `<Image>` + SVG (зони, `viewBox 0 0 1 1`) + HTML-піни, загальний `useViewport` (перенесений з бою, `maxZoom` параметром).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, Supabase Storage, TanStack Query, Zod, Vitest (+ happy-dom для компонентів), sharp (лише seed).

**Spec:** `docs/archive/superpowers/specs/2026-10-27-world-map-design.md`

Робоча папка: `/Users/silentfox/Work/dnd-tracker-world`, гілка `feat/world-map`. Якщо немає `node_modules` — `pnpm install --frozen-lockfile`. Локальна БД — `pnpm db:local` (Docker, порт 54322).

## Global Constraints

- Координати нормалізовані **0..1** відносно картинки (не контейнера); заміна картинки з тими ж пропорціями не зсуває маркери.
- Одна **коренева** карта на кампанію (`parentMarkerId = null`); вкладена належить маркеру (`parentMarkerId` unique).
- Bucket `world-maps`, public, max edge **6000 px**, клієнт вантажить лише `image/webp` | `image/jpeg`.
- Кожна `CREATE TABLE` у міграції + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`). Міграція expand-only, ім'я `20261027000000_world_map`.
- Частина 1 — **усі** таблиці зі spec (`world_maps`, `world_markers`, `world_positions`, `world_reveals`, `world_travel_log`, `world_notes`, `campaign_shows.world`), але API/UI лише для карт і маркерів. Частина 2 не міняє схему.
- Усі routes частини 1 — **лише ДМ** (`requireDM`); чужа кампанія → 404/403 через `loadOwned`; помилки `errorResponse` з текстами з `lib/constants/api-errors.ts` (українською).
- Без пункту в Header; вхід кнопкою «Карта світу» з «Показу» і «Сценарію».
- UI: `HudPage`/`HudPageHeader`/`HudPanel`, `ResponsiveDialog hud`, `useConfirm`/`useNotify`, `QueryState`/`EmptyState`. Компоненти не імпортують `@/lib/api/*`.
- Query keys — фабрика `worldKeys` у `lib/hooks/world/keys.ts` (без `"use client"`, бо її бере server page).
- Мінімум коментарів (лише «чому»), блок-падінги ESLint, `simple-import-sort`, без `console.log`.
- Тести: `pnpm test:related <files>` під час роботи; `pnpm test:run`, `pnpm lint`, `pnpm build` — один раз у фінальній задачі.

## Review Focus

1. **Клік по зазумленій/зсунутій карті** — точка має лягати під курсор при будь-якому `zoom`/`offset` і на картинці, вписаній у контейнер з полями (letterbox). Тест: `toMapPoint` (Task 2) з zoom 2.5 + offset + поля.
2. **Перетягування карти vs клік-інструмент** — пан мишею/пальцем не повинен ставити точку чи вершину зони. Тест: `WorldMapView` (Task 7) — `pointerdown→move 20px→up` не викликає `onMapClick`.
3. **Зона з <3 вершин / самоперетин / дубль-клік** — подвійний клік не має додати дві однакові вершини, а 2-вершинна зона не зберігається. Тест: `closePolygon` (Task 2) прибирає дублікати сусідніх вершин, повертає `null` при <3.
4. **Видалення маркера з вкладеною картою (і глибше)** — каскадом зникає піддерево карт, а їхні файли — зі Storage; файл, що лишився на іншій карті, не видаляється. Тест: delete-handler (Task 4) збирає `imageUrl` усього піддерева, `removeWorldMapFiles` отримує лише ті, що не використовуються.
5. **Друга коренева карта / вкладена до чужого маркера** — 409 на другу кореневу; 404/403 на `parentMarkerId` з іншої кампанії; 409 на другу вкладену того ж маркера. Тест: route-тести (Task 4).

---

## Структура файлів

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261027000000_world_map/migration.sql` | моделі світу |
| `types/world.ts` | DTO: `WorldMap`, `WorldMapSummary`, `WorldMarker`, `WorldMapDetail`, `MapPoint`, inputs |
| `lib/constants/world.ts` | ліміти, bucket, іконки маркерів, дефолти |
| `lib/schemas/world.ts` | Zod: create/update map, create/update marker, upload request |
| `lib/utils/world/geometry.ts` | `clamp01`, `toMapPoint`, `closePolygon`, `polygonCentroid`, `fitBox` |
| `lib/utils/world/tree.ts` | `mapPath`, `subtreeMapIds` |
| `lib/supabase/image-bucket-storage.ts` | спільна фабрика тікетів/шляхів/видалення (слайди + світ) |
| `lib/supabase/world-map-storage.ts` | bucket `world-maps` поверх фабрики |
| `lib/server/world/map-store.ts` | Prisma-запити + маппінг у DTO |
| `lib/server/world/map-handlers.ts`, `marker-handlers.ts`, `upload-handler.ts` | логіка routes |
| `app/api/campaigns/[id]/world/{maps,maps/[mapId],markers,markers/[markerId],upload-url}/route.ts` | тонкі routes |
| `lib/api/world.ts` | клієнтські обгортки + `uploadWorldMapImage` |
| `lib/hooks/world/{keys,useWorldMaps,useWorldMap,useWorldEditor,useWorldMapUpload,useMapDrawing,index}.ts` | запити, мутації, стан інструментів |
| `lib/hooks/common/useViewport.ts` | зум/пан (з бою), `minZoom`/`maxZoom` |
| `components/common/ColorSwatch.tsx` | кнопка-піпетка (винесена з `LegendColorPicker`) |
| `components/world/WorldMapView.tsx` (+ `WorldZones.tsx`, `WorldPins.tsx`) | шари картинка → зони → піни |
| `components/world/editor/*` | тулбар, панель маркера, налаштування карти, діалог нової карти, крихти |
| `app/campaigns/[id]/dm/world/{page,page-client}.tsx` | сторінка редактора |
| `components/world/WorldMapLink.tsx` | вхідна кнопка «Карта світу» |
| `scripts/seed/seed-world-map.ts`, `docs/assets/world-map-prompts/*.md` | seed Ашана, промпти |

---

### Task 1: Схема, міграція, типи, константи, Zod

**Files:**
- Modify: `prisma/schema.prisma` (моделі + зворотні зв'язки в `Campaign`, `Character`, `User`, поле `world Json?` у `CampaignShow`)
- Create: `prisma/migrations/20261027000000_world_map/migration.sql`
- Create: `types/world.ts`, `lib/constants/world.ts`, `lib/schemas/world.ts`
- Modify: `lib/constants/api-errors.ts` (нові тексти)
- Test: `lib/schemas/__tests__/world.test.ts`

**Interfaces — Produces:**

Prisma (імена моделей → таблиці через `@@map`):

```prisma
model WorldMap {
  id             String         @id @default(cuid())
  campaignId     String
  parentMarkerId String?        @unique
  name           String
  imageUrl       String
  width          Int
  height         Int
  fogEnabled     Boolean        @default(true)
  revealRadius   Float          @default(0.04) // частка ширини
  entryX         Float          @default(0.5)
  entryY         Float          @default(0.5)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  campaign       Campaign       @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  parentMarker   WorldMarker?   @relation("NestedMap", fields: [parentMarkerId], references: [id], onDelete: Cascade)
  markers        WorldMarker[]  @relation("MapMarkers")
  positions      WorldPosition[]
  reveals        WorldReveal[]
  travelLog      WorldTravelLog[]
  @@index([campaignId])
  @@map("world_maps")
}

model WorldMarker {
  id            String     @id @default(cuid())
  mapId         String
  kind          String     // point | zone
  x             Float      // для зони — центроїд (якір підпису/героя)
  y             Float
  polygon       Json?      // [[x,y],...] лише для zone
  name          String
  icon          String?
  color         String?
  dmNote        String?
  alwaysVisible Boolean    @default(false)
  sortOrder     Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  map           WorldMap   @relation("MapMarkers", fields: [mapId], references: [id], onDelete: Cascade)
  childMap      WorldMap?  @relation("NestedMap")
  notes         WorldNote[]
  arrivals      WorldTravelLog[]
  @@index([mapId, sortOrder])
  @@map("world_markers")
}

model WorldPosition {
  characterId String    @id
  campaignId  String
  mapId       String
  x           Float
  y           Float
  updatedAt   DateTime  @updatedAt
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  campaign    Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  map         WorldMap  @relation(fields: [mapId], references: [id], onDelete: Cascade)
  @@index([campaignId])
  @@map("world_positions")
}

model WorldReveal {
  id          String    @id @default(cuid())
  mapId       String
  characterId String
  shape       Json      // {t:"p",x,y} | {t:"s",x1,y1,x2,y2}; append-only
  createdAt   DateTime  @default(now())
  map         WorldMap  @relation(fields: [mapId], references: [id], onDelete: Cascade)
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  @@index([mapId, characterId])
  @@map("world_reveals")
}

model WorldTravelLog {
  id           String       @id @default(cuid())
  campaignId   String
  mapId        String
  characterIds String[]
  from         Json?
  to           Json
  toMarkerId   String?
  rest         String       @default("none") // none | short | long
  byUserId     String?
  createdAt    DateTime     @default(now())
  campaign     Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  map          WorldMap     @relation(fields: [mapId], references: [id], onDelete: Cascade)
  toMarker     WorldMarker? @relation(fields: [toMarkerId], references: [id], onDelete: SetNull)
  byUser       User?        @relation(fields: [byUserId], references: [id], onDelete: SetNull)
  @@index([campaignId, createdAt])
  @@map("world_travel_log")
}

model WorldNote {
  id           String      @id @default(cuid())
  markerId     String
  authorUserId String
  characterId  String?
  visibility   String      // public | private
  text         String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  marker       WorldMarker @relation(fields: [markerId], references: [id], onDelete: Cascade)
  author       User        @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  character    Character?  @relation(fields: [characterId], references: [id], onDelete: SetNull)
  @@index([markerId])
  @@map("world_notes")
}
```

Рішення: `from` nullable (перший візит — точки «звідки» нема). `byUserId` nullable + SetNull, щоб видалення юзера не ламало журнал. Зворотні поля: `Campaign.worldMaps/worldPositions/worldTravelLog`, `Character.worldPosition WorldPosition?/worldReveals/worldNotes`, `User.worldNotes/worldTravelLog`.

`types/world.ts`:

```ts
export type MarkerKind = "point" | "zone";
export type MapPoint = { x: number; y: number };
export type Polygon = [number, number][];

export interface WorldMapSummary { id: string; name: string; parentMarkerId: string | null; parentMapId: string | null; imageUrl: string; width: number; height: number }
export interface WorldMap extends WorldMapSummary { fogEnabled: boolean; revealRadius: number; entryX: number; entryY: number; updatedAt: string }
export interface WorldMarker { id: string; mapId: string; kind: MarkerKind; x: number; y: number; polygon: Polygon | null; name: string; icon: string | null; color: string | null; dmNote: string | null; alwaysVisible: boolean; sortOrder: number; childMapId: string | null }
export interface WorldMapDetail { map: WorldMap; markers: WorldMarker[] }

export type CreateWorldMapData = { name: string; imageUrl: string; width: number; height: number; parentMarkerId?: string };
export type UpdateWorldMapData = Partial<Pick<WorldMap, "name" | "imageUrl" | "width" | "height" | "fogEnabled" | "revealRadius" | "entryX" | "entryY">>;
export type CreateWorldMarkerData = { mapId: string; kind: MarkerKind; x: number; y: number; polygon?: Polygon; name: string; icon?: string; color?: string };
export type UpdateWorldMarkerData = Partial<Pick<WorldMarker, "x" | "y" | "polygon" | "name" | "icon" | "color" | "dmNote" | "alwaysVisible" | "sortOrder">>;
export type WorldUploadRequest = { size: number; contentType: "image/webp" | "image/jpeg" };
// частина 2/3: RevealShape, TravelRest — оголосити зараз, бо їх описує схема
export type RevealShape = { t: "p"; x: number; y: number } | { t: "s"; x1: number; y1: number; x2: number; y2: number };
export type TravelRest = "none" | "short" | "long";
```

`lib/constants/world.ts`: `WORLD_MAPS_BUCKET = "world-maps"`, `WORLD_MAP_MAX_EDGE_PX = 6000`, `MAX_WORLD_MAP_MB = 20`, `MAX_WORLD_MAP_BYTES`, `WORLD_MAP_UPLOAD_TYPES = ["image/webp","image/jpeg"] as const`, `WORLD_MAP_FORMATS = { "image/webp": "webp", "image/jpeg": "jpg" }`, `WORLD_NAME_MAX = 80`, `WORLD_DM_NOTE_MAX = 4000`, `MAX_WORLD_MAPS = 200`, `MAX_MARKERS_PER_MAP = 300`, `POLYGON_MAX_VERTICES = 200`, `WORLD_MAX_ZOOM = 8`, `DEFAULT_ZONE_COLOR = "#d3b060"`, `REVEAL_RADIUS_RANGE = { min: 0.01, max: 0.2 }`, `WORLD_MARKER_ICONS` — `Record<string, { label: string }>` з ключами `castle | city | village | dungeon | portal | camp | landmark | battle` (мапа ключ → lucide-іконка живе в компоненті, Task 7).

`api-errors.ts`: `WORLD_MAP_NOT_FOUND: "Карту не знайдено"`, `WORLD_MARKER_NOT_FOUND: "Маркер не знайдено"`, `WORLD_ROOT_EXISTS: "Коренева карта вже є"`, `WORLD_NESTED_EXISTS: "У маркера вже є вкладена карта"`, `WORLD_MAPS_LIMIT: "Забагато карт"`, `WORLD_MARKERS_LIMIT: "Забагато маркерів на карті"`.

`lib/schemas/world.ts`: `coord = z.number().min(0).max(1)`; `polygonSchema = z.array(z.tuple([coord, coord])).min(3).max(POLYGON_MAX_VERTICES)`; `hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)`; `createWorldMapSchema`, `updateWorldMapSchema` (`.strict()`, хоча б одне поле — `.refine(o => Object.keys(o).length > 0)`), `createWorldMarkerSchema` (`superRefine`: zone ⇒ polygon обов'язковий, point ⇒ polygon заборонений), `updateWorldMarkerSchema`, `worldUploadRequestSchema` (size ≤ `MAX_WORLD_MAP_BYTES`). `imageUrl` — `z.string().url().max(1000)`; `width/height` — int 1..`WORLD_MAP_MAX_EDGE_PX`; `icon` — `z.enum(keys of WORLD_MARKER_ICONS)`; `name` — trim, 1..`WORLD_NAME_MAX`, повідомлення українською як в інших схемах.

- [ ] **Step 1: Тести схем** (`lib/schemas/__tests__/world.test.ts`): zone без polygon → fail; point з polygon → fail; polygon з 2 вершин → fail; координата 1.01 → fail; `color: "red"` → fail; порожній update map → fail; валідні point/zone/map → pass; upload 21 МБ → fail.
- [ ] **Step 2:** `pnpm test:run lib/schemas/__tests__/world.test.ts` → FAIL (модуля нема).
- [ ] **Step 3:** Типи, константи, схеми, тексти помилок.
- [ ] **Step 4:** Моделі в `schema.prisma`; `pnpm exec prisma migrate dev --name world_map --create-only` проти локальної БД, перейменувати папку в `20261027000000_world_map`, дописати `ALTER TABLE "<t>" ENABLE ROW LEVEL SECURITY;` після кожної з 6 `CREATE TABLE`; перевірити, що SQL містить лише CREATE/ADD (expand-only), зокрема `ALTER TABLE "campaign_shows" ADD COLUMN "world" JSONB`. `pnpm exec prisma migrate dev` (застосувати), `pnpm exec prisma generate`.
- [ ] **Step 5:** `pnpm test:run lib/schemas/__tests__/world.test.ts prisma/__tests__/migrations-rls.test.ts` → PASS; `pnpm exec tsc --noEmit -p .` без нових помилок.
- [ ] **Step 6: Commit** `feat(world): schema, migration, types and validation`

---

### Task 2: Чиста геометрія й дерево карт

**Files:**
- Create: `lib/utils/world/geometry.ts`, `lib/utils/world/tree.ts`
- Test: `lib/utils/world/__tests__/geometry.test.ts`, `lib/utils/world/__tests__/tree.test.ts`

**Interfaces — Produces:**

```ts
// geometry.ts
export const clamp01: (v: number) => number;
/** client-координати → 0..1 картинки. box = rect елемента картинки ДО трансформу (його left/top/width/height), view = {zoom, offset} з useViewport. */
export function toMapPoint(client: { x: number; y: number }, box: { left: number; top: number; width: number; height: number }, view: { zoom: number; offset: { x: number; y: number } }): MapPoint;
/** Прибирає сусідні дублікати (|Δ| < eps = 0.002) і замикаючу вершину = першій; <3 → null. */
export function closePolygon(points: MapPoint[]): Polygon | null;
export function polygonCentroid(polygon: Polygon): MapPoint;   // центроїд площі; вироджений (площа≈0) → середнє вершин
/** Найбільший прямокутник з aspect = w/h, вписаний у контейнер, по центру. */
export function fitBox(container: { width: number; height: number }, aspect: number): { left: number; top: number; width: number; height: number };

// tree.ts
/** Від кореня до mapId; обрив ланцюга/цикл → лише відомий хвіст, без зависання. */
export function mapPath(maps: WorldMapSummary[], mapId: string): WorldMapSummary[];
/** mapId + усі вкладені (через parentMapId) — для підрахунку файлів при видаленні. */
export function subtreeMapIds(maps: Pick<WorldMapSummary, "id" | "parentMapId">[], rootId: string): string[];
```

`toMapPoint`: `x = (client.x - box.left - offset.x) / (box.width * zoom)`, аналогічно y, потім `clamp01`. (Трансформ у `WorldMapView` — `translate(offset) scale(zoom)` з `transform-origin: 0 0` на внутрішньому шарі, `box` — rect незмінного зовнішнього контейнера картинки.)

- [ ] **Step 1: Тести.** `toMapPoint`: zoom 1 без зсуву (центр → 0.5,0.5); zoom 2.5, offset (−300,−120), box з left 40 (letterbox) — очікувана точка рахується вручну в тесті; клік поза картинкою → обрізано до 0/1. `closePolygon`: 3 вершини → полігон; дубль-клік (дві майже однакові останні) → одна; остання = перша → прибрана; 2 унікальні → null. `polygonCentroid`: квадрат → центр; L-подібний — відомий центроїд; колінеарні → середнє. `fitBox`: широкий контейнер 1000×500 з aspect 1.5 → 750×500, left 125; вузький — навпаки. `mapPath`: корінь→королівство→місто; невідомий id → `[]`; цикл a↔b → не зависає. `subtreeMapIds`: глибина 3 з двома гілками.
- [ ] **Step 2:** Запустити → FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** `pnpm test:run lib/utils/world` → PASS.
- [ ] **Step 5: Commit** `feat(world): geometry and map tree helpers`

---

### Task 3: Storage — спільна фабрика і bucket `world-maps`

**Files:**
- Create: `lib/supabase/image-bucket-storage.ts`, `lib/supabase/world-map-storage.ts`
- Modify: `lib/supabase/scene-slide-storage.ts` (делегує фабриці; експортовані імена й сигнатури не міняються)
- Create: `lib/server/world/upload-handler.ts`, `app/api/campaigns/[id]/world/upload-url/route.ts`
- Test: `lib/supabase/__tests__/image-bucket-storage.test.ts`

**Interfaces — Produces:**

```ts
// image-bucket-storage.ts
export function imageBucketStorage<T extends string>(config: { bucket: string; maxBytes: number; formats: Record<T, string>; bucketTypes: readonly string[]; logTag: string }): {
  ensure(supabase: Admin): ReturnType<typeof ensureBucket>;
  createTicket(campaignId: string, contentType: T): Promise<Result<SlideUploadTicket>>;
  ownedPath(campaignId: string, url: string): string | null;
  remove(campaignId: string, urls: string[]): Promise<void>;
};
// world-map-storage.ts
export const createWorldMapUploadTicket: (campaignId: string, contentType: WorldUploadRequest["contentType"]) => Promise<Result<SlideUploadTicket>>;
export const ownedWorldMapPath: (campaignId: string, url: string) => string | null;
export const removeWorldMapFiles: (campaignId: string, urls: string[]) => Promise<void>;
// upload-handler.ts
export function issueWorldUploadHandler(req: Request, campaignId: string): Promise<NextResponse>; // asDM + parseBody(worldUploadRequestSchema)
```

Рішення: тіло `scene-slide-storage.ts` переноситься у фабрику дослівно (шлях `${campaignId}/${uuid32}.${ext}`, regex `OBJECT_NAME`, `console.warn` з `logTag`); `ensureSlidesBucket`/`createSlideUploadTicket`/`ownedSlidePath`/`removeSlideFiles` — `const` з об'єкта фабрики. Тип тікета — існуючий `SlideUploadTicket` (не дублювати; у `types/world.ts` можна `export type { SlideUploadTicket as WorldUploadTicket } from "@/types/show"`). `asDM` з `deck-handlers.ts` — винести в `lib/utils/api/as-dm.ts` (`withDM(campaignId, action, run)`) і використати в обох місцях; якщо схожий хелпер уже є в `lib/utils/api` — взяти його.

- [ ] **Step 1: Тести фабрики** (мок `createAdminClient` з `storage.from().createSignedUploadUrl/getPublicUrl/remove`, `listBuckets/createBucket`): тікет має шлях `c1/<32hex>.webp`; `ownedPath` приймає свій URL, відхиляє чужу кампанію, чужий bucket і `../`; `remove` викликає storage лише з власними шляхами і ковтає помилку (warn).
- [ ] **Step 2:** FAIL → реалізація → `pnpm test:related lib/supabase/scene-slide-storage.ts lib/supabase/image-bucket-storage.ts` → PASS (включно з `app/api/__tests__/decks-api.test.ts`).
- [ ] **Step 3:** Route `upload-url` (POST → `issueWorldUploadHandler(req, (await params).id)`).
- [ ] **Step 4: Commit** `refactor(storage): shared image bucket factory; feat(world): upload ticket`

---

### Task 4: Store + handlers + routes карт і маркерів

**Files:**
- Create: `lib/server/world/map-store.ts`, `lib/server/world/map-handlers.ts`, `lib/server/world/marker-handlers.ts`
- Create: `app/api/campaigns/[id]/world/maps/route.ts` (GET, POST), `.../maps/[mapId]/route.ts` (GET, PATCH, DELETE), `.../markers/route.ts` (POST), `.../markers/[markerId]/route.ts` (PATCH, DELETE)
- Test: `app/api/__tests__/world-api.test.ts` (стиль `decks-api.test.ts`: мок `@/lib/db`, `api-auth`, storage, `next/server#after`)

**Interfaces — Produces:**

```ts
// map-store.ts
export function listWorldMaps(campaignId: string): Promise<WorldMapSummary[]>;       // include parentMarker {mapId}; сортування createdAt
export function readWorldMapDetail(mapId: string): Promise<(WorldMapDetail & { campaignId: string }) | null>; // markers за sortOrder, childMap {id}
export const toWorldMap: (row) => WorldMap; export const toWorldMarker: (row) => WorldMarker;
/** imageUrl піддерева mapId, що не використовуються картами поза ним. */
export function orphanedImagesOfSubtree(campaignId: string, rootMapId: string): Promise<string[]>;

// map-handlers.ts
export function listWorldMapsHandler(campaignId: string): Promise<NextResponse>;            // 200 WorldMapSummary[]
export function createWorldMapHandler(req: Request, campaignId: string): Promise<NextResponse>; // 201 WorldMap
export function getWorldMapHandler(campaignId: string, mapId: string): Promise<NextResponse>;   // 200 WorldMapDetail
export function updateWorldMapHandler(req: Request, campaignId: string, mapId: string): Promise<NextResponse>;
export function deleteWorldMapHandler(campaignId: string, mapId: string): Promise<NextResponse>; // 200 {ok:true}
// marker-handlers.ts
export function createWorldMarkerHandler(req: Request, campaignId: string): Promise<NextResponse>;  // 201 WorldMarker
export function updateWorldMarkerHandler(req: Request, campaignId: string, markerId: string): Promise<NextResponse>;
export function deleteWorldMarkerHandler(campaignId: string, markerId: string): Promise<NextResponse>;
```

Правила:
- Усі — `withDM`. Карта: `loadOwned(prisma.worldMap.findUnique(...), campaignId, WORLD_MAP_NOT_FOUND)`. Маркер не має `campaignId` — `findUnique({ include: { map: { select: { campaignId: true } } } }).then(m => m && { ...m, campaignId: m.map.campaignId })`.
- Create map: `imageUrl` має бути `ownedWorldMapPath(campaignId, url)` **або** будь-який https (seed бере wikia) — рішення: дозволяємо лише власний bucket у route, seed пише в БД напряму. Чужий URL → 400. Без `parentMarkerId`: якщо вже є коренева → 409 `WORLD_ROOT_EXISTS`. З `parentMarkerId`: маркер своєї кампанії (інакше 404/403), без `childMap` (інакше 409 `WORLD_NESTED_EXISTS`; ловити також Prisma `P2002` на гонці). Ліміт `MAX_WORLD_MAPS` → 409.
- Update map: при зміні `imageUrl` старий файл після відповіді (`after`) → `removeWorldMapFiles`, якщо він не використовується іншою картою кампанії. `entryX/Y` clamp вже в схемі.
- Delete map: спершу `orphanedImagesOfSubtree`, потім `prisma.worldMap.delete` (FK каскадом прибирає маркери → вкладені карти → їхні маркери …), потім `after(() => removeWorldMapFiles(...))`.
- Create marker: карта своєї кампанії; `count` маркерів ≥ `MAX_MARKERS_PER_MAP` → 409; zone ⇒ `x,y = polygonCentroid(polygon)` (клієнтські x/y ігноруються); `color` за замовчуванням `DEFAULT_ZONE_COLOR` для зони; `sortOrder = max+1`.
- Update marker: якщо прийшов `polygon` → перерахувати `x,y` центроїдом; для point `polygon` у тілі → 400.
- Delete marker: якщо є `childMap` — ті самі кроки, що й delete map для піддерева `childMap.id`, потім видалити маркер (каскад).
- Відповіді — DTO через `toWorldMap/toWorldMarker` (дати ISO).

- [ ] **Step 1: Route-тести:** не-ДМ (`requireDM` повертає 403-відповідь) → 403 на кожен метод; карта іншої кампанії → 403; неіснуюча → 404; POST друга коренева → 409; POST вкладена до маркера з childMap → 409; POST вкладена до маркера чужої кампанії → 403; POST з чужим `imageUrl` → 400; POST zone → у `create` пішли x/y центроїда; PATCH polygon перераховує центроїд; PATCH point+polygon → 400; ліміт маркерів → 409; DELETE маркера з вкладеною картою → `removeWorldMapFiles` отримав лише orphaned URL (картинка, що є ще на іншій карті, не видаляється); PATCH imageUrl → старий файл у `after`.
- [ ] **Step 2:** FAIL → store/handlers/routes (routes лише `return xHandler(req, (await params).id, ...)`).
- [ ] **Step 3:** `pnpm test:run app/api/__tests__/world-api.test.ts` → PASS.
- [ ] **Step 4: Commit** `feat(world): maps and markers API`

---

### Task 5: Клієнтський API і хуки

**Files:**
- Create: `lib/api/world.ts`
- Create: `lib/hooks/world/{keys.ts,useWorldMaps.ts,useWorldMap.ts,useWorldEditor.ts,useWorldMapUpload.ts,index.ts}`
- Test: `lib/hooks/world/__tests__/useWorldMapUpload.test.ts`

**Interfaces — Produces:**

```ts
// lib/api/world.ts
export const getWorldMaps: (campaignId: string) => Promise<WorldMapSummary[]>;
export const getWorldMap: (campaignId: string, mapId: string) => Promise<WorldMapDetail>;
export const createWorldMap / updateWorldMap / deleteWorldMap / createWorldMarker / updateWorldMarker / deleteWorldMarker;
export function uploadWorldMapImage(campaignId: string, blob: Blob): Promise<string>; // копія uploadSlideImage з "/world/upload-url"

// keys.ts (без "use client")
export const worldKeys = { maps: (c: string) => ["world-maps", c] as const, map: (c: string, m: string) => ["world-map", c, m] as const };

// hooks
export function useWorldMaps(campaignId: string): UseQueryResult<WorldMapSummary[]>;
export function useWorldMap(campaignId: string, mapId: string | null): UseQueryResult<WorldMapDetail>;
export function useWorldEditor(campaignId: string, mapId: string | null): {
  map: { create, update, remove };       // useCrudMutation; invalidate maps (+ map)
  marker: { create, update, remove };    // оптимістично оновлюють кеш worldKeys.map (update — patch у списку маркерів), invalidate map; remove також maps (піддерево)
  isPending: boolean;
};
/** File → {imageUrl,width,height}: розміри через createImageBitmap, fitWithin(…, WORLD_MAP_MAX_EDGE_PX), resizeImageToBlob, upload. */
export function useWorldMapUpload(campaignId: string): { upload(file: File): Promise<{ imageUrl: string; width: number; height: number }>; uploading: boolean };
```

Рішення: `useWorldMapUpload` — тип файлу не image/* → кидає `Error("Оберіть картинку")`; webp якщо браузер вміє (як у `resizeImageToBlob`). Повідомлення помилок через `useCrudMutation({ errorText })`.

- [ ] **Step 1: Тест `useWorldMapUpload`** (моки `createImageBitmap`, `resizeImageToBlob`, `uploadWorldMapImage`): 8000×4000 → width 6000, height 3000; 1600×1066 → без змін; не-картинка → помилка без виклику upload.
- [ ] **Step 2:** FAIL → реалізація → PASS (`pnpm test:related lib/hooks/world/useWorldMapUpload.ts`).
- [ ] **Step 3: Commit** `feat(world): client api and hooks`

---

### Task 6: `useViewport` у `lib/hooks/common`

**Files:**
- Move: `lib/hooks/battle/useMapViewport.ts` → `lib/hooks/common/useViewport.ts` (`git mv`)
- Modify: `lib/hooks/common/index.ts`, `lib/hooks/battle/index.ts` (прибрати експорт), `components/battle/map/BattleMap.tsx`
- Test: `lib/hooks/common/__tests__/useViewport.test.ts` (happy-dom, `renderHook`)

**Interfaces — Produces:**

```ts
export const DRAG_THRESHOLD = 4;
export interface ViewportOptions { panLocked?: boolean; wheelScrolls?: boolean; minZoom?: number; maxZoom?: number } // дефолти 1 і 3 — бій без змін
export function useViewport(options?: ViewportOptions): { zoom; offset; containerRef; wasDragged; bind; reset; zoomBy(factor: number): void };
```

Рішення: `clampZoom`/`zoomAt` приймають межі параметрами (замикання з options через ref, як `locked`). `zoomBy` — кнопки +/− (зум відносно центру контейнера) для редактора на тачпаді без колеса. Бій: `useViewport({ panLocked, wheelScrolls })` — поведінка ідентична.

- [ ] **Step 1: Тест:** колесо 30 кроків при `maxZoom: 8` → zoom 8, при дефолті → 3; `zoomBy(0.1)` не нижче `minZoom`; `wasDragged()` false після руху < `DRAG_THRESHOLD`, true після 10px.
- [ ] **Step 2:** FAIL → перенос/параметри → PASS; `pnpm test:related components/battle/map/BattleMap.tsx lib/hooks/common/useViewport.ts`.
- [ ] **Step 3: Commit** `refactor(hooks): generic useViewport with zoom bounds`

---

### Task 7: `WorldMapView` — картинка, зони, піни

**Files:**
- Create: `components/world/WorldMapView.tsx`, `components/world/WorldZones.tsx`, `components/world/WorldPins.tsx`, `components/world/marker-icons.ts`
- Test: `components/world/__tests__/WorldMapView.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces — Produces:**

```tsx
export interface WorldMapViewProps {
  detail: WorldMapDetail;
  selectedId?: string | null;
  draft?: MapPoint[];                       // незамкнена зона, що малюється
  handlers?: { onMapClick?(p: MapPoint): void; onMapDoubleClick?(p: MapPoint): void; onMarkerClick?(id: string): void; onMarkerDrag?(id: string, p: MapPoint): void };
  overlay?: ReactNode;                      // частина 2: туман/герої (canvas поверх)
  className?: string;
}
export function WorldMapView(props: WorldMapViewProps): JSX.Element;
// marker-icons.ts
export const MARKER_ICON: Record<keyof typeof WORLD_MARKER_ICONS, LucideIcon>; // Castle, Building2, Home, Skull, Sparkles, Tent, Landmark, Swords
```

Рішення:
- Зовнішній div (`ref` для розміру через `ResizeObserver`; спершу перевірити, чи нема готового хука розміру в `lib/hooks/common`) → `fitBox(size, width/height)` → absolutely-positioned «бокс картинки» з `containerRef` і `bind` з `useViewport({ maxZoom: WORLD_MAX_ZOOM })`; всередині шар `transform: translate(x,y) scale(zoom)`, `transform-origin: 0 0`, `touch-action: none`.
- Шар 1: `next/image` `fill`, `sizes` = ширина боксу × min(zoom, 2) px, `priority`, `draggable={false}`.
- Шар 2: `<svg viewBox="0 0 1 1" preserveAspectRatio="none">` — зони `<polygon points>` fill `color` opacity .28, stroke `color`, `vectorEffect="non-scaling-stroke"`; обрана — товща обводка; `draft` — `<polyline>` пунктиром + точки вершин.
- Шар 3: піни (`point` — іконка; `zone` — підпис назви в центроїді), `left/top` у %, `transform: translate(-50%,-100%) scale(1/zoom)`, щоб не росли з зумом; `button` з `aria-label={name}`.
- Кліки: на `pointerup` по фону, якщо `!wasDragged()` → `onMapClick(toMapPoint(...))`; `dblclick` → `onMapDoubleClick`. Пін: `pointerdown` зупиняє пан (stopPropagation), рух > `DRAG_THRESHOLD` при наявному `onMarkerDrag` → перетягування (`point` лише), інакше `onMarkerClick`.
- Кнопки +/−/reset у куті (`zoomBy`, `reset`).

- [ ] **Step 1: Тести:** рендерить по `<polygon>` на зону і по кнопці на маркер; клік по фону викликає `onMapClick` з точкою в 0..1 (мок `getBoundingClientRect` боксу); pointerdown→move 20px→up **не** викликає `onMapClick`; клік по піну → `onMarkerClick(id)` без `onMapClick`; драг піна point → `onMarkerDrag`; `draft` з 2 точок → polyline.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3: Commit** `feat(world): map view with zones and pins`

---

### Task 8: Сторінка редактора — карта, крихти, upload, налаштування

**Files:**
- Create: `app/campaigns/[id]/dm/world/page.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`
- Create: `components/world/editor/WorldBreadcrumbs.tsx`, `components/world/editor/NewWorldMapDialog.tsx`, `components/world/editor/WorldMapSettings.tsx`, `components/world/editor/WorldEditorContext.tsx`
- Test: `components/world/editor/__tests__/NewWorldMapDialog.test.tsx`, `components/world/editor/__tests__/WorldMapSettings.test.tsx`

**Interfaces — Consumes:** `listWorldMapsHandler`, `getWorldMapHandler` (Task 4), `worldKeys`, хуки Task 5, `WorldMapView` (Task 7), `mapPath` (Task 2).

**Produces:**

```tsx
// page.tsx (server): requireCampaignDM(id); maps = readOkJson(listWorldMapsHandler(id)); mapId = searchParams.map ?? root?.id;
// detail = mapId ? readOkJson(getWorldMapHandler(id, mapId)) : null; два вкладені PrefetchedQuery (worldKeys.maps, worldKeys.map).
export function WorldEditorPageClient({ campaignId, campaignName, mapId }: { campaignId: string; campaignName: string; mapId: string | null }): JSX.Element;
// контекст для глибокого дерева редактора
export interface WorldEditorCtx { campaignId: string; detail: WorldMapDetail; maps: WorldMapSummary[]; editor: ReturnType<typeof useWorldEditor>; selectedId: string | null; select(id: string | null): void; openMap(mapId: string): void }
export function NewWorldMapDialog({ open, onOpenChange, parentMarker }: { open: boolean; onOpenChange(v: boolean): void; parentMarker?: Pick<WorldMarker, "id" | "name"> }): JSX.Element; // назва (дефолт = назва маркера) + файл; submit → upload → map.create → openMap(new.id)
export function WorldMapSettings(): JSX.Element; // назва, туман (switch), радіус (slider REVEAL_RADIUS_RANGE), «Поставити точку входу» (режим інструменту), «Замінити картинку» (useConfirm), «Видалити карту» (useConfirm; текст згадує кількість вкладених з subtreeMapIds)
```

Рішення:
- `?map=` — `router.replace` (`useSearchParams`) при переході; неіснуючий id → редірект на корінь (server: якщо detail 404 — `mapId = root`).
- Немає кореневої карти → `EmptyState` «Завантажте карту континенту» + кнопка → `NewWorldMapDialog` без `parentMarker`.
- Лейаут: `HudPage` + `HudPageHeader` (title = назва карти, subtitle = `WorldBreadcrumbs`); під ним на десктопі грід `карта | HudPanel` (панель 20rem праворуч), на телефоні (`useIsMobile`) панель — під картою, карта висотою `60dvh`. Панель показує `WorldMarkerPanel` (Task 9), якщо обрано маркер, інакше `WorldMapSettings`.
- Збереження налаштувань — на blur/відпускання слайдера (не на кожен тік), через `editor.map.update`.
- Заміна картинки з іншими пропорціями (|aspect − old| > 1%) → confirm попереджає, що маркери можуть зсунутися.
- Server page тягне handler-и напряму (як `dm/scenario/page.tsx`), `export const dynamic` не потрібен.

- [ ] **Step 1: Тести:** `NewWorldMapDialog` — submit без файлу заблокований; з файлом викликає upload, потім create з `parentMarkerId`; помилка upload → `useNotify` і діалог лишається відкритим. `WorldMapSettings` — «Видалити карту» питає підтвердження й не видаляє при відмові; перемикач туману шле `update({ fogEnabled:false })`. (Рендер у `ConfirmProvider` — `components/ui/__tests__/render-with-confirm.tsx`; хуки — мок `@/lib/hooks/world`.)
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3: Commit** `feat(world): DM editor page, map settings and upload`

---

### Task 9: Інструменти малювання й панель маркера

**Files:**
- Create: `lib/hooks/world/useMapDrawing.ts`, `components/world/editor/WorldToolbar.tsx`, `components/world/editor/WorldMarkerPanel.tsx`
- Create: `components/common/ColorSwatch.tsx`; Modify: `components/scenario/editor/LegendColorPicker.tsx` (обгортка над `ColorSwatch`)
- Modify: `app/campaigns/[id]/dm/world/page-client.tsx` (підключити)
- Test: `lib/hooks/world/__tests__/useMapDrawing.test.ts`, `components/world/editor/__tests__/WorldMarkerPanel.test.tsx`

**Interfaces — Produces:**

```ts
export type WorldTool = "select" | "point" | "zone" | "entry";
export function useMapDrawing(actions: { onPoint(p: MapPoint): void; onZone(polygon: Polygon): void; onEntry(p: MapPoint): void }): {
  tool: WorldTool; setTool(t: WorldTool): void;
  draft: MapPoint[];
  handlers: Pick<WorldMapViewProps["handlers"] & {}, "onMapClick" | "onMapDoubleClick">;
  undoVertex(): void; cancel(): void; finish(): void;   // finish = як дубль-клік
};
export function ColorSwatch({ color, onChange, label }: { color: string; onChange(c: string): void; label: string }): JSX.Element;
export function WorldMarkerPanel(): JSX.Element; // читає WorldEditorCtx
```

Поведінка `useMapDrawing`:
- `point`: клік → `onPoint(p)` (створює маркер «Нова точка», панель відкривається на ньому), tool лишається `point`.
- `zone`: клік додає вершину; дубль-клік (браузер шле 2 кліки + dblclick — дубль прибирає `closePolygon`) → `closePolygon(draft)`; `null` → нічого не зберігає й лишає draft; інакше `onZone`, draft очищується. `Esc` → `cancel`, `Backspace` → `undoVertex` (keydown-слухач лише поки tool = zone; не перехоплювати, коли фокус у input/textarea).
- `entry`: клік → `onEntry` → `map.update({entryX, entryY})`, tool → `select`. Точка входу видима в редакторі як окремий значок (додати в `WorldMapView` проп `entry?: MapPoint`).
- Зміна tool скидає draft.

`WorldToolbar`: `HudChipTabs` або група toggle-кнопок «Вибір / Точка / Зона», під час `zone` — підказка «Клік — вершина, подвійний клік — замкнути, Esc — скасувати» + кнопки «Готово»/«Крок назад».

`WorldMarkerPanel` (обраний маркер): назва (`Input`, збереження на blur), іконка (лише point; select з `WORLD_MARKER_ICONS`), колір (`ColorSwatch`, для zone), нотатка ДМ (`Textarea`, blur), «Відома локація» (switch → `alwaysVisible`), «Перемалювати зону» (tool zone → наступне замикання робить `marker.update({polygon})` замість create), «Створити вкладену карту» → `NewWorldMapDialog` з `parentMarker` / або «Відкрити вкладену карту» якщо `childMapId`, «Видалити» (`useConfirm`; якщо є `childMapId` — текст попереджає про видалення вкладених карт). Блок «Прив'язки сценарію» — у частині 3 (зараз не рендерити).

- [ ] **Step 1: Тести `useMapDrawing`:** point клік → onPoint; zone 3 кліки + dblclick (з дублікатом останньої точки) → onZone з 3 вершинами; zone 2 кліки + dblclick → onZone не викликано, draft лишився; Esc очищає; Backspace прибирає останню; Backspace у фокусі textarea нічого не робить; зміна tool скидає draft; entry → onEntry і tool = select.
- [ ] **Step 2: Тести `WorldMarkerPanel`:** зміна назви + blur → `marker.update({name})`; видалення маркера з `childMapId` показує confirm зі згадкою вкладеної карти; без підтвердження `remove` не викликано; point не показує колір, zone — показує.
- [ ] **Step 3:** FAIL → реалізація (`ColorSwatch` — розмітка з `LegendColorPicker`; `LegendColorPicker` = `<ColorSwatch color={entry.color ?? KIND_HEX[entry.kind]} label="Колір позначки" onChange={onChange} />`) → PASS; `pnpm test:related components/scenario/editor/LegendColorPicker.tsx`.
- [ ] **Step 4: Commit** `feat(world): drawing tools and marker panel`

---

### Task 10: Вхідні кнопки з «Показу» і «Сценарію»

**Files:**
- Create: `components/world/WorldMapLink.tsx`
- Modify: `components/show/stage/ShowControlPanel.tsx` (док ДМ на екрані показу), `app/campaigns/[id]/dm/show/page-client.tsx` (actions у `HudPageHeader`), `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx` (поряд з «Екран показу ↗»)
- Test: `components/world/__tests__/WorldMapLink.test.tsx`

**Interfaces — Produces:**

```tsx
export function WorldMapLink({ campaignId, variant }: { campaignId: string; variant: "button" | "toggle" }): JSX.Element;
// <Link href={`/campaigns/${campaignId}/dm/world`}> з іконкою Map і текстом «Карта світу»; "toggle" = className "toggle sb-hide-sm" (сценарій), "button" = Button asChild variant="outline" (показ)
```

Рішення: на екрані показу (`ShowControlPanel`) посилання відкривається в новій вкладці (`target="_blank"`), щоб не рвати показ; зі сторінок ДМ — у тій самій. У `ScenarioToolbar` (форматування тексту) кнопку **не** ставимо — вона в рядку actions сторінки сценарію, де вже живуть навігаційні посилання. Пункт у Header не додається.

- [ ] **Step 1: Тест:** href правильний; `variant="toggle"` має клас `toggle`; `newTab` → `target="_blank" rel="noopener"`. (Додати проп `newTab?: boolean`.)
- [ ] **Step 2:** FAIL → реалізація, вставити у 3 місця → PASS.
- [ ] **Step 3: Commit** `feat(world): entry links from show and scenario`

---

### Task 11: Seed Ашана + промпти королівств

**Files:**
- Create: `scripts/seed/seed-world-map.ts`, `scripts/seed/world-map-ashan.ts` (дані: зони, міста, фрагменти)
- Modify: `package.json` (`"seed-world-map": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/seed/seed-world-map.ts"`)
- Create: `docs/assets/world-map-prompts/README.md` + по файлу на королівство (`holy-griffin-empire.md`, `irollan.md`, `grimheim.md`, `silver-cities.md`, `heresh.md`, `ranaar.md`, `ygg-chall.md`, `twilight-archipelago.md`)
- Test: `scripts/seed/__tests__/world-map-ashan.test.ts`

**Interfaces — Produces:**

```ts
// world-map-ashan.ts — чисті дані, без IO
export const ASHAN_IMAGE_URL = "https://static.wikia.nocookie.net/mightandmagic/images/2/2a/MapAshan.jpg/revision/latest?cb=20150228111245&path-prefix=en";
export const ASHAN_SIZE = { width: 1600, height: 1066 };
export interface KingdomSeed { name: string; color: string; polygon: Polygon; crop: { left: number; top: number; width: number; height: number } /* 0..1 від Ашана */; cities: { name: string; x: number; y: number /* 0..1 від ВКЛАДЕНОЇ карти */; icon: string }[] }
export const ASHAN_KINGDOMS: KingdomSeed[];             // 8 зон зі spec
export const ASHAN_CITIES: { name: string; x: number; y: number; icon: string; alwaysVisible: boolean }[]; // Talonguard, Stonehelm, Karthal, Al Safir, Tor Myrdal, Syrris Thalla, Nar-Ankar на корені
```

Скрипт (`pnpm seed-world-map <campaignId>`):
1. Guard: `DATABASE_URL` має містити `localhost`/`127.0.0.1`, інакше вихід з помилкою (prod — лише за командою користувача, з прапорцем `--allow-remote`).
2. Ідемпотентність: якщо в кампанії вже є коренева карта з назвою «Ашан» — видалити її (каскад) і файли (`removeWorldMapFiles`) перед повторним створенням.
3. `fetch(ASHAN_IMAGE_URL)` → buffer → `sharp` у webp → upload в bucket `world-maps` через admin-клієнт (`createWorldMapUploadTicket` + `uploadToSignedUrl`, або `storage.from(bucket).upload(path, buf, { cacheControl: YEAR_CACHE_SECONDS, contentType })` з шляхом формату фабрики, щоб `ownedWorldMapPath` його визнав).
4. Коренева карта «Ашан»; зони королівств (x/y = `polygonCentroid`), точки міст.
5. На кожне королівство: `sharp(buffer).extract(crop у px).resize({ width: min(4×, 6000) , kernel: lanczos3 })` → upload → вкладена карта з `parentMarkerId` = зона, `entryX/Y` = центр, маркери міст королівства.
6. Друкує посилання `http://localhost:3000/campaigns/<id>/dm/world`.

Дані: полігони — грубі обриси з `MapAshan.jpg` (6–12 вершин на королівство), підібрані на око по картинці; міста — з Might and Magic wiki для кожної фракції (столиця + 2–4 міста). Імена англійською (контент-мова — English).

Промпти: на кожне королівство — географія (рельєф, клімат, ріки, кордони з сусідами за wiki), список міст з розташуванням, стиль «hand-painted fantasy map in the style of Heroes of Might and Magic V world map, parchment, no text labels, top-down», співвідношення сторін = `crop`, роздільність ≥ 4000 px по довшій стороні. `README.md` — як замінити тимчасовий фрагмент згенерованою картинкою («Замінити картинку» в налаштуваннях карти).

- [ ] **Step 1: Тест даних:** 8 королівств зі spec за назвою; кожен полігон проходить `polygonSchema` і `closePolygon` ≠ null; усі координати 0..1; `crop` у межах 0..1 і `left+width ≤ 1`; кожне місто з `ASHAN_CITIES` лежить усередині полігону свого королівства (простий ray-casting у тесті; `pointInPolygon` — частина 2, тут не вводити у прод-код); іконки ∈ `WORLD_MARKER_ICONS`.
- [ ] **Step 2:** FAIL → дані + скрипт + промпти → PASS.
- [ ] **Step 3:** Прогін на локальній БД: створити/взяти тестову кампанію, `pnpm seed-world-map <id>`, двічі (ідемпотентність) — без помилок; у Storage файлів не подвоюється.
- [ ] **Step 4: Commit** `feat(world): Ashan seed and kingdom map prompts`

---

### Task 12: Фінальна перевірка й документи

**Files:**
- Modify: `docs/STATUS.md` (рядок «Карта світу — частина 1 готова, далі частина 2»)

- [ ] **Step 1:** `pnpm lint` (з `--fix` для порядку імпортів/падінгів) → 0 помилок.
- [ ] **Step 2:** `pnpm test:run` → усе зелене (повний прогін, бо Task 3/6 зачіпають спільні модулі).
- [ ] **Step 3:** `pnpm build` → успіх.
- [ ] **Step 4:** Live-прогін (субагент Sonnet, браузер, desktop + 500 px; `pnpm dev` на локальній БД після seed): відкрити `/dm/world` з кнопки в «Показі» і в «Сценарії»; зум колесом/кнопками до 8×; поставити точку, перетягнути її; намалювати зону (дубль-клік), змінити колір; створити вкладену карту з маркера, перейти крихтами назад; замінити картинку (confirm); видалити маркер з вкладеною картою (confirm) — карта зникла зі списку. Перевіряти через JS/текст сторінки, скриншоти масштабовані.
- [ ] **Step 5: Commit** `docs(world): status after part 1`

---

## Self-review (виконано)

- **Spec coverage, частина 1:** схема/міграція — T1; bucket/upload — T3; CRUD карт і маркерів — T4; `useViewport` — T6; `WorldMapView` (картинка, зони, маркери) — T7; сторінка редактора (upload/заміна, точка, зона, колір-піпетка, панель маркера, «Створити вкладену карту», налаштування туману/радіуса/точки входу, крихти) — T8–T9; вхідні кнопки — T10; seed + промпти — T11. Свідомо відкладено зі сторінки редактора: «очима героя X» і список прив'язаних глав/рядків (потребують частин 2/3), `docs/architecture/world-map.md` і whats-new (spec відносить до частини 3).
- **Відхилення від spec:** seed у `scripts/seed/` (конвенція репо) замість `scripts/`; вхідна кнопка сценарію — у actions сторінки, а не в `ScenarioToolbar` (тулбар форматування тексту); `world_travel_log.from` і `byUserId` nullable.
- **Типи:** `WorldMapDetail`, `WorldMarker.childMapId`, `worldKeys.map/maps`, `useWorldEditor().{map,marker}`, `WorldMapViewProps.handlers`, `toMapPoint`/`closePolygon`/`polygonCentroid`/`fitBox` — узгоджені між T2/T4/T5/T7/T8/T9.
