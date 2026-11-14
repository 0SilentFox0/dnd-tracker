# Етап A — ручне калібрування сітки (детальний план)

**Spec:** `docs/superpowers/specs/2026-11-13-map-editor-design.md` (етап A) · **Епік:** `2026-11-13-map-editor.md` · **Спайк:** `docs/superpowers/research/2026-11-14-grid-autodetect-spike.md` (автодетект ВІДКЛАДЕНО, `detectGrid` і `grayPixels` не робимо).
Без прапора, без Prisma-міграції. Виконавець — Sonnet, одне ревʼю Opus наприкінці; тести пишуться, повний прогін один раз наприкінці.

## Reuse (перевірено)
- `lib/utils/battle/grid/background.ts`: `gridForCellSize`, `backgroundColsOf`, `impliedCellPx`, `backgroundBox` (споживач лише `components/battle/map/MapBackground.tsx:30`), `clamp`.
- `useBattleMapEditor` (`lib/hooks/battles/setup/`): `resize`, `setCellSize`, `setGridOffset`, `setBackground`; `BattleFormMap` уже має повзунки розміру клітинки та зсуву (`cellPx`, `gridOffset`).
- Нове потрібне лише для: окремої осі Y, обведення клітинки, нуджингу, збереження калібрування при заміні фону.

## Завдання
**A1. Модель.** `types/battle.ts:373` + `lib/schemas/battles.ts:247`: `backgroundRows?: number` (`positive().max(200)`). `backgroundBox`: висота = `backgroundRows * cellPx`, якщо задано, інакше `width * aspect`. `backgroundColsOf` не чіпаємо; додати `backgroundRowsOf(map, img)` (= `backgroundRows ?? backgroundColsOf * img.height/img.width`). Тести: `background.test.ts` (неквадратні клітинки, відсутній rows = стара поведінка), `battle-map-schema.test.ts`.
**A2. Чисті функції** `lib/utils/battle/grid/calibration.ts` (+ `index.ts` barrel, тести `__tests__/calibration.test.ts`):
- `fromCellRect(img, rect:{x,y,w,h}, n=1) → {backgroundCols, backgroundRows, gridOffset}`; `cellW=rect.w/n`, `cols=img.width/cellW`; offset = `frac(rect.x/cellW)`, не включно 1 (`< 1`, див. `MAX_GRID_OFFSET`); клампи `MIN_CELL_PX..MAX_CELL_PX`.
- `nudge(map, dx, dy, unit:'px'|'cell', cellPx) → {gridOffset}` з wrap у [0,1).
- Тести: квадратна, прямокутна, N×N, зсув на межі, wrap, клампи.
**A3. Хук** `lib/hooks/battles/setup/useGridCalibration.ts` (barrel `index.ts`): стан режиму (`off|rect`), чернетка прямокутника (drag на зображенні), `commit()` → `actions.applyCalibration`. У `useBattleMapEditor`: `applyCalibration({backgroundCols, backgroundRows, gridOffset})` через `resize` (cols/rows сітки з `gridForCellSize`-логіки, `backgroundRows` зберігається; `setSize` і `setCellSize` скидають/задають `backgroundRows` узгоджено). Тест `useGridCalibration.test.tsx` (happy-dom).
**A4. UI** `components/battle/setup/GridCalibration.tsx` (props ≤ 7, домен лише через хук): кнопки «Обвести клітинку» / «Квадрат N×N» (поле N), накладання рамки на зображення з drag, стрілки нуджингу ±1 px / ±0.01 клітинки, повзунок прозорості прев'ю. Вбудувати в `BattleFormMap`. Тест у `BattleFormMap.test.tsx`.
**A5. Заміна фону:** `setBackground` (`useBattleMapEditor.ts:168`) та сервер `map-background-mutation.ts:32` скидають також `backgroundRows`. Новий розмір зображення той самий → діалог «Зберегти калібрування?» (хук повертає `pendingKeep`); різний → скидання як зараз. Тести хука та мутації (rows скидається).
**A6. i18n/onboarding:** `messages/{uk,en}/battleSetup.json` `map.calibration.*`; whats-new `2026-11-grid-calibration` (+ `whatsNew.*` у обох `whatsNew.json`); hint у `lib/onboarding/hints.ts`. Тести ключів існують.
**A7. Верифікація:** `pnpm test:changed`, eslint по торкнутих файлах; повний прогін/tsc наприкінці; живий прогін на `necro_quest1_2.jpg` (слабка сітка) і `zehir_thronne_room.jpg` — обвести клітинку, нуджинг, збереження в бою, заміна фону. Оновити `docs/architecture/battle.md` (або map-modes) і `docs/STATUS.md`.

## Відкриті питання (рішення власника)
1. Нуджинг у `px` потребує знати `cellPx` зображення — беремо `impliedCellPx`.
2. Режим «Квадрат N×N» — достатньо поля N у діалозі обведення (рекомендація: так, без окремого режиму).
