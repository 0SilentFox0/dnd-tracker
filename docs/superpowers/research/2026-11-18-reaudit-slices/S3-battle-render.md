# S3: рендер бойової мапи / FX / runtime (re-audit, main d871500da)

## 1. Оцінки
| Критерій | Було | Зараз | Причина |
|---|---|---|---|
| Якість коду (render-слайс) | 5.5 | 7.5 | `BattleMap.tsx` 436, `MapStage.tsx` 408 (трохи >400, ціль «компонент ≤400» не виконана), `useMapCamera` 275, `useGridWindow` 92. Файли охайні, але лишилися дублі констант. |
| Перевикористання | 4.5 | 6.5 | `loadImage` єдиний (`lib/utils/common/image-decode.ts:20`, `tiles/assets.ts:4`), `clamp` з common у `MapTokenHud.tsx:28`, `MapHitFloat.tsx:11`; один ticker для weather/FX/auras/motion (`lib/utils/canvas/ticker.ts`). Але `CHUNK_SIDE = 16` досі 3 локальні копії. |
| Хуки (camera/grid) | 4.5 | 7.5 | Усі effect-и з cleanup: `useGridWindow.ts:75-79`, `useCameraFlight.ts:~92` (`cancelAnimation` на unmount), `use-weather-canvas.ts:73-77`, keydown-слухачі скрізь з remove. Витоків rAF/listener не знайдено. |
| Тести | 5 | 7 | 16 тестів мапи + tiles (chunk-cache, painter, TileCanvas, assets), weather effects/layer, fx (stage, render-cost, fx-layer). Прогалини нижче. |
| UI-kit | 4 | 8 | `components/battle/map` має 1 виняток raw-controls (`MapToken.tsx`, hit-target); props-budget `MapToken#MapToken: 10` лишився. Ціль «≤10 сирих у battle» виконана. |
| Перформанс / runtime | n/a | 7 | LRU 64 МБ растерів чанків із сигнатурою, один rAF-цикл, `fps` throttle, `usePageHidden` у MotionBackground, memo на Grid*/MapToken/MapBackground. Дрібні ризики нижче. |

## 2. Що змінилося (докази)
- Розрізання `MapEditorScreen`, `useBattleMapFog`, `BattleMap` на `useMapCamera` (лог L2); `BattleMap.tsx` ≈436 рядків.
- Єдиний ticker: `weather/use-weather-canvas.ts:55-70` підписується через `subscribe(..., {fps:30})`, `fx/runtime/stage.ts:154-162` і `auras/loop.ts:94` підписані лише коли є живі елементи (idle = 0 вартості).
- `TileRasterChunkCache` (`chunk-cache.ts:23-98`): сигнатура сусідніх 3x3 чанків + assets + cell + seed, LRU за байтами, `close()` для ImageBitmap, тест на інвалідацію сусіда.
- raw-controls у battle/map: 378 -> 1.

## 3. Відкриті дефекти
- **I** `components/battle/map/tiles/TileCanvas.tsx:~85-86`: `canvas.width/height = ...` присвоюється на КОЖЕН ефект (зміна `tiles`, `loadedAssets`, `viewport`, `cellPx`) - це скидає й реалоцирує backing store навіть без зміни розміру, плюс повний `clearRect`+перемальовка. Фікс: присвоювати лише коли значення відрізняється.
- **I** `chunk-cache.ts:130-143` `rasterSignature` будується (join до 9x256 значень, 4 шари) на кожну перемальовку навіть при cache hit; ціна росте з видимою кількістю чанків. Фікс: мемоізувати за ідентичністю `chunks[layer]` (WeakMap) або версією карти.
- **M** `CHUNK_SIDE = 16` продубльовано в `chunk-cache.ts:102`, `painter.ts:24`, `assets.ts:6` при наявному `CHUNK_SIDE` з `lib/utils/battle/map-storage/chunk-key.ts:3` (виходить із `MAP_LIMITS.chunk`). Ціль плану «один CHUNK_SIDE» не виконана; розбіжність з limits дасть тихі артефакти.
- **M** Дублі `Math.min(1, Math.max(0, ..))` замість `clamp`: `camera/MapMinimap.tsx:76-77`, `weather/crypt.ts:32`, `lib/hooks/battle/useBattleMapPlayground.ts:196`. Ціль плану «один clamp» не повна.
- **M** `rasterCache` модульний синглтон (`chunk-cache.ts:113`), ніколи не `clear()`-иться при зміні мапи/виході з бою; старі мапи живуть до витіснення LRU (до 64 МБ GPU/RAM). Фікс: `clear()` або видалення за `mapId` на unmount `TileCanvas`.
- **M** `useCameraFlight.ts` викликає `setCameraState` на кожен rAF 350 мс, тож `BattleMap` (436 рядків, багато дочірніх) ре-рендериться ~21 раз за політ; потенційно можна писати transform напряму через ref.
- **M** `TileCanvas.tsx:62-79`: завантаження зображень без abort/unmount-гарду (`setLoadedAssets` після unmount; нешкідливо в React 19, але зайва робота), `requested` ref не скидається при зміні мапи.
- **M** `MapStage.tsx` 408 рядків і `BattleMap.tsx` 436 - вище цілі «компонент ≤400» для плану (хоч і 0 хуків >300).
- **M** Прогалини тестів: немає прямого тесту `useWeatherCanvas` (cleanup ResizeObserver/ticker), `ticker.ts` (throw-ізоляція, stop), `useCameraFlight`/`useGridWindow` cancel-on-unmount окремо; `TileCanvas` тест без перевірки повторного присвоєння canvas.width.

## 4. Не перевірено
- Не запускав vitest/tsc/eslint; тестові покриття взято з попередніх вимірювань. Реальні FPS/профіль не мірялись. Не читав повністю `components/fx/animations/*` (великий каталог, лише runtime/stage/auras/ticker) і `components/dice/engine.ts` (rAF там є - на витоки не дивився). Фінальний розмір `MapStage` береться з `wc -l`.
