# S2 — UI редактора мап (components/maps, world/editor, battle/map, hooks battle-maps + world)

Вимірено на main d871500da: 114 вихідних файлів, 52 тест-файли (maps 10/4, world/editor 16/7, battle/map 50/29, hooks battle-maps 13/6, hooks world 25/6).

## 1. Оцінки (старе -> нове)
- Якість коду: 5.5 -> 7.0. Файли здебільшого малі (>300 рядків лише 2 компоненти й 1 модуль tiles). `as unknown as` у зрізі 0, `eslint-disable` 1 (обґрунтований). Але BattleMap/MapStage лишаються монолітами.
- Перевикористання: 4.5 -> 6.5. Один `clamp`/`cellKey`/image-decode, pan/pinch спільний `usePanPinch`. Лишились дві паралельні математики камери і третій wheel-стек (див. дефекти).
- Хуки: 4.5 -> 7.5. 0 хук-файлів >300 (макс. `useWorldEditorPage` 219, `useWorldEditor` 187, `useTileEditor` 168), `keys.ts` є у battle-maps. Мінус: 14 з 38 хуків без прямого тесту.
- Тести: 5 -> 6.0. Пряме посилання на файл у тестах відсутнє для 26 з 114 файлів (див. нижче); world-хуки покриті слабо.
- UI-kit: 4 -> 8.0. Сирих `<button>` у зрізі 1 (MapToken, в `raw-controls-exempt.json`, hit-target), `input/select/img/textarea` 0. Ціль «components/battle <= 10 сирих» виконана для зрізу.
- Props: `props-budget-exempt.json` має 5 записів (ціль <=5 виконана); у зрізі MapToken (10 props) і WorldMapView (12, поза зрізом).
- Генератор карт (UI-частина): 5.5 -> 7.0 (загалом, не лише UI).

## 2. Що змінилось з 2026-11-17 (докази)
- `MapEditorScreen` 931 -> 242 рядки; винесені `useMapEditorWorkspace` (90), `useUvttImport` (50), `useTileSave` (35), `EditorHeader`, `EditorSidebar`, `TilePalettePanel`, `UvttImportSection` (components/maps/editor/).
- Сирі button/input/select/img у зрізі: ~378 по репо -> 1 у зрізі (rg `<button|<input|<select|<img` у 5 теках = 1, MapToken).
- Pan/zoom: `useViewport` (світ) і `useMapCamera` (бій) обидва на `lib/hooks/common/usePanPinch.ts`; `clamp` одна реалізація `lib/utils/common/clamp.ts`, використовується в `viewport-math.ts:1` і `battle/camera/camera.ts`.
- `useBattleMapEditor`/`useBattleMapScene`/`useMapTerrainTool` розбиті на підхуки (журнал L7b); камера розділена на `useMapCamera` 275 + `useCameraFollow` + `useCameraFlight`.
- Компоненти в components/world/editor: найбільший `WorldToolbar` 224; спільні куски в `InspectorParts.tsx`/`MapFieldParts.tsx` (StripLead, NameInput, SwitchField, RadiusRange), `MapStrip` ними користується.

## 3. Вимірні критерії плану
- 0 компонентів >400: НЕ виконано — `components/battle/map/BattleMap.tsx` 436, `MapStage.tsx` 408 (у цій зоні L2 «власник»; журнал L7c розбив 10 інших, ці два ні).
- 0 хук-файлів >300: виконано (макс. 275 `lib/hooks/battle/useMapCamera.ts`, 219 world).
- Один стек pan/zoom: частково. Є 3 стеки: `usePanPinch`+`viewport-math` (світ), `usePanPinch`+`battle/camera/camera.ts` (бій), і `lib/hooks/scenario/useGraphViewport.ts` (218, власний wheel/pointer на SVG, не на usePanPinch; поза зрізом, але належить критерію).
- Один cellKey/CHUNK_SIDE/image-decode: виконано (`lib/utils/battle/grid/geometry.ts:18`, `lib/utils/common/image-decode.ts`).
- 0 клонів >=12 рядків у world/editor: не перевірялось інструментом (jscpd у репо немає); візуально MapStrip/MarkerStrip/WorldMarkerPanel діляться через InspectorParts, явних клонів не знайдено.

## 4. Відкриті дефекти
- I: `components/battle/map/BattleMap.tsx:96-436` — одна функція ~340 рядків, 12 хуків, обчислення fit/frame/камери/follow/touch-класів inline (рядки 164-300). Виділити `useBattleMapFrame` (fit, cameraMode, frame, pxPerUnit) і `useBattleMapCamera` (follow-цілі). Блокує критерій «0 компонентів >400».
- I: `components/battle/map/MapStage.tsx:110-408` — один `MapStageImpl` ~300 рядків, 12 хуків; винести шари/обробники у підкомпоненти/хук.
- I: два паралельні набори математики камери: `lib/utils/common/viewport-math.ts` (zoomAt/focusAt/clampOffset) і `lib/utils/battle/camera/camera.ts` (clampCamera/clampAxis/centerOn) — різна модель (offset 0..-(z-1)*size проти avail/content), семантично дубль; уніфікувати на Frame-моделі.
- I: `lib/hooks/scenario/useGraphViewport.ts:118-132` — власний wheel + нормалізація `deltaMode` (єдине входження), не `usePanPinch`; перевести або винести wheel-нормалізацію у common.
- M: `components/battle/map/BattleMap.tsx:141` — inline `import('@/types/battle-grid').GridPoint` у типі; імпортувати типом нагорі.
- M: `BattleMap.tsx:~255` та 400-412 — `() => camera.zoomBy(ZOOM_STEP)` створюються щоразу; `hiddenCells={[]}` нова масив-пропса щороку (ламає memo у MapMinimap) — константа.
- M: `components/battle/map/MapToken.tsx` — 10 props + 1 сирий `<button>` (в обох exempt); згрупувати props у об'єкти.
- M: 12 hook-файлів `lib/hooks/world/` без прямого тесту: `useWorldEditorPage` 219, `useTravelPanel` 177, `useMapFields` 131, `useNotesPanel` 130, `useMarkerFields` 88, `useShowWorld` 80, `useWorldPlay` 50, `useMoveTarget` 36 (+ battle-maps: `useMapEditorWorkspace` 90, `useUvttImport` 50, `useTileSave` 35, `useBattleMapEdges` 34 — за назвою у тестах не зустрічаються).
- M: компоненти без прямого тесту: `TilePalettePanel` 275, `MarkerStrip` 206, `MapFieldParts` 152, `EditorHeader` 137, `InspectorParts` 125, `EditorSidebar` 122, `MapFileDropzone` 110, `MapLayers` 108, `MapEffectsLayer` 104, `MapFogControls` 84, `GridLayer` 76 (частково покриваються батьківським `MapEditorScreen.test`).
- M: `components/world/editor/__tests__/HeroEyesSelect.test.tsx:17` мокає `@/lib/api/world` напряму (дозволено у тестах, але вказує, що компонент залежить від API через хук без чистого шва).
- M: `lib/hooks/world/useWorldEditor.ts:34` — `eslint-disable react-hooks/exhaustive-deps` (нестабільний об'єкт `m`); стабілізувати мемо замість приглушення.

## 5. Не вдалося перевірити
- Точні лічильники props на кожному компоненті (немає запуску ESLint-правила props-budget; сказано лише про 5 exempt).
- Клони >=12 рядків (немає jscpd; перегляд лише вибірковий).
- «Без прямого тесту» = ім'я файлу не згадується в жодному `__tests__`; непрямо покриття може бути (coverage не запускалось за брифом).
- Поведінка на пристроях/візуальна регресія після `Button variant="bare"` -> `HudButton`.
