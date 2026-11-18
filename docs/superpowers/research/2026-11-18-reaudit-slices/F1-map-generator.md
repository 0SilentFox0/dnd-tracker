# F1 — Генератор/редактор карт: повторний аудит (main d871500da)

Метод: лише читання коду (rg/wc/git), тести/tsc/eslint не запускались. Повністю прочитано: `uvtt/parse.ts`, `grid/edges.ts`, `fog/{reveal,revealed-runs,fog-view}.ts`, `tiles/{chunk-cache,painter}.ts`, `TileCanvas.tsx`, `camera/camera.ts`, `useMapCamera.ts`, `tiles-service.ts` (patch), маршрути `maps/**`, `player-access.ts`, `background-upload.ts`.

## 1. Оцінки (було → стало, ціль 9)

| Критерій | Було | Стало | Чому |
|---|---|---|---|
| Якість коду | 5.5 | **7.5** | 0 `as unknown as`/`any`/`eslint-disable`/TODO у всьому зрізі; `MapEditorScreen` 928 → 242. Але `BattleMap.tsx` 436 і `MapStage.tsx` 408 рядків (критерій «0 компонентів > 400» не виконано), `useBattleMapScene` — одна функція 264 рядки. |
| Перевикористання | 4.5 | **7** | Один стек камери (`useMapCamera` + `usePanPinch`), `clamp`, `image-decode` (єдина точка `createImageBitmap`). Але `CHUNK_SIDE = 16` оголошено тричі локально поруч з експортованим, ключ чанка `${cx}:${cy}` інлайном 5 разів. |
| Безпека | 7 | **7.5** | Бібліотека DM-only (`requireDM` + `loadOwned` + rate limit), гравець читає лише закріплену версію, sniff фону. Туман війни — лише клієнтський фільтр. |
| Архітектура | 7 | **8** | Чисті шари: pure-алгоритми в `lib/utils/battle/*`, сервіс у `lib/server/battle-maps`, тонкі маршрути, 0 `fetch`/`@/lib/api` у компонентах. |
| Хуки | 4.5 | **7.5** | 0 хук-файлів > 300 (макс. 300), `keys.ts` є, `useBattleMapFog` рахує `fogView` один раз. Лишились 264- і 246-рядкові тіла хуків, 1 deep type-import. |
| Тести | 5 | **7** | Додано `MapStage`, `GridStatic`, `GridHit`, `MapFogLayer`, `EdgeEditor`, `DoorMenu`, `chunk-cache`, `painter`, +12 ворожих входів UVTT. Без прямих тестів: `useCameraFollow`, `useCameraFlight`, `useBattleMapFog`, `useUvttImport`, `useTileSave`, `useMapEditorWorkspace`, `useBattleMapEdges`. |
| UI-kit | 4 | **8** | 1 сирий `<button>` (`MapToken.tsx:75`, у baseline), решта на `HudToggleChip`/`HudToolbar`/`Slider`/`FileButton`/`QueryState`. Мінус: ~39 хардкод-кольорів у SVG-шарах. |
| **Разом** | 5.5 | **7.5** | Ціль 9 не досягнута. |

### Найскладніші алгоритми

- **UVTT-парсинг — 8.** Ліміти на JSON/байти/пікселі, розміри з перших 64 символів base64 (PNG/VP8/VP8L/VP8X розібрано коректно), толерантне округлення, `warnings` замість падіння, ліміти стін і дверей. Мінуси нижче (I3, M4, M5).
- **Крайові стіни (`edges.ts`) — 8.5.** WeakMap-кеші об'єднань за ідентичністю масивів, діагональ через `cornerOpen`, `passesWalls` через `collectModifiers`. Коректність тримається на іммутабельності `map.walls`/`doors`.
- **Туман — 7.** `revealed-runs` (нормалізація, бінарний пошук, різниця) акуратний і протестований; BFS кімнати коректний. Але це не захист даних (I1), а bypass будує Set усіх клітин (до 200×200) на кожен перерахунок.
- **Чанки/растр — 6.5.** LRU за байтами, padding 1 клітина для blend, append-only асети. Сигнатура — рядок із 9 чанків × 256 значень на кожен чанк і шар при кожному draw (I2); поле `version` ні на що не впливає.
- **Камера — 8.5.** Чиста математика (`clampCamera`, `zoomAround`, `easeCamera` у лог-просторі zoom), один хук для обох режимів, тести `camera/follow/minimap`.

## 2. Що змінилось з 2026-11-17 (перевірено в коді)

- `git diff 155874c7d..HEAD` по зрізу: 174 файли, +4433/−2630.
- `MapEditorScreen` 928 → 242; з'явились `useMapEditorWorkspace`, `useUvttImport`, `useTileSave`, `editor/*`.
- `BattleMap` 441 → 436, `MapStage` 411 → 408, `BattleMapPanel` 441 → 292.
- `useViewport` у `components/battle/map` більше не вживається; `props-budget-exempt.json` — лише `MapToken` зі зрізу.
- `raw-controls-exempt.json`: зі зрізу лишився 1 запис (`MapToken`).
- UVTT `warnings` показуються в `UvttImportSection.tsx:40-50`.

## 3. Відкриті дефекти

- **I1** `lib/hooks/battle/useBattleMapFog.ts:100-105` + `lib/utils/battle/view/redact-participants.ts:20-30`: туман фільтрує учасників лише на клієнті; серверна редакція не прибирає `position` невидимих ворогів (і `revealed`/повна карта йдуть гравцю). Виправлення: серверний `fogView` у `battle-response` — стуб/вилучення учасників поза `visibleIds`.
- **I2** `components/battle/map/tiles/chunk-cache.ts:142-168,233`: `rasterSignature` збирає багатокілобайтний рядок на кожен чанк × 4 шари при кожному перемальовуванні. Виправлення: лічильник покоління на масив чанка (WeakMap) замість `join`.
- **I3** `lib/server/battle-maps/tiles-service.ts:148-222`: кожен patch читає всі чанки карти, пише повний `tileLayers` у новий рядок версії та робить до 512 послідовних upsert у транзакції (ризик тайм-ауту пулера, egress). Виправлення: читати лише зачеплені чанки, батчити запис, снапшот версії інкрементально.
- **I4** `components/battle/map/BattleMap.tsx` (436), `MapStage.tsx` (408); `lib/hooks/battle/useBattleMapScene.ts:36` (264 рядки), `useBattleMapPlayground.ts:49` (246): винести підкомпоненти/підхуки.
- **I5** `tiles/chunk-cache.ts:102`, `painter.ts:24`, `assets.ts:6`: три локальні `CHUNK_SIDE = 16` замість `map-storage/chunk-key.ts:3`; інлайн-ключі замість `chunkKey` (`chunk-cache.ts:135,157`, `painter.ts:38,232`, `assets.ts:52`).
- **M1** `lib/hooks/battle-maps/useUvttImport.ts:35`: `file.text()` + `JSON.parse` до 96 МіБ у головному потоці без перевірки `file.size`. Виправлення: перевірка розміру до читання, Web Worker.
- **M2** `uvtt/parse.ts:82-186,293-464` + `UvttImportSection.tsx:35`: англійські тексти помилок показуються користувачу напряму, всупереч правилу «не-React код повертає ключі».
- **M3** `uvtt/parse.ts:229-237`: осьова стіна посеред клітини (x = 2.5) отримує код `diagonal`; потрібен окремий `offGrid`.
- **M4** `uvtt/parse.ts:308,436`: `map_origin` (одиниці сітки) віднімається від піксельних координат до ділення на `ppi`.
- **M5** `uvtt/parse.ts:97-111`: JPEG data-URL дає повідомлення «більше 72 МіБ».
- **M6** `chunk-cache.ts:113`: модульний `rasterCache` (до 64 МіБ) ніколи не очищається — `clear()` ніде не викликається.
- **M7** локальні clamp: `camera/MapMinimap.tsx:76-77`, `weather/crypt.ts:32`, `useTileEditor.ts:158`.
- **M8** `components/battle/map/BattleMap.tsx:81`: inline `import('@/lib/hooks/battle/useMapFogTool')` — deep-імпорт типу повз barrel.
- **M9** хардкод-кольори: `grid/GridStatic.tsx` (12), `MapLayers.tsx` (8), `DoorsLayer.tsx`, `RangedHint.tsx` — винести в токени (світлі теми).

## 4. Що не перевірено

- Чи проходять нові тести L2 (журнал: «написані, не запущені»; запуск заборонено брифом), покриття зрізу окремо.
- Реальна продуктивність растру/туману на картах 200×200 і поведінка на телефонах.
- `components/world/editor` на клони ≥ 12 рядків (jscpd не запускався); `library-service.ts`, `map-scene.ts`, `shadowcast.ts`, `edge-chunks.ts` прочитані лише вибірково.
- I1: інший серверний фільтр позицій не знайдено grep-ом (`fogView(` викликається лише з хука), але повний шлях Pusher-дельт не простежено.
