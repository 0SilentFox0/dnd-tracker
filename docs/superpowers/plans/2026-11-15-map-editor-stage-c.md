# Редактор мап — етап C: камера (план)

Spec: [`2026-11-15-map-editor-stage-c-design.md`](../specs/2026-11-15-map-editor-stage-c-design.md). Епік: [`2026-11-13-map-editor.md`](2026-11-13-map-editor.md) «Етап C». Гілка `feat/map-editor-c` (від `feat/map-editor-d`, worktree `../dnd-tracker-map-editor-c`). Не пушити, не мержити; міграцій і серверних змін немає; feature flag не потрібен.

**Перед стартом:** відповіді на питання spec §8 (за замовчуванням — рекомендації spec). Виконавці — Sonnet, без рев'ю по задачах; тести пишуться разом із кодом; під час роботи лише `pnpm test:related <files>` і `pnpm exec eslint --fix <files>`; повний `test:run`/`tsc`/лінт зміненого — один раз у T8. Кожна задача — окремий коміт (`feat(map-editor): …`, `test(map-editor): …`). Коментарі мінімальні (лише «чому»), мова коментарів — як у сусідньому коді. Перед кожною задачею перегрепити згадані `файл:рядок`.

## Пакет 1 — страховка і чиста математика (T1–T2, один виконавець)

### T1 — Характеризаційні тести до змін
Нічого в продуктовому коді не змінювати.
- `lib/hooks/battle/__tests__/useScrollToCurrent.test.tsx` (`// @vitest-environment happy-dom`): `outer` і `container` — `div` зі стабом `getBoundingClientRect`, `outer.scrollBy = vi.fn()`; токен — `<div data-fx-anchor="map" data-fx-participant="p1">` у `container`. Кейси: `currentId=null` → без виклику; `scrolls=false` → без виклику; токен усередині → без виклику; токен нижче на 40 → `{top: 40, left: 0, behavior: 'smooth'}`; правіше/вище/лівіше (знак!); токена з таким id немає (невидимий) → без виклику; `rerender` `scrolls` false→true → викликано; зміна `currentId` на `p2` → прокрутка до `p2`.
- `components/fx/__tests__/anchors.test.ts` (дописати): `cellPoint` через `resolvePoints` зі стабом `svg.getScreenCTM()` = камера (`a=d=2, e=-300, f=-120`) → центр клітинки `(x+.5)·UNIT·2 − 300`; та сама точка поза `[data-fx-clip]` (`getBoundingClientRect` кліпу менший) → `undefined`; батько кліпу без прокрутки (`scrollHeight === clientHeight`) не обрізає.

### T2 — `lib/utils/battle/camera/` (власний барель `index.ts`)
```ts
export interface Size { width: number; height: number }
export interface Camera { zoom: number; x: number; y: number }
export interface Frame { avail: Size; content: Size; bounds: { min: number; max: number } }
export const CAMERA_MAX_CELL_PX = 3 * MIN_TAP_CELL_PX;
export function cameraBounds(fitCellPx: number): { min: 1; max: number };
export function tapZoom(fitCellPx: number): number;                 // MIN_TAP_CELL_PX / fitCellPx, ≥ 1
export function needsCamera(view: MapView): boolean;                // view.grow > 1
export function fitAllCamera(frame: Frame): Camera;
export function clampCamera(cam: Camera, frame: Frame): Camera;
export function centerOn(p: { x: number; y: number }, zoom: number, frame: Frame): Camera;
export function zoomAround(cam: Camera, factor: number, screen: { x: number; y: number }, frame: Frame): Camera;
export function panBy(cam: Camera, dx: number, dy: number, frame: Frame): Camera;
export function easeCamera(from: Camera, to: Camera, t: number, avail: Size): Camera;
export function inComfort(cam: Camera, p: { x: number; y: number }, frame: Frame, margin?: number): boolean;
export function cellPointPx(anchor: GridPoint, size: number, win: { x: number; y: number }, pxPerUnit: number): { x: number; y: number };
export function followTarget(id: string | null, participants: readonly BattleParticipant[]): { anchor: GridPoint; size: number } | null;
export function minimapViewport(cam: Camera, frame: Frame): { x: number; y: number; w: number; h: number }; // 0..1, обрізано
export function minimapPointToContent(nx: number, ny: number, frame: Frame): { x: number; y: number };
```
Неочевидне:
- `clampCamera` по осі: `span = content·zoom`; `span ≤ avail` → `(avail − span)/2`; інакше `clamp(x, avail − span, 0)`. `zoom` спершу `clamp(bounds)`.
- `easeCamera`: `e = t<.5 ? 4t³ : 1 − (−2t+2)³/2`; `zoom = from.zoom·(to.zoom/from.zoom)^e`; центр екрана в координатах шару `c = (avail/2 − x)/zoom` інтерполювати лінійно за `e`, потім `x = avail/2 − c·zoom` (тому 4-й аргумент `avail`).
- `cellPointPx`: `tokenBox(anchor, size)` дає центр в UNIT → `((cx − win.x·UNIT)·pxPerUnit, (cy − win.y·UNIT)·pxPerUnit)`.
- `followTarget`: `participants.find(id)?.battleData.position`; розмір — той самий, яким `MapStage` рахує footprint токена (перегрепити `tokenSize`/`sizeCells` у `MapStage.tsx`/`map-scene.ts`, не вигадувати новий).
- `fitMapView` (`grid/layout.ts`) повертає `grow` (додати в `MapView`; наявні виклики не ламаються).
Тести `camera/__tests__/camera.test.ts`, `follow.test.ts`, `minimap.test.ts` + `grid/__tests__/layout.test.ts`: центрування по вузькій осі; затискання біля всіх 4 країв; zoom поза межами; `centerOn` у центрі карти — точка рівно в центрі екрана; `zoomAround` — екранна точка під курсором до/після однакова (±1e-9) і на межі zoom не рухає; `easeCamera` t=0 → `from`, t=1 → `to`, zoom монотонний; `inComfort` на межі margin; `cameraBounds(15) = {1, 6}`, `cameraBounds(100).max = 1`; `tapZoom(15) = 2`; `followTarget` — немає id / немає в списку / без позиції → `null`, великий (2×2) → `size 2`; `minimapViewport(fitAllCamera)` = `{0,0,1,1}`; круговий тест `minimapPointToContent`; `fitMapView(...).grow` = 1 без `minCell` і > 1, коли клітинка < `minCell`.

## Пакет 2 — жести і хук камери (T3–T4, один виконавець)

### T3 — `usePanPinch` (винесення з `useViewport`)
`lib/hooks/common/usePanPinch.ts` (+ `index.ts`):
```ts
export interface PinchStep { factor: number; mx: number; my: number; dmx: number; dmy: number } // mx/my — відносно rect контейнера
export function usePanPinch(opts: {
    panLocked: boolean;
    enabled?: boolean;                                    // false — не слухає колесо, bind-обробники — no-op
    onPan(dx: number, dy: number, rect: DOMRect): void;
    onPinch(step: PinchStep, rect: DOMRect): void;
    onWheel(e: WheelEvent, rect: DOMRect): void;          // сам вирішує preventDefault
}): { containerRef: RefObject<HTMLDivElement | null>; bind: PointerBind; wasDragged(): boolean };
```
Перенести дослівно: `pointers`, `drag` з `DRAG_THRESHOLD` (експорт `DRAG_THRESHOLD` лишається з `useViewport` — re-export), захоплення вказівника лише після старту панорами, `pinch`, `dragged`, wheel-listener `{ passive: false }` через `useEffectEvent`. Колбеки читати через `useEffectEvent` (стабільний `bind`). Новий `dmx/dmy` — зсув середини двох пальців між кроками.
`useViewport` переписати на `usePanPinch` без зміни API/поведінки (`onPan` → затиснений зсув лише при `zoom > 1`; `onPinch` → `zoomAt`, `dmx/dmy` ігнорує; `onWheel` → поточна логіка `wheelScrolls`).
Тести: `useViewport.test.ts` без змін — зелений; новий `usePanPinch.test.ts`: поріг (3 px — не pan, 5 px — pan + `wasDragged`), `panLocked` блокує pan, але не pinch, два пальці дають `factor` і `dmx/dmy`, `enabled:false` — колесо не перехоплюється.

### T4 — `useMapCamera` (`lib/hooks/battle/useMapCamera.ts`, у барель) + `useFollowTurnSetting`
Сигнатура — spec §4.4. Внутрішньо: `useState<Camera>`, `frameRef`, `animRef` (rAF id), `userMoved` (state, щоб кнопка підсвічувалась), `usePanPinch({ enabled, panLocked, onPan → panBy + userMoved, onPinch → zoomAround(factor, m) потім panBy(dmx, dmy) + userMoved, onWheel })`.
- `onWheel`: `preventDefault`, `zoomAround(e.deltaY < 0 ? 1.1 : 1/1.1, курсор)` (з Ctrl/⌘ і без; рішення власника — колесо = зум); `userMoved = true`, скасувати анімацію.
- `fly(to)`: `useReducedMotion()` → `setCamera(to)`; інакше rAF 350 мс з `easeCamera(from, to, t, frame.avail)`; скасовує попередній.
- Ефекти: (а) перший валідний `frame` → `centerOn(self ?? target, tapZoom)` або `fitAllCamera`, без анімації; (б) `currentId` змінився → `userMoved=false`; якщо `follow.enabled && target` → `fly(centerOn(target, max(zoom, tapZoom)))`; (в) `target.point` змінився в тому ж ході, `follow.enabled && !userMoved && !inComfort` → `fly(centerOn(target, zoom))`; (г) `frame` змінився → точка шару під центром зберігається, `clampCamera`.
- `recenter()` → `self ?? target` або `fitAllCamera`; `userMoved=false`. `zoomBy(f)` — навколо центру, `userMoved=true`. `flyToMinimap(nx, ny)` → `fly(centerOn(minimapPointToContent(...), zoom))`, `userMoved=true`.
- `enabled=false` → `camera` = `{zoom:1,x:0,y:0}`, ефекти не працюють.
`lib/hooks/battle/useFollowTurnSetting.ts` — копія патерну `useFxEnabled`: `createStorageFlag('battle-map-follow-turn', false)` → `{ follow, setFollow }`.
Тести `useMapCamera.test.tsx` (happy-dom, `vi.useFakeTimers()` + стаб `requestAnimationFrame` через `setTimeout(16)`, `matchMedia` стаб для reduced motion, контейнер зі стабом `getBoundingClientRect` як у `useViewport.test.ts`): початковий фокус на `self`; зміна `currentId` → через 400 мс камера центрована на `target`; `target=null` → камера не змінилась; pan (pointer down/move 20 px) ставить `userMoved`, рух `target` у тому ж ході не рухає камеру, новий `currentId` — рухає і скидає; reduced motion → без проміжних кадрів; `recenter`; колесо (з Ctrl і без) змінює zoom навколо курсора; зміна `frame` зберігає точку центру; `enabled=false` — `camera` identity і колесо не `preventDefault`. `useFollowTurnSetting.test.tsx`: default `false`, `setFollow(true)` → `localStorage['battle-map-follow-turn'] === 'on'`.

## Пакет 3 — інтеграція (T5–T6, один виконавець)

### T5 — `BattleMap` у режимі камери
`components/battle/map/BattleMap.tsx`:
- `fit = fitMapView(...)` як зараз; `camera = needsCamera(fit)`. Якщо `camera`: `fitAll = fitMapView(avail, win, { rotatable: false, bothWays: false, fillWidth: false, taller: 1 })` (без `minCell`), `fitCellPx = fitAll.width / win.cols`, `frame = { avail, content: fitAll, bounds: cameraBounds(fitCellPx) }` (memo; `null`, поки `avail` нульовий). `rotated = camera ? false : fit.rotated`; `pxPerUnit` від `fitAll`.
- `useViewport({ ..., enabled?: !camera })` — додати в `useViewport` опцію `enabled` (прокинути в `usePanPinch`); `useMapCamera({ enabled: camera, frame, containerRef, panLocked: drawing || !!modeTools?.panLocked, follow })`. Один `containerRef` на контейнер: обидва хуки беруть `containerRef` ззовні — у T3/T4 зробити `containerRef` опційним аргументом `usePanPinch` (інакше два ref на один елемент).
- `follow` для хука: `currentId = view?.currentId`, `target = followTarget(currentId, participants)` → `cellPointPx(...)`, `self = view?.camera?.selfId` → те саме, `enabled = view?.camera?.follow ?? false`.
- Розмітка в режимі камери: зовнішній `div` без `overflow-auto`/`scrollbar-gutter`, `items-center justify-center`; контейнер `width/height = avail`, `touch-none`, `{...cameraBind}`; шар зуму `style={{ width: fitAll.width, height: fitAll.height, transform: translate(cam.x, cam.y) scale(cam.zoom) }}` (`origin-top-left`, без `inset-0`); поворотного обгортача немає (рендерити його лише коли `!camera`). `wasDragged` в `interaction` — від активного хука.
- `useScrollToCurrent(outerRef, containerRef, currentId, scrolls && !camera && (view?.camera?.follow ?? true))` (у формі/редакторі `view.camera` немає — поведінка як зараз).
- `useGridWindow`: перейменувати `scrollRef` → `viewportRef` (у камері — `containerRef`, інакше `outerRef`), до deps додати `camera` (`zoom/x/y`); слухач `scroll` лишається (на контейнері без скролу просто не спрацьовує).
- Поверх контейнера (сусід `[data-fx-clip]`, не всередині) в режимі камери — `MapCameraControls` і `MapMinimap` з T6 (у T5 — лише місце й пропси, компоненти в T6; або T5 і T6 одним комітом-послідовністю).
Тести `BattleMap.test.tsx` (дописати; стаб `ResizeObserver`/`getBoundingClientRect` як уже є): 100×100 у 375×600 → немає класу `overflow-auto`, контейнер `width:375px`, шар має `transform` з `scale(`, `data-map-rotated` відсутній; 8×8 у 800×600 → розмітка як до змін (знімок атрибутів: `overflow-auto` немає, поворот за старими правилами на телефоні); клік клітинки через `clickCell` після стабу CTM камери → правильний `onCellClick`; drag 20 px → наступний клік не спрацьовує (`wasDragged`); `view.currentId` змінився → `transform` змінився (фейкові таймери); у формі (без `view.camera`) — `useScrollToCurrent` викликається з `scrolls` як раніше (spy на модуль).

### T6 — Сцена, перемикач ДМ, UI камери, i18n/onboarding
- `types/battle.ts` `BattleMapView.camera?: { follow: boolean; selfId: string | null }`; `useBattleMapScene` бере `turn.hero` з `useBattleScene()` і `useFollowTurnSetting()`: `camera = useMemo(() => ({ follow: isDM ? follow : true, selfId: hero?.basicInfo.id ?? null }), …)`, кладе в `view` (через `composeMapView` або поверх — не ламати мемо `view`; перевірити, де збирається `view`). `BattleMapScene` отримує `followTurn: { on: boolean; toggle(): void } | null` (лише ДМ).
- `BattleMapPanel`: `ModeButton` «Слідкувати за ходом» у ряді ДМ (`aria-pressed`, `title` = `followHint`). Тест у `BattleMapPanel.test.tsx`: є для ДМ, немає для гравця, клік перемикає `localStorage`.
- `components/battle/map/camera/MapCameraControls.tsx` — props: `{ onZoomIn, onZoomOut, onRecenter, canRecenter, userMoved, phone }` (групувати в об'єкт `camera`, якщо так коротше; ≤ 7). `Button size="icon" variant="ghost"`, `aria-label` з `battle.map.camera.*`, підсвітка `onRecenter`-кнопки при `userMoved`.
- `components/battle/map/camera/MapMinimap.tsx` — props: `{ map, win, participants, viewport, onPick, hiddenCells, phone }`. SVG `viewBox` у клітинках `win` (`0 0 win.cols win.rows`), довша сторона 160 px (телефон 120); фон `<image href={map.background.url}>` (перегрепити поле фону та `backgroundBox`, щоб врахувати калібрування; якщо складно — лише без фону, записати в хвости); `blocked` — `<path d={regionFillPath(blocked)} transform="scale(1/UNIT)">` або перерахунок у клітинки; крапки учасників за `side` (кольори з наявних токен-констант, не нові); рамка `viewport`; `onPointerDown` → `onPick(nx, ny)` (з `stopPropagation`, щоб не почати pan карти); `hiddenCells` → чорний `path`. Згортання: `useStorageValue` двох прапорців (`battle-map-minimap-phone` false, `battle-map-minimap-desktop` true), кнопка-іконка `Map`.
- Тести: `MapCameraControls.test.tsx` (aria-label, клік → колбек, recenter прихований без цілі), `MapMinimap.test.tsx` (клік у центр → `onPick(.5,.5)`; `hiddenCells` дає `path[data-minimap-fog]`; крапок стільки, скільки переданих учасників з позицією; згорнута на телефоні за замовчуванням).
- i18n `messages/{uk,en}/battle.json` → `map.camera.{zoomIn,zoomOut,recenter,minimap,minimapShow,minimapHide,follow,followHint}`; whats-new `{ id: '2026-11-map-camera', date: '2026-11-15', audience: 'all' }` у `lib/onboarding/whats-new.ts` + `whatsNew.2026-11-map-camera.{title,body}` в обох мовах (за форматом сусідніх записів); абзац у `messages/*/help.json` статтях `player-battle` і `dm-battle` про камеру/мінімапу/перемикач.

## Пакет 4 — фініш (T7–T8, основний сеанс або один виконавець)

### T7 — Документація
- `docs/architecture/map-modes.md`: новий розділ «Камера (етап C)» після «Рендер сітки (етап D)»: коли вмикається (`needsCamera`), модель `Camera`/`Frame`, `useMapCamera` (follow/userMoved/recenter), жести `usePanPinch`, поворот вимкнений, мінімапа і шов `hiddenCells` для F, FX-контракт без змін.
- `docs/architecture/battle.md` — один рядок про `BattleMapView.camera` (якщо там описано `BattleMapView`).
- `docs/STATUS.md` — запис «Редактор мап, етап C — камера (feat/map-editor-c, не змерджена)» з **хвостами на кінець епіку:** живий прогін камери (100×100 і 200×200 хід за ходом, `followTurn` із невидимим токеном, `userMoved` vs автослідування, колесо/Ctrl/трекпад, редактор із пензлем — панорама двома пальцями), mobile 375 (pan/pinch, без повороту, тап клітинки після панорами, мінімапа згорнута), мінімапа (перельот, фон з калібруванням), перемикач ДМ (дві вкладки), FX у клітинку й токен у режимі камери; perf перельоту на 200×200 (ризик spec §6.2).

### T8 — Гейти
`/simplify` по диффу гілки (1 агент); `pnpm exec tsc --noEmit`; лінт по змінених теках (`pnpm exec eslint components/battle/map lib/hooks/battle lib/hooks/common lib/utils/battle/camera`); один повний `pnpm test:run` (перед ним `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`); `lib/__tests__/props-budget.test.ts` і `ui-layers.test.ts` зелені. Лайв-прогін і battle-sweep — НЕ запускати (кінець епіку). Фінальне Opus-рев'ю — за рішенням власника.

## Готово коли
Карта, що не вміщується при 30 px, показується камерою (без нативного скролу й повороту); зміна ходу плавно веде до видимого активного токена (у ДМ — лише з увімкненим перемикачем); ручна панорама не бореться з автослідуванням до наступного ходу; «До себе» і мінімапа переносять камеру; `useScrollToCurrent` покритий тестами й працює в режимі «вміщується»; FX-тести `anchors` зелені з CTM камери.
