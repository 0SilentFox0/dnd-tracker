# S1: map editor lib/utils + lib/server/battle-maps + map routes (main d871500da)

## 1. Оцінки (шкала 0-10; стара оцінка "генератор карт" 5.5: якість 5.5, перевикористання 4.5, безпека 7, арх. 7, тести 5)
- Якість коду (slice): **8** (було 5.5). 0 `as unknown as`/`as any` у tiles, fog, uvtt, grid, map-storage, battle-maps (rg). Найдовші: `parseUvtt` ~154 рядки (uvtt/parse.ts:328), `patchTileChunks` ~146 (tiles-service.ts:88), `saveMap` ~106 (library-service.ts:352), `fogView` ~100. 0 функцій >150 у lib/server; найбільший файл `grid/map-scene.ts` 694 (<700, але на межі). Мірило довжини моє, наближене (лічильник дужок).
- Перевикористання: **7** (було 4.5). Один `cellKey` (grid/geometry.ts:18), один `clamp` (lib/utils/common/clamp.ts, 27 імпортів), одна точка декоду зображень (lib/utils/common/image-decode.ts: єдині `createImageBitmap` і `new Image`). Але CHUNK_SIDE досі не один, див. M1.
- Тести: **7** (було 5). Є тести для всіх основних модулів tiles/fog/uvtt/map-storage/battle-maps (6/4/1/6/6 файлів), grid 38. Без прямого тесту: grid/{adjacency,adjacent-attack,edge-diff,push,reach-check,sight}, uvtt/normalize-background, map-storage/relink-scene, server/{assemble,campaign-limits}, tiles/types, fog/constants (частина покрита побічно, не перевірено). Маршрутів: з `__tests__` лише maps, maps/background-upload(+discard), maps/[mapId]/tiles, battles/map-fog.
- Безпека (slice): **7.5** (було 7). `player-access.ts` є; прямого `prisma` у map-маршрутах немає (rg по maps/ і map-* порожньо). Тести IDOR/приватності на рівні маршруту лише для частини маршрутів.
- Архітектура (slice): **8**. Маршрути тонкі (найбільший maps/[mapId]/route.ts 133 рядки), battle-мутації у `lib/server/battles/mutations/map-*` з тестами.

## 2. Що змінилось з 2026-11-17 (докази)
- Один `clamp`/`cellKey`/image-decode підтверджено у коді (див. вище). `as unknown as` у slice 0.
- `chunkKey/parseChunkKey/CHUNK_SIDE/CHUNK_CELLS` централізовано в map-storage/chunk-key.ts (CHUNK_SIDE = MAP_LIMITS.chunk), використовують tiles/*, edge-chunks, assemble, library-service, tiles-service.
- Мутації карти покриті тестами у lib/server/battles/__tests__/mutations (map-update-limit, map-walls) і mutations/map-door-toggle/__tests__.

## 3. Відкриті дефекти
- **M1** (критерій плану "один CHUNK_SIDE" НЕ виконано): локальні `const CHUNK_SIDE = 16` у components/battle/map/tiles/chunk-cache.ts:102, painter.ts:24, assets.ts:6 + аліас `CHUNK_SIZE` в map-storage/edge-chunks.ts:8 (+ використання в :10,:34,:72). Фікс: імпортувати `CHUNK_SIDE` з chunk-key.ts; прибрати аліас.
- **M2**: ключ чанка `${cx}:${cy}` інлайном замість `chunkKey()`: chunk-cache.ts:135,157; painter.ts:38,232; assets.ts:52; edge-chunks.ts:72; library-service тест 528. Фікс: `chunkKey(cx,cy)`.
- **M3**: 4 інлайн `Math.max(.., Math.min(..))` замість `clamp` у slice (rg); дрібно.
- **I1**: маршрути без тестів на рівні route: maps/[mapId] (GET/PATCH/DELETE, 133 рядки), maps/[mapId]/clone, world/maps*, battles/[battleId]/map-{update,walls,terrain,door-toggle,edge-remove,background,weather,motion}. Логіка частково покрита тестами мутацій, але auth/IDOR/DM-only на рівні маршруту не перевірені. Фікс: route-тести 401/403/404 для maps/[mapId], clone та DM-only мутацій.
- **M4**: `parseUvtt` ~154 рядки, `patchTileChunks` ~146, `saveMap` ~106 (library-service.ts:352) — на межі ліміту 150; розбити на кроки (валідація / нормалізація / запис).
- **M5**: grid/map-scene.ts 694 рядки (ліміт 700): розділити перш ніж росте далі.
- **M6**: мертвого коду майже немає: `chunksToRecord` (assemble.ts) і `splitTileSnapshot` (tiles-service.ts:63, експортується, використовується лише всередині) мають 0 зовнішніх споживачів у prod-коді; прибрати `export`/видалити. `clearGeometryCache` використовується лише у тесті (ок).

## 4. Не перевірено
- Покриття по рядках/гілках цих файлів (vitest заборонено); побічне покриття файлів без прямого тесту.
- Точні довжини функцій (наближений підрахунок; вкладені стрілки можуть спотворювати).
- Реальна поведінка авторизації у map-* маршрутах (читав лише відсутність прямого prisma, не тіла helper-ів).
- UI-частину (components/maps, components/battle/map) — поза slice, крім CHUNK_SIDE.
