# Редактор мап — етап E: редактор тайлів Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Кроки використовують checkbox (`- [ ]`) для відстеження.

**Goal:** Додати редактор тайлів для бібліотечних карт кампанії з Canvas-рендером видимих чанків, шаровим RLE-збереженням і скасуванням/повтором дій.

**Architecture:** Розширити `battle_map_chunks` nullable `tile_layers JSONB`, зберігши `data` для legacy-ребер і чинний PK; чисті кодеки/autotile винести в `lib/utils/battle/tiles`, сховище та версії лишити в бібліотеці карт, а Canvas-рендер побудувати поверх поточних CTM/GridWindow API. Власні/CC0 текстури проходять окремий шлях завантаження до `battle-tiles`; редактор використовує прапорець `mapLibraryEnabled`, наявні карти, хуки й версійну синхронізацію.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Prisma/PostgreSQL, Supabase Storage, Canvas 2D/OffscreenCanvas з fallback, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-15-map-editor-stage-e-design.md`](../specs/2026-11-15-map-editor-stage-e-design.md)

## Global Constraints

- Працювати лише в worktree `/Users/silentfox/Work/dnd-tracker-map-editor-c`, гілка `feat/map-editor-c`; не чіпати інші worktree.
- Мова документації й коментарів — українська; імпорти з `@/`; дотримуватися шарування й перевикористовувати наявний код.
- Не змінювати production, не застосовувати міграції; створення expand-only міграції погоджено; не застосовувати її й не змінювати production.
- Старі `battle_map_chunks` із `tile_layers = NULL` лишаються читабельними як ребра; старий base64 на 256 байтів не декодувати як RLE тайлів.
- Редагування відбувається в бібліотеці карт (`MapEditorScreen`); форма бою лише вибирає готову карту. `blocks` входить до набору заблокованих клітинок для руху; `blocksSight` лишається метаданими для Fog G.
- Прапорець кампанії — наявний `mapLibraryEnabled`; нову кампанійну колонку не додавати.
- Пілот текстур передує масовій генерації: `tiles_stone-floor_1`, `tiles_grass_1`, `tiles_wood-planks_1`, `tiles_wall-stone`, `tiles_barrel`, `tiles_door-wood-closed`.
- Ліміти текстур: ground/wallfill 256×256; objects 256 px на клітинку footprint; edge-art 256×64; PNG/WebP; ≤200 KiB/файл; ≤50 MiB кампанійних активів.
- Зберегти DOM-контракт `data-fx-*`, особливо `[data-fx-grid]`; `cellPoint` використовує CTM.
- Тести запускати тільки явним шляхом `pnpm test:run path/to/file.test.ts`; повний `pnpm test:run` — один раз наприкінці після `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; не запускати важкі процеси паралельно; понад 5 хв — завислий процес.
- ESLint лише змінених файлів: `pnpm exec eslint --fix <файли>`; не запускати повний `pnpm lint`.
- `tsc` запускати один раз наприкінці етапу.
- Не запускати живий браузерний прогін і battle-sweep; лишити їх у `docs/STATUS.md` відкладеними перевірками.
- Робити малі логічні коміти; не пушити й не зливати в `main` без явного дозволу.

## Review Focus

- Старі рядки ребер після міграції/читання не губляться і не потрапляють у декодер тайлів — `edge-chunks.test.ts` та `tiles/chunks.test.ts`.
- Частковий запис одного шару не затерає інші шари або pinned rollback — `library-service.test.ts`.
- Некоректний/ворожий RLE (нульова довжина, переповнення, невідома версія, ID поза каталогом) відхиляється до рендера — `tiles/rle.test.ts`.
- Змінений чанк не перемальовує всю карту, а межі вікна перегляду й DPR не зміщують клітинкові координати — `TileCanvas.test.tsx` і `useGridWindow.test.tsx`.
- Застарілий `expectedVersion`, кампанія без прапорця та користувач без прав ДМ не можуть записати тайли — тести API/сервісу маршрутів тайлів.

---

## Файли та межі

- `lib/utils/battle/tiles/*`: чистий формат чанків, RLE, autotile, варіанти, різниці й інвалідація кешу.
- `lib/constants/tilesets/*`: статичний каталог метаданих і стабільні числові ID.
- `lib/server/battle-maps/*`, `lib/schemas/battle-maps.ts`, `app/api/campaigns/[id]/maps/*`: валідація й версійне читання/запис tile chunk patches; без логіки UI.
- `lib/supabase/*` та `scripts/assets/*`: перевірка й завантаження ресурсів; не викликати імпорт контенту для тайлів.
- `components/battle/map/tiles/*`: Canvas-малювач і кеш видимих чанків; не замінює SVG/DOM FX, стіни чи учасників.
- `components/maps/*`, `lib/hooks/battle-maps/*`, `components/battle/setup/*`: редактор для комп'ютера, інструменти вказівника, історія дій та інтеграція з наявною чернеткою карти.
- `prisma/schema.prisma`, одна нова міграція лише на розширення, `prisma/__tests__/migrations-rls.test.ts`: nullable JSONB поля шарів; чинний ключ і дані не переписувати/не видаляти.
- `docs/architecture/map-modes.md`, `docs/architecture/battle.md`, `docs/STATUS.md`: контракт і відкладені кінцеві перевірки.

## Task 1: Spike 3 і пілот активів

**Files:**
- Create: `docs/superpowers/research/2026-11-15-map-tile-spike3.md`
- Create: `scripts/assets/tiles/validate.ts`
- Create: `scripts/assets/tiles/upload.ts`
- Create: `scripts/assets/tiles/upload-lib.ts`
- Create: `scripts/assets/tiles/__tests__/validate.test.ts`
- Create: `scripts/assets/tiles/__tests__/upload-lib.test.ts`
- Modify: `package.json` (команда для tile assets)
- Assets: шість пілотних файлів за `docs/assets/tile-prompts/README.md`, у локальній теці пілоту; жодного production upload.

**Interfaces:**
- Валідатор споживає `{ fileName, bytes, kind, footprint? }` і повертає нормалізовані розміри/MIME/байти або типізовану помилку перевірки.
- Завантажувач приймає каталог локальних файлів, цільові bucket/prefix і режим попередньої перевірки або явну тестову ціль; не читає/не пише контент Prisma.

- [ ] Перевірити шість пілотних текстур із README: шов після зсуву на 50%, читабельність у 64 px, прозорість/пурпурову кайму, масштаб, розміри й ≤200 KiB; якщо 2 або більше мають дефект, скоригувати промпт або випробувати CC0 Kenney до масової генерації.
- [ ] Зняти початкові показники Spike 3: розмір файлів і декодовані розміри, повторення без шва, пам'ять Canvas/частоту перемальовування для 100×100 і 200×200, час рендера видимого вікна; зафіксувати середовище, цифри, компроміси й висновок у research-файлі.
- [x] Написати тести `validate.test.ts`: дозволені ground/wallfill 256×256, object 2×1 і 2×2, edge 256×64, PNG/WebP, межу 200 KiB, невідповідність MIME, завеликі/невірні розміри й ліміт кампанії 50 MiB.
- [x] Запустити `pnpm test:run scripts/assets/tiles/__tests__/validate.test.ts`; усі 11 позитивних/негативних випадків пройшли.
- [x] Реалізувати окрему CLI-команду завантаження з префіксом `campaignId/` для кампанійних активів і незмінним глобальним шляхом для CC0/власних текстур; завантаження дозволене тільки до localhost, за замовчуванням діє dry-run.
- [x] Перевірити CLI-контракти `pnpm test:run scripts/assets/tiles/__tests__/upload-lib.test.ts`; усі 8 тестів пройшли.
- [ ] Задокументувати формати/ліцензії кожного пілотного ресурсу; не запускати мережеве завантаження в межах цього кроку без тестового target.
- [ ] Коміт: `feat(map-editor): add tile asset spike and validation`.

## Task 2: Additive chunk schema та сумісні кодеки

**Files:**
- Modify: `prisma/schema.prisma` (`BattleMapChunk.tileLayers Json? @map("tile_layers")`, чинний composite key)
- Create: `prisma/migrations/20261204000000_battle_map_tile_layers/migration.sql` (лише expand/data-preserving; застосування поза цим кроком за окремим рішенням)
- Modify: `prisma/__tests__/migrations-rls.test.ts`
- Modify: `lib/utils/battle/map-storage/edge-chunks.ts` і його тести
- Create: `lib/utils/battle/tiles/{types,chunks,rle}.ts`
- Create: `lib/utils/battle/tiles/__tests__/{chunks,rle}.test.ts`

**Interfaces:**
- `TileLayer = 'ground' | 'wallfill' | 'objects' | 'edge-art'`; ключі JSONB відповідають цим рядкам.
- `encodeTileChunk(cells: Uint16Array): string` / `decodeTileChunk(data: string): Uint16Array` — рівно 256 значень; запис version tag `r1:`; run/value кодуються little-endian `Uint16`.
- `encodeEdges`/`decodeEdges` зберігають поточний публічний контракт; старі DB row adapters трактують `tile_layers = NULL` як edge-only; нові tile rows зберігають порожні ребра у `data`.

- [x] Тести сумісності: старий edge chunk із 256 байтів base64 декодується поточним `decodeEdges`, row adapter читає `tile_layers = NULL` як edge-only і не передає base64 у RLE-декодер.
- [x] Тести RLE: кодування/декодування 256 клітинок, порожній чанк, межі довжини серії, ID 0/65535, некоректний тег, нульова серія, переповнення/недостатня довжина виходу, невідома версія.
- [x] Запустити `pnpm test:run lib/utils/battle/map-storage/__tests__/edge-chunks.test.ts`, `pnpm test:run lib/utils/battle/tiles/__tests__/chunks.test.ts` і `pnpm test:run lib/utils/battle/tiles/__tests__/rle.test.ts`; усі три suite пройшли.
- [x] Додати nullable `tile_layers Json?` у Prisma; чинний PK `(mapId,cx,cy)` лишається без змін, старі записи лишаються `NULL` і читаються як ребра.
- [x] Створити expand-only SQL лише з `ADD COLUMN tile_layers JSONB`; без backfill/PK/FK/RLS changes. Не застосовувати міграцію.
- [x] Оновити RLS migration guard і перевірити additive-форму; `pnpm test:run prisma/__tests__/migrations-rls.test.ts` пройшов.
- [x] Повторно запустити edge, chunk adapter і RLE файли окремо; усі пройшли.
- [ ] Коміт: `feat(map-editor): add layered tile chunk format`.

## Task 3: Каталог і шарове збереження бібліотечної карти

**Files:**
- Create: `lib/constants/tilesets/{types,catalog}.ts` і тести
- Modify: `types/battle.ts`, `types/battle-map.ts`, `lib/schemas/battle-maps.ts`
- Modify: `lib/server/battle-maps/{assemble,library-service}.ts`
- Modify: `app/api/campaigns/[id]/maps/[mapId]/route.ts` або новий sibling handler для tile patches
- Create: `app/api/campaigns/[id]/maps/[mapId]/tiles/route.ts` та tests
- Modify: `lib/api/battle-maps.ts`, `lib/hooks/battle-maps/*`, `lib/server/battle-maps/__tests__/library-service.test.ts`

**Interfaces:**
- `TileChunkPatch = { layer: TileLayer; cx: number; cy: number; data: string | null }` (`null` видаляє порожній шаровий чанк).
- `getTileChunks(mapId, keys?, version?)` повертає тільки запитані чанки/шари; `patchTileChunks(mapId, expectedVersion, patches)` версіює карту атомарно й не змінює інші шари.
- Endpoint дозволяє читання учаснику кампанії з доступом до карти, а запис — лише DM з увімкненим `mapLibraryEnabled`; застосовує ліміти тіла й координат. URL активів публічно читаються, як у наявному `battle-maps` bucket.

- [ ] Написати тести сервісу на читання порожніх/старих/нових шарів, зміну одного ключа, видалення порожнього чанка, збереження ребер і всіх інших шарів, rollback версії та 409 при застарілому `expectedVersion`.
- [ ] Запустити `pnpm test:run lib/server/battle-maps/__tests__/library-service.test.ts`.
- [ ] Додати typed catalog із provenance/license, tile ID, variant assets/weights, footprint, autotile kind і `blocks`/`blocksSight`; перевірити унікальність ID та asset refs окремим тестом.
- [ ] Додати Zod схему патчів: лише відомі layers, координати в межах карти, максимум патчів/body bytes, дозволені tile IDs, version tag; typed 400/413/409 errors.
- [ ] Реалізувати транзакційний сервіс, що оновлює лише передані ключі шарів і збільшує `mapVersion` один раз; знімок/rollback зберігає всі шари, старий `payload.chunks` продовжує декодувати ребра. Спершу розгорнути сумісне читання, а запис тайлів увімкнути лише після оновлення всіх читачів; сумісний writer має зберігати `tile_layers`; після появи tile data не відкочуватися до старого writer.
- [ ] Додати маршрут/API/хук і тести доступу: не-ДМ, чужа кампанія, прапорець вимкнено, некоректне тіло, завеликий запит, конфлікт, успіх.
- [ ] Запустити кожен змінений тестовий файл окремою командою `pnpm test:run <шлях>`.
- [ ] Коміт: `feat(map-editor): persist tile chunk patches`.

## Task 4: Autotile, варіанти та похідні властивості карти

**Files:**
- Create: `lib/utils/battle/tiles/{autotile,variant,diff,derive}.ts`
- Create: `lib/utils/battle/tiles/__tests__/{autotile,variant,diff,derive}.test.ts`
- Modify: `lib/utils/battle/tiles/index.ts`

**Interfaces:**
- `edgeMask(neighbors: EdgeNeighbors): 0..15`; `variantFor(mapSeed, x, y, tileId, variants): number` є чистою і детермінованою.
- `diffTileChunks(layer, before, after): TileChunkPatch[]`, де `before` і `after` — записи `cx:cy` → `Uint16Array`.
- `deriveTileCells({ chunks, cols, rows, version }, catalog): DerivedTileCells`, де `chunks` — шарові записи `cx:cy` → `Uint16Array`; кеш ключується ідентичністю чанків/каталогу та версією/розміром карти.

- [ ] Тести 16 autotile edge masks, меж карти й однаковості маски для сусідів; наземне згладжування окремо перевіряє стабільність маски/noise seed.
- [ ] Тести детермінованого варіанта незалежно від порядку викликів; зміна seed міняє вибір у контрольному наборі координат.
- [ ] Тести diff для unchanged, changed, inserted/deleted chunks і того, що patch включає лише фактичні ключі.
- [ ] Тести derived blocked/blocksSight, крайових object footprints і cache invalidation при новій версії.
- [x] Запустити явними командами тести `autotile`, `variant`, `diff` і `derive`; усі 25 тестів пройшли.
- [x] Реалізувати чисті модулі autotile/варіантів/diff/derived cells; v1 використовує 16 станів edge mask, каталог зберігає розширюваний формат для майбутнього blob-47. Згладжування ground меж лишається залежним від Spike 3.
- [ ] Коміт: `feat(map-editor): add tile autotile and chunk diffs`.

## Task 5: Canvas-рендер видимих чанків

**Files:**
- Create: `components/battle/map/tiles/{TileCanvas,drawTileChunk,chunk-cache}.tsx` (за потреби рознести pure painter у `.ts`)
- Create: `components/battle/map/tiles/__tests__/TileCanvas.test.tsx`
- Modify: `components/battle/map/{BattleMap,MapStage}.tsx`, `components/battle/map/grid/GridLayer.tsx` лише для layer stacking/props
- Reuse: `lib/hooks/battle/useGridWindow.ts`, `GridWindow`, CTM viewport, `Image`/asset cache patterns якщо є

**Interfaces:**
- `TileCanvas` споживає `{ map, chunksByLayer, catalog, window, cameraMatrix, pixelRatio }` і малює позаду наявних інтерактивних/DOM layers.
- Painter має чистий `drawTileChunk(ctx, chunk, assets, tileSize, seed)`; кеш ключується map/version/layer/cx/cy/DPR і інвалідується тільки зміненим ключем.

- [ ] Тест малювання: повторення/варіант/autotile ґрунту, wallfill уздовж семантичних ребер стін, edge-art без зміни логіки дверей, footprint об'єкта й альфа-композиція.
- [ ] Тест вікна перегляду: малюються лише чанки у `GridWindow` з відступом на footprint; невидимі чанки не декодуються й не малюються.
- [ ] Тест кешу: змінений чанк інвалідується, сусідні лишаються; зміна DPR перестворює bitmap без зміни координат сітки.
- [ ] Тест контракту: Canvas не додає/не видаляє `[data-fx-grid]` чи `data-fx-*`; `cellPoint` через CTM працює з Canvas-підкладкою.
- [ ] Реалізувати Canvas 2D; `OffscreenCanvas` застосовувати лише якщо доступний, fallback — звичайний canvas. Рендерити лише texture assets, потрібні видимому вікну.
- [ ] Інтегрувати шар між фото-фоном і SVG/DOM шарами згідно зі специфікацією; підтвердити, що старі карти без метаданих і чанків тайлів мають той самий вигляд.
- [ ] Запустити `pnpm test:run components/battle/map/tiles/__tests__/TileCanvas.test.tsx` та наявний grid/FX test, якщо він змінений.
- [ ] Коміт: `feat(map-editor): render visible map tile chunks`.

## Task 6: Інструменти редактора, історія та інтеграція чернетки

**Files:**
- Create: `lib/hooks/battle-maps/useTileEditor.ts` і unit/component tests
- Create: `components/maps/tiles/{TileEditorPanel,TilePalette,TileToolBar}.tsx`
- Modify: `components/maps/MapEditorScreen.tsx`, `components/maps/__tests__/MapEditorScreen.test.tsx`
- Modify: `lib/hooks/battle-maps/useMapEditorDraft.ts`, map editor hooks barrel
- Reuse: pointer/CTM mapping, `useStrokePaint`, desktop map editor layout, `mapLibraryEnabled` hook

**Interfaces:**
- `useTileEditor({ chunks, mapSize, catalog, save })` exposes `activeLayer`, `tool`, `selectedTileId`, `brushSize`, `dirtyPatches`, `undo`, `redo`, `paintStart/move/end`, `sampleAt`, `save`.
- History action = один stroke або завершена shape/fill; entry містить клітинкову до/після дельту, об'єднану по чанках; bounded history має byte/count cap.

- [ ] Тести хука: пензель 1/2/3, лінія, прямокутник, обмежена заливка, гумка, піпетка, ізоляція шарів, скасування вказівника, межі груп undo/redo, ліміт історії, очищення лише підтверджених патчів після збереження.
- [ ] Тести `MapEditorScreen`: палітра/інструмент/шари, повідомлення про редактор лише для комп'ютера на touch, поєднання фото й тайлів, приховування/блокування за вимкненого прапорця, клавіатурні undo/redo не перехоплюють ввід тексту.
- [ ] Реалізувати незмінні операції редагування та групування штрихів; не зберігати знімок усієї карти для кожного кроку історії.
- [ ] Вбудувати `TileEditorPanel` у `MapEditorScreen` бібліотеки карт; setup лишається вибором карти. Зберегти камеру/панорамування/масштаб і використовувати CTM для вибору клітинки; повторно використати поточні жести карти.
- [ ] Зберігати лише змінені патчі `(layer,cx,cy)` з `expectedVersion`; при 409 лишити локальну чернетку й запропонувати перезавантаження/розв'язання конфлікту; підтверджені чанки стають новою базою undo-історії.
- [ ] Запустити `pnpm test:run lib/hooks/battle-maps/__tests__/useTileEditor.test.tsx` і `pnpm test:run components/maps/__tests__/MapEditorScreen.test.tsx`.
- [ ] Коміт: `feat(map-editor): add tile editing tools and undo`.

## Task 7: Системна перевірка, документація та гейти

**Files:**
- Modify: `docs/architecture/map-modes.md`, `docs/architecture/battle.md`, `docs/STATUS.md`
- Modify: всі змінені файли після review

- [ ] Оновити архітектурні документи: ID шарів чанків/старий формат, tile RLE, права/прапорець, ліміт активів, шари Canvas, undo/save і FX-контракт.
- [ ] Оновити `docs/STATUS.md`: прогрес етапу E й перелік невиконаних перевірок у браузері та battle-sweep як відкладених; не запускати їх.
- [ ] Зробити self-review від `git diff`: звірити файли/типи/помилки/ліміти/rollback/legacy, переконатися, що реалізація на базі `feb6088c4` та що немає файлів в інших worktree.
- [ ] Запустити ESLint лише на змінених файлах: `pnpm exec eslint --fix <список змінених файлів>`.
- [ ] Перед важкими гейтами виконати `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; зупинити перевірки, якщо вони конкурують, і не залишати процес понад 5 хв.
- [ ] Запустити повний `pnpm test:run` рівно один раз наприкінці; якщо процес завис понад 5 хв — зафіксувати як завислий, не запускати дубль.
- [ ] Запустити `tsc` рівно один раз наприкінці.
- [ ] Браузерний прогін і battle-sweep лишаються відкладеними в `docs/STATUS.md`; не запускати повний `pnpm lint`.
- [ ] Комітити маленькі логічні порції; не пушити й не merge у `main`.

## Порядок залежностей

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7. Формат і API мають бути затверджені перед renderer/editor; Canvas не повинен блокувати окреме завершення asset spike чи codec review. Після написання коду виконати фінальне незалежне review згідно вибраного власником execution approach.
