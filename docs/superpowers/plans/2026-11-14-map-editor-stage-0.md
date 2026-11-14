# Редактор мап — етап 0: сховище карт (план)

Spec: `docs/superpowers/specs/2026-11-13-map-editor-design.md` §5.1, §6, §6.1. Епік: `docs/superpowers/plans/2026-11-13-map-editor.md` («Етап 0»). Гілка `feat/map-editor` (після етапу B). Міграція — лише expand-only + RLS; **не застосовувати на prod, не пушити** (рішення власника).

## Обсяг (рішення користувача 2026-11-14)
**Входить:** `MAP_LIMITS`; бібліотека карт кампанії (`battle_maps`, `battle_map_chunks`, `battle_map_versions`) із серверним API та ETag; бій посилається на карту (`battle_scenes.map_id/map_version`); шар стану `battle_map_state` (removedEdges, doors, fog — колонки закладено, споживає лише removedEdges); `edgeBlocks` читає «карта + стан» через ефективну карту; дельти стану окремі; снапшоти/rollback зі станом; мутації `map-edge-remove` і `map-update` (лише сервер).
**НЕ входить (етап 0b, окремий):** сторінка DM «Карти», вибір карти у формі бою, кнопка «оновити карту», feature flag кампанії (механізму немає — буде колонка `Campaign`), whats-new/онбординг (немає UI), B6 повністю (двері як тип ребра, `map-door-toggle`), карти як контент.

## Reuse-перевірка
- `grid/walls.ts` (`edgeKey`, `parseEdgeKey`, `wallSet`), `grid/edges.ts` (`wallsOf`/`blockingSet`/`edgeBlocks`) — **не міняємо сигнатури**; стан вбудовується в ефективну карту (WeakMap-кеш за ідентичністю масивів, як `wallsOf`).
- `pipeline/client-delta.ts` `diffEdges` + `EDGE_DIFF_LIMIT`, `apply-delta` — розширюємо, не дублюємо.
- `runBattleMutation` + шаблон `mutations/map-walls/`, `REJECT` (`lib/constants/api-errors.ts`), `lib/utils/api` (`parseBody`, `loadOwned`, `requireDM`, `errorResponse`).
- Bucket/image-storage не потрібні (фон лишається URL сховища `battle-maps`).
- Нове потрібне, бо аналогів немає: ETag/304 хелпер (`lib/utils/api/etag.ts`), чанкове кодування ребер, `MAP_LIMITS`.

## Рішення
1. **Ефективна карта.** `composeEffectiveMap(base: BattleMapConfig, state: BattleMapState | null, libEdges?: LibraryEdges): BattleMapConfig` — повертає `base` + `walls/bars` з бібліотеки − `state.removedEdges` (з walls і bars; `modeWalls` не чіпаємо). Стабільний результат: `WeakMap<base, WeakMap<state|NULL, …>>` + кеш за `libEdges`. Усі споживачі (`edgeBlocks`, path, sight…) читають **ефективну** карту без змін. Сервер: `loadBattle` віддає `meta.map` = ефективна; `meta.mapRef`, `meta.mapState` окремо. Клієнт: `useBattleScene` компонує те саме.
2. **Бій із бібліотечною картою (`mapRef`).** `battle_scenes.map` зберігає лише «шапку» (cols/rows/margins/background/terrain/mode/weather/motion…, без `walls`/`bars`); ребра — у бібліотеці, pinned за `map_version`. Збереження (`saveBattle`) для linked-бою **вилучає** `walls`/`bars` із запису. В бою ребра linked-карти правляться лише через стан (`map-edge-remove`) або «оновити карту»; `map-walls` на linked → `REJECT.mapEdgesLinked`. Inline-карти без `map_id` працюють як досі; стан теж застосовний до них.
3. **Версії.** `battle_maps.map_version` росте на кожен save бібліотеки; `battle_map_versions(map_id, version, payload)` зберігає знімок ребер+шапки; при save прунимо версії `< current`, на які не посилається жоден `battle_scenes.map_version` цього `map_id`. Бій читає **свою** pinned-версію (immutable → `Cache-Control: private, max-age=31536000, immutable` для `?version=N`; без `version` — `private, max-age=0, must-revalidate` + weak ETag `W/"<mapId>-<version>"`, 304).
4. **Кодування ребер** (`lib/utils/battle/map-storage/edge-chunks.ts`): чанк 16×16 = 2 біти/ребро (`e` і `s`, 512 біт = 64 байти на тип… фактично 2×256×2 біт = 128 байт): 0 нічого, 1 стіна, 2 ґрати, 3 зарезервовано (двері, B6). API лишається на ключах `"x:y:e"`; кодування лише на межі БД/мережі. Мережа/БД: base64 рядок на чанк. Бібліотечний ліміт ребер `MAP_LIMITS.libraryMaxEdges = 2*200*200`, inline лишається 7200.
5. **MAP_LIMITS** (`lib/constants/map-limits.ts`): `{ minSide:4, photoMaxSide:60, tileMaxSide:200, inlineMaxEdges:7200, libraryMaxEdges:80000, chunk:16, maxTerrainCells:3600, doorsMax:500 }`. Живить Zod (`schemas/battles.ts`: walls/bars/maze.walls, terrain), `MAX_SIDE`/`MAX_MAP_EDGES` у `grid/map-editor.ts`, `background.ts`, `useBattleMapEditor`, `BattleFormMap`. Фото-карти (з `background`) ≤ 60; карта без фону в бібліотеці ≤ 200. Розстановка 200×200 у боях НЕ вмикається, доки не буде етапів C/D (мутація create-battle з `mapId` відхиляє карту > `photoMaxSide`, поки feature не відкрито: `MAP_LIMITS.battleMaxSide = 60` тимчасово).
6. **Стан.** `battle_map_state(battle_id PK/FK, removed_edges text[]/Json, doors Json, fog Json?, version int, updated_at)`. Тип `BattleMapState { removedEdges: string[]; doors: Record<string,{open:boolean;locked?:boolean}>; fog?: …}` у `types/battle.ts`. Дельта: `ClientBattleDelta.mapState?: { removed?: {add:string[];remove:string[]}; doors?: Record<string, DoorState|null> }` (патч за ключем, `null` = прибрати). `applyBattleDelta` застосовує до `scene.mapState`; перевищення `EDGE_DIFF_LIMIT` → `refetch`. Карта в дельті стану не їде.
7. **Снапшоти.** `SnapshotState.scene.mapState?` пишеться лише коли непорожній/змінився (`stateHash` порівнянням JSON у `buildSnapshotState`); `mapVersion` не пишемо (pinned у `battle_scenes`, «оновити карту» — не rollback-able; `rollback` відхиляє стрибок через `map-update`: якщо `mapVersion` снапшота ≠ поточний → `REJECT.rollbackAcrossMapUpdate`; для цього снапшот зберігає `mapVersion`, коли linked). Rollback відновлює `mapState` (upsert/delete).
8. **Feature flag відкладено**: етап 0 лише додає таблиці/API/мутації; жоден існуючий бій не змінюється (inline), створення бою з `mapId` — лише через API.

## Задачі (виконавці Sonnet; тести пишуться з кодом; `pnpm test:related`, `eslint --fix` по торкнутих файлах)

### T0 — хвости B (малий)
- M2: `paintEdges` повертає `{ map, overflow }`; `useBattleMapEditor` показує сповіщення при overflow (ключі i18n uk/en). M3: сервер `map-walls` стирання `kind: both` прибирає ребро і зі `walls`, і з `bars` (тест). Подвійний тост у `useMapTerrainTool` (`makeBattleHook onError` + `edgesFailed`) — лишити один; тест. M6 — лишити в STATUS як відкритий.
- Файли: `grid/map-editor.ts`, `useBattleMapEditor.ts`, `mutations/map-walls/*`, `useMapTerrainTool.ts`, `messages/*`.

### T1 — `MAP_LIMITS`
- `lib/constants/map-limits.ts`; замінити літерали/дублі (див. §5) без зміни поведінки; тест `map-limits.test.ts` (інваріанти: `photoMaxSide ≤ tileMaxSide`, `libraryMaxEdges = 2·tileMaxSide²`) + наявні schema-тести проходять.

### T2 — чиста частина (`lib/utils/battle/map-storage/`)
- `edge-chunks.ts`: `encodeEdges({walls,bars}, cols, rows): Record<"cx:cy", string>` / `decodeEdges(chunks, cols, rows): {walls,bars}` (детермінований порядок; порожні чанки не пишуться). Тести: roundtrip 3 розміри (4×4, 17×17, 200×200 з великою щільністю), ребра на межі чанка, невалідний base64/довжина → кидає типізовану помилку.
- `effective-map.ts`: `composeEffectiveMap` (див. рішення 1), чисті `diffMapState(before,after)`, `applyMapStateDelta(state,delta)`. Тести: віднімання зі walls/bars, ідентичність результату (стабільні посилання, `===` для тих самих входів), `modeWalls` не віднімається, `null` стан = `base`, `edgeBlocks` через ефективну карту дає прохід на видаленому ребрі, але не на сусідньому.
- Типи в `types/battle.ts` (`BattleMapState`, `BattleMapRef {mapId; version}`), `types/battle-map.ts` (бібліотека: `BattleMapBrief`, `BattleMapFull`).

### T3 — Prisma + міграція
- Моделі `BattleMap` (`battle_maps`: id, campaignId FK, name, cols, rows, header Json, mapVersion Int @default(1), createdAt/updatedAt, @@index(campaignId)), `BattleMapChunk` (`battle_map_chunks`: mapId, cx, cy, data String, @@id([mapId,cx,cy])), `BattleMapVersion` (`battle_map_versions`: mapId, version, payload Json, @@id([mapId,version])), `BattleMapState` (`battle_map_state`, див. §6), `BattleScene.mapId String?`, `mapVersion Int?` (+ індекс mapId, без FK на `battle_maps`, щоб видалення карти не каскадило бій: код блокує видалення карти, що використовується). Міграція `20261202000000_battle_map_storage`: CREATE TABLE ×4 + `ENABLE ROW LEVEL SECURITY` на кожну, ADD COLUMN ×2, FK-и тільки на `campaigns`/`battle_scenes` (ON DELETE CASCADE). Ніяких DROP. Застосувати локально (`pnpm exec prisma migrate dev`, Docker DB) і перевірити, що auto-generated міграція не містить 12 «content FK drift» `ADD CONSTRAINT` (db-deploy rule), `pnpm exec prisma generate`; `migrations-rls.test.ts` проходить. НЕ застосовувати на prod.

### T4 — сервіс бібліотеки + API
- `lib/server/battle-maps/`: `library-service.ts` (`listMaps`, `createMap`, `getMap(mapId, version?)`, `saveMap` (bump version, write version row, replace chunks у транзакції, prune), `deleteMap` (409 якщо є `battle_scenes.map_id` = id), `cloneMap`), `assemble.ts` (chunks+header → `{header, walls, bars}`; мемо LRU 32 за `mapId:version` для `loadBattle`).
- Zod `lib/schemas/battle-maps.ts` (name ≤ 80, cols/rows ≤ `tileMaxSide`, фото-карти з `background` ≤ `photoMaxSide`, фон лише URL сховища — data-URL відхиляється, ребра ≤ `libraryMaxEdges`, ребра в межах cols/rows).
- Routes `app/api/campaigns/[id]/maps/route.ts` (GET список, POST), `maps/[mapId]/route.ts` (GET з weak ETag/304 і `?version=`, PUT, DELETE, лише DM для запису, члени кампанії читають), `maps/[mapId]/clone/route.ts`. Тонкі: `parseBody`, `requireCampaignAccess`/`requireDM`, `loadOwned`. `lib/utils/api/etag.ts` (`weakEtag(parts)`, `ifNoneMatch(req, etag)` → 304). Тексти помилок у `lib/constants/api-errors.ts` (Ukrainian) + `REJECT` ключі.
- Тести: сервіс (мок prisma як у сусідніх тестах), роути (200/304/403/404/409), prune (версія з посиланням лишається).

### T5 — інтеграція в бій (сервер)
- `createBattleRecord`: опційний `mapId` (+`mapVersion` = поточна) — шапка копіюється в `battle_scenes.map`, пишеться `map_id/map_version`; відхилення при карті > `battleMaxSide`, чужій кампанії.
- `loadBattle`: підтягує `battle_map_state` і (для linked) ребра pinned-версії; `meta.map = composeEffectiveMap(...)`, `meta.mapRef`, `meta.mapState`. `toBattleResponse`: для linked віддає `map` БЕЗ `walls/bars` + `mapRef` (клієнт компонує) і завжди `mapState`.
- `saveBattle`: `patch.mapState` → upsert/delete у транзакції + bump `version` стану; для linked вилучає `walls/bars` з `patch.map` перед записом; `SnapshotState.scene.mapState` (+`mapVersion`) за рішенням 7; `rollback-mutation` відновлює стан і відхиляє через `map-update`.
- `map-walls` мутація: linked → `REJECT.mapEdgesLinked`.
- Тести: loadBattle linked/inline, save strip, snapshot roundtrip, rollback зі станом і через map-update, `create` з mapId.

### T6 — дельти стану + мутації `map-edge-remove`, `map-update`
- `client-delta.ts`: `mapStateChange(before,after)` (використовує `diffMapState`), `ClientBattleDelta.mapState`; `apply-delta.ts` застосовує; тести `client-delta`/`apply-delta` (дельта стану не містить карти; великий diff → refetch).
- `mutations/map-edge-remove/` (Zod: `{ edges: string[] ≤ MAP_EDGES_PER_OP, restore?: boolean }`, лише ДМ, активний бій; ребро мусить існувати серед core walls/bars ефективної карти (на restore — у removedEdges); результат — `patch.mapState`; не змінює `battle_scenes.map`) + route `map-edge-remove`; `battleOps` запис (`lib/api/battle-ops.ts`) з `retryOnConflict`, `blockedByMode: true`, як `map-walls`.
- `mutations/map-update/` (ДМ, лише linked): підтягує поточну версію карти, перевіряє, що жоден учасник не стоїть у клітинці, яка в новій версії стає непрохідною/виходить за межі (`impassableSet` + межі), чистить `removedEdges`, яких нема в новій карті; пише `map_version` + оновлену шапку (зберігаючи runtime-поля: terrain, weather, motion, mode); помилка `REJECT.mapUpdateCollision` із переліком учасників.
- Тести кожної мутації + `battle-ops.test.ts` оновити.

### T7 — клієнт
- `types/battle-map.ts` (див. T2), `lib/api/battle-maps.ts` (`list/get/create/update/delete/clone`, `get` з `version`), `lib/hooks/battle-maps/{keys,useBattleMaps,useBattleMapEdges,index}.ts` (`battleMapKeys.edges(mapId, version)`, `staleTime: Infinity` для pinned-версії), `battleOps.mapEdgeRemove/mapUpdate`.
- `useBattleScene`: якщо `scene.mapRef` — підтягує `useBattleMapEdges` і повертає `scene` з ефективною картою через `composeEffectiveMap` (memo за `[scene.map, scene.mapState, edges]`); поки ребра не завантажені — `isMapLoading` (не рендерити карту/бій-дії). `useBattle` query: `structuralSharing: false` (зсув дельт > глибоке порівняння).
- Тести (happy-dom де потрібно): компонування, поки грузиться, перехід версії після `map-update`-дельти.

### T8 — docs та sweep
- `docs/architecture/{map-modes,battle}.md` (ефективна карта, стан, mapRef, дельти, rollback-правило), `docs/architecture/db`-згадка якщо є, `docs/STATUS.md` (закрити хвости B, відкриті: 0b UI/flag, M6, B6, ліміт розстановки 60 до C/D), `scripts/sim/battle-sweep.ts` сценарій `mapStateCheck` (linked-бій: прохід через removed ребро, rollback) поряд із `mapWallsCheck`.
- Правило ratchet/`ui-layers`/`system-contract` не зачіпаємо; запустити відповідні тести наприкінці.

## Порядок диспетчеризації (паралель лише без спільних файлів)
Пачка 1: T0 ‖ T1 → T2 → T3 → T4. Пачка 2: T5. Пачка 3: T6 → T7. Пачка 4: T8. Кожен виконавець у brief отримує свій розділ плану та рішення 1–8; ledger — `.superpowers/sdd/2026-11-14-map-editor-stage-0/progress.md`.

## Гейти (наприкінці, обов'язкові)
ps-перевірка → `tsc --noEmit` → повний `pnpm test:run` → `pnpm battle-sweep` на prodcopy (+ `mapWallsCheck`, `mapStateCheck`) → живий прогін Sonnet-субагентом (desktop 1280 / mobile 375: стіна/ґрати/regression maze, редактор ребер setup+бій, `map-edge-remove` і linked-бій через API/DB-seed, збереження/відновлення стану) → `/simplify` (1–2 агенти) → одне Opus-рев'ю diff етапу 0 + одна fix-хвиля → affected-тести → docs/STATUS/пам'ять.
