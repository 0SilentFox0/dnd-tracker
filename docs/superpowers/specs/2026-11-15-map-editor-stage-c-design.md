# Редактор мап — етап C: камера (design)

**Дата:** 2026-11-15 · **Гілка:** `feat/map-editor-c` (від `feat/map-editor-d`, worktree `../dnd-tracker-map-editor-c`) · **Епік:** [план](../plans/2026-11-13-map-editor.md) «Етап C», [spec епіку](2026-11-13-map-editor-design.md) §3 «Етап C», §5.3 «Камера» · **Попередній етап:** [етап D](2026-11-14-map-editor-stage-d-design.md) · **План:** [етап C](../plans/2026-11-15-map-editor-stage-c.md)

## 1. Проблема

Після етапу D бій приймає карти до 200×200 (під прапорцем `mapLibraryEnabled`), а рендер сітки не залежить від площі. Але показ карти лишився «вмістити або прокручувати»:

- `BattleMap` (`components/battle/map/BattleMap.tsx`) рахує рамку `fitMapView(..., { minCell: MIN_TAP_CELL_PX })`; якщо клітинка менша за 30 px, рамка росте, і зовнішній `div` прокручується нативно (`overflow-auto`). На 200×200 це шар ~6000×6000 px у DOM, на телефоні — ще й поворот на 90°.
- Поверх нього `useViewport` (`lib/hooks/common/useViewport.ts`, математика `lib/utils/common/viewport-math.ts`) дає зум 1–3 відносно рамки, тобто зум і прокрутка — дві незалежні системи координат.
- `useScrollToCurrent` робить мінімальний `scrollBy` до токена поточного ходу, не враховує зум/панораму, не має тестів і не знає, хто глядач.
- Немає «повернутися до себе», огляду всієї карти (мінімапи) та налаштування слідування для ДМ.

## 2. Мета і межі

**Входить:** чиста математика камери, хук `useMapCamera` (focus/follow/userMoved/recenter), режим камери для карт, що не вміщуються при `MIN_TAP_CELL_PX`, без повороту на телефоні; кнопки камери (зум ±, «до себе»), мінімапа з перельотом і швом для туману; `followTurn` пропускає невидимі глядачу токени; перемикач слідування для ДМ (localStorage, за замовчуванням вимкнено); тести `useScrollToCurrent` до будь-яких змін; збереження DOM-контракту `data-fx-*`.

**Не входить:** туман (F/G; у C лише параметр `hiddenCells` мінімапи, що приходить порожнім), тайли/Canvas (E), зміни сервера, міграції, feature flag (етап C за епіком без прапорця), фокус камери з кліку по списку ініціативи (можна додати пізніше через `focusCell`), лайв-прогін у Chrome і battle-sweep (в кінці епіку).

## 3. Підходи

### A. Камера = трансформація шару фіксованої рамки (рекомендовано)
Контейнер (`[data-fx-clip]`) дорівнює доступній області; всередині — шар карти розміром «вмістити все» (`fitAll`, клітинка < 30 px), на який накладено `translate(x,y) scale(zoom)`; `zoom ∈ [1, zoomMax]`, де `zoomMax = 3·MIN_TAP_CELL_PX / fitCellPx`. Нативного скролу немає, pan/pinch/колесо — наші.
- **+** одна система координат (екранні px), DOM-розмір шару ≈ екран (не 6000 px), CTM `<svg data-fx-grid>` уже містить камеру — `cellPoint`, `cellAtScreenPoint`, `visibleGridWindow` працюють без змін; браузер перерастеризує трансформований шар у фінальному масштабі (без `will-change` — без гігантського композитного шару на iOS).
- **−** власні жести замість нативної інерції скролу; потрібна генералізована математика (вміст менший за контейнер по одній осі — центрування).

### B. Лишити нативний скрол, додати `scrollTo` + зум через перерахунок рамки
- **+** нативна інерція.
- **−** зум змінює layout-розмір шару (6000 px+ на 200×200 → ризик пам'яті WebKit, перерендер DOM на кожен крок зуму), дві системи координат лишаються, плавний переліт із зумом не синхронізується зі скролом.

### C. Розширити `useViewport` (world map ділить його)
- **+** менше нового коду.
- **−** `clampOffset` припускає «вміст = контейнер при zoom 1»; зміна семантики зачепить `WorldMapView`. Беремо з нього лише жести (див. §4.3).

**Рекомендація: A.**

## 4. Рішення

### 4.1 Коли вмикається режим камери
- `fitMapView` повертає ще `grow` (множник росту рамки через `minCell`); **режим камери ⇔ `grow > 1`** (рівно сьогоднішній «режим нативного скролу через малу клітинку»). Інакше — нинішній режим «вміщується» без змін, разом із прокруткою «вищої» карти на десктопі (`DESKTOP_MAX_TALLER`) і `fillWidth` на телефоні, `useScrollToCurrent` і `useViewport`.
- У режимі камери `win` лишається як є (`playableBounds` на телефоні), **поворот вимкнено** (`rotatable: false, bothWays: false` для рамки `fitAll`), `data-map-rotated` не ставиться.
- Режим камери — у всіх місцях `BattleMap` (бій, форма бою, редактор бібліотеки, playground, демо), однією реалізацією; follow/«до себе» мають сенс лише там, де є `view.camera` (бій).
- Наслідок: на десктопі 60×60 у вікні ~900 px (клітинка 15 px) теж переходить із прокрутки на камеру — свідомо, це та сама ситуація «не вміщується».

### 4.2 Чиста математика `lib/utils/battle/camera/` (нове, барель `index.ts`)
Координати: `Camera = { zoom, x, y }` — екранні px відносно контейнера; точка шару `p` (px шару при zoom 1) на екрані = `(x + p.x·zoom, y + p.y·zoom)`. `Frame = { avail: Size; content: Size; bounds: { min: 1; max: number } }`.
- `cameraBounds(fitCellPx): {min, max}` — `max = max(1, CAMERA_MAX_CELL_PX / fitCellPx)`, `CAMERA_MAX_CELL_PX = 3 * MIN_TAP_CELL_PX`.
- `fitAllCamera(frame)` — zoom 1, вміст по центру.
- `clampCamera(cam, frame)` — zoom у межах; по кожній осі: вміст ≤ контейнера → центр, інакше `x ∈ [avail − content·zoom, 0]`.
- `centerOn(point, zoom, frame)` — точку шару в центр, потім `clampCamera`.
- `zoomAround(cam, factor, screenPt, frame)` — колесо/щипок/кнопки (точка під курсором нерухома).
- `panBy(cam, dx, dy, frame)`.
- `easeCamera(from, to, t, avail)` — ease-in-out cubic; zoom інтерполюється геометрично (без «провалу» масштабу), x/y — так, щоб центр екрана рухався по прямій у координатах шару.
- `inComfort(cam, point, frame, margin = 0.15)` — точка всередині внутрішніх 70 % екрана (не смикати камеру на кожному кроці).
- `tapZoom(fitCellPx)` — zoom, за якого клітинка = `MIN_TAP_CELL_PX` (зум переліту за замовчуванням: `max(cam.zoom, tapZoom)`).
- `cellPointPx(anchor, size, win, pxPerUnit)` — центр footprint у px шару (через наявний `tokenBox`).
- `followTarget(id, participants): { anchor: GridPoint; size: number } | null` — учасник з позицією серед **уже відфільтрованих для глядача** `participants`; немає / без позиції → `null` (камера лишається).
- Мінімапа: `minimapViewport(cam, frame): {x, y, w, h}` (нормовано 0..1 від вмісту, обрізано), `minimapPointToContent(nx, ny, frame)`.
- `needsCamera(view: MapView): boolean` — `view.grow > 1` (щоб правило жило в одному місці).

### 4.3 Жести: `usePanPinch` (винесення з `useViewport`)
`useViewport` уже має перевірену логіку вказівників (поріг `DRAG_THRESHOLD`, захоплення після старту панорами, щипок двома пальцями, `wasDragged`, wheel-listener `passive: false`, `panLocked`). Виносимо її в `lib/hooks/common/usePanPinch.ts` (колбеки `onPan(dx, dy)`, `onPinch({ factor, mx, my, dmx, dmy })`, `onWheel(e, rect)`), `useViewport` переходить на нього без зміни API і поведінки (тести `useViewport.test.ts` лишаються зеленими). Новий `dmx/dmy` (зсув середини двох пальців) дає панораму двома пальцями — потрібна в редакторах, де один палець малює (`panLocked`); `useViewport` його ігнорує.

### 4.4 Хук `useMapCamera` (`lib/hooks/battle/useMapCamera.ts`, у барель)
```ts
useMapCamera({
    enabled: boolean;                 // режим камери
    frame: Frame | null;              // null — ще немає виміру
    containerRef: RefObject<HTMLDivElement | null>;
    panLocked: boolean;               // малювання/інструмент режиму
    follow: { currentId: string | null; target: CameraTarget | null; self: CameraTarget | null; enabled: boolean };
}): {
    camera: Camera; bind; wasDragged(): boolean; userMoved: boolean;
    focusPoint(p, opts?: { zoom?: number; animate?: boolean }): void;
    recenter(): void; zoomBy(factor: number): void; flyToMinimap(nx: number, ny: number): void;
}
```
(`CameraTarget = { point: {x,y} }` у px шару — `BattleMap` перетворює `followTarget` через `cellPointPx`.)
- **Анімація:** rAF ~350 мс через `easeCamera`; `useReducedMotion()` → миттєво; новий переліт або жест скасовує поточний.
- **Початковий стан:** при першому валідному `frame` — `self ?? target` на `tapZoom`, інакше `fitAllCamera`.
- **followTurn:** при зміні `currentId` і `follow.enabled` — переліт до `target` (якщо `null` — невидимий/без позиції — стоїмо), `userMoved = false`. Усередині ходу, коли `target.point` змінився (токен пішов) і `!userMoved` і точка поза `inComfort` — м'який переліт.
- **userMoved:** будь-який жест (pan, pinch, колесо, кнопки ±, клік мінімапи) ставить `true`; `recenter()` і новий хід скидають.
- **recenter():** на `self` (для ДМ `self` = поточний, див. §4.6), без нього — на `target`, без обох — `fitAllCamera`.
- **Зміна розміру:** при зміні `frame` зберігаємо точку шару під центром екрана й перезатискаємо.
- **Колесо:** без модифікатора — панорама (`deltaX/deltaY`, Shift — горизонтально), Ctrl/⌘ (і щипок трекпада, що шле `ctrlKey`) — зум навколо курсора. Так само, як сьогодні у режимі прокрутки (`wheelScrolls`), і працює в редакторах при активному пензлі.
- `enabled = false` → хук пасивний (не слухає колесо, `camera` = identity), щоб у режимі «вміщується» лишався `useViewport`.

### 4.5 Інтеграція в `BattleMap`
- Режим камери: зовнішній `div` без `overflow-auto` (і без `scrollbar-gutter`), контейнер `[data-fx-clip]` = `avail`, `touch-none`, шар зуму — `translate(camera.x, camera.y) scale(camera.zoom)` над вмістом розміру `fitAll`; `bind`/`wasDragged` — від `useMapCamera`; `useViewport` вимкнено (його `bind` не вішається).
- `pxPerUnit` у режимі камери — базовий (рамки `fitAll`); `DoorsLayer` хіт-зона рахується від нього (як і зараз при зумі `useViewport`; не регресія).
- `useGridWindow`: `scrollRef` → `viewportRef` (у режимі камери — контейнер `[data-fx-clip]`), deps отримують `camera`; `visibleGridWindow` бере CTM, тож вікно культингу автоматично йде за камерою.
- `useScrollToCurrent` лишається лише в режимі «вміщується» з прокруткою; отримує ще `follow` (перемикач ДМ), тобто аргумент `scrolls && follow`.
- Кнопки камери й мінімапа рендеряться всередині `BattleMap` поверх контейнера лише в режимі камери (поза `[data-fx-clip]`, щоб FX-кліп не змінився).
- `BattleMap` лишається з 7 пропсами (`props-budget`): дані камери приходять у `view.camera` (§4.6).

### 4.6 Хто «я», видимість і перемикач ДМ
- `BattleMapView.camera?: { follow: boolean; selfId: string | null }` (`types/battle.ts`), будує `useBattleMapScene` (memo).
- `selfId` = `turn.hero` з `useBattleScene` (уже існує в `deriveTurn`: свій хід → поточний, ДМ-керований, найближчий за чергою свій, перший свій, для ДМ — поточний). Перетворення в точку — лише якщо учасник є в `scene.participants` (той самий фільтр видимості: `invisible`, `modeView.visibleIds`; туман F додасть свій фільтр туди ж).
- `follow`: гравець — `true` (без перемикача), ДМ — прапорець `createStorageFlag('battle-map-follow-turn', false)` через хук `useFollowTurnSetting()` (`lib/hooks/battle`, за зразком `useFxEnabled`), кнопка-перемикач «Слідкувати за ходом» у ряді інструментів ДМ (`BattleMapPanel`, як `ModeButton`, `aria-pressed`).
- `followTurn` пропускає невидимого: `followTarget(currentId, participants)` повертає `null` → камера не рухається (і в режимі прокрутки — `useScrollToCurrent` уже не знаходить токен у DOM; тест це фіксує).

### 4.7 UI: `components/battle/map/camera/`
- `MapCameraControls` (props ≤ 7): кнопки «+», «−», «До себе» (`Button size="icon"` з `components/ui/button`, іконки lucide `Plus`/`Minus`/`LocateFixed`), правий нижній кут; «До себе» — лише коли є `self` або `target`; підсвічена, коли `userMoved`.
- `MapMinimap` (props ≤ 7): SVG ≤ 160 px за довшою стороною у пропорції `win`; фон — `map.background` (той самий URL, `<image preserveAspectRatio="none">`, без завантаження нового), `blocked` — одним `regionFillPath`, учасники — крапки за стороною (лише передані, тобто видимі), рамка видимої області з `minimapViewport`; клік/тап → `flyToMinimap`. **Шов туману:** проп `hiddenCells?: Iterable<string> | null` — накриття однією `regionFillPath` (у C завжди порожньо; F передасть закриті клітинки, крапки токенів під туманом відфільтровані вже на рівні `participants`).
- Телефон: мінімапа згорнута за замовчуванням (кнопка-іконка `Map`), стан — два прапорці `createStorageFlag`: `battle-map-minimap-phone` (за замовчуванням `false`) і `battle-map-minimap-desktop` (`true`).
- i18n `battle.map.camera.{zoomIn,zoomOut,recenter,minimap,minimapShow,minimapHide,follow,followHint}` (uk + en); whats-new `2026-11-map-camera` (audience `all`) + ключі в `messages/{uk,en}/whatsNew.json`; нового екрана немає → hint не потрібен, абзац у довідці бою — так (якщо в `help` є стаття бою з картою; інакше пропустити).

### 4.8 DOM-контракт FX (без змін)
`[data-fx-clip]` на контейнері, `svg[data-fx-grid]` з `data-cols/rows`, `data-fx-participant` + `data-fx-anchor="map"` на токенах, `data-fx-zone`, `data-map-tokens`, `data-map-background`; `data-map-rotated` — лише в режимі «вміщується». `cellPoint` у `components/fx/runtime/anchors.ts` іде через `getScreenCTM()` — трансформація камери в CTM уже є; `visiblePoint` відсікає точки поза `[data-fx-clip]` (контейнер = вікно камери) — ціль поза камерою не анімується, як і зараз поза прокруткою. `scrollViewport` повертає `null` (зовнішній `div` не прокручується) — коректно. Тести це закріплюють (§7).

## 5. Reused / чому нове
Перевірено `lib/utils`, `lib/hooks`, `components/common`, `components/ui`, `components/hud`, `lib/utils/api`, код карти/сцени:
- **Перевикористовуємо:** `fitMapView`/`MapView`/`MIN_TAP_CELL_PX`/`playableBounds`/`tokenBox`/`mapSize`/`UNIT` (`grid/layout.ts`); `cellScreenPoint`/`cellAtScreenPoint`/`visibleGridWindow`/`GridWindow` і `useGridWindow` (етап D — культинг іде за камерою через CTM); `regionFillPath` (мінімапа: blocked, туман); `clamp` (`lib/utils/common/clamp`); логіку жестів `useViewport` (виноситься в `usePanPinch`, не дублюється); `useReducedMotion` і `createStorageFlag`/`useStorageValue` (`lib/hooks/common`); `turn.hero` з `deriveTurn` (хто «я», без нової ownership-логіки); фільтр видимості `scene.participants` з `map-scene.ts`; `Button` (`components/ui`), lucide-іконки; `ModeButton` у `BattleMapPanel` для перемикача ДМ; FX-контракт `anchors.ts` (без змін).
- **Нове, бо немає:** `lib/utils/battle/camera/*` — `viewport-math.ts` не вміє вмісту, меншого за контейнер (центрування), меж зуму від клітинки, ease, мінімапи; `useMapCamera` — `useViewport` не має перельотів/слідування/userMoved; `usePanPinch` — винесення, а не новий код; `MapCameraControls` — кнопки зуму `WorldMapView` інлайн зі стилем `atlas-zoom` і `data-tour` атласу, спільний примітив не виправдовує себе для двох місць різного стилю; `MapMinimap` — мінімап у репо немає. `components/common|hud` не мають карто-специфічних примітивів; `lib/utils/api` — без змін (немає маршрутів).

## 6. Ризики
1. **Жести без нативної інерції** — панорама на телефоні може здатися «важкою»; інерцію не робимо у v1 (перевірка в живому прогоні 375).
2. **Перерастеризація трансформованого шару на 200×200** (фон-фото ≤ 60, тайлових фонів ще немає) — ризик кадрів під час перельоту; запасний варіант — `will-change: transform` лише на час анімації.
3. **Поведінка 60×60 на десктопі** переходить зі скролу на камеру (§4.1) — інші звички (колесо панорамує, як і раніше; drag тепер панорамує при zoom 1).
4. **Слідування «бореться» з користувачем** — закрито `userMoved` + `inComfort`; перевірка — хід за ходом на 100×100 у живому прогоні.
5. **Кліки після панорами** — `wasDragged` із `usePanPinch` (той самий механізм, що зараз у `GridHit`/токенах).
6. **Подвійний монтаж карти** (телефон/десктоп) — кожен `BattleMap` має свою камеру; `cellPoint` бере видиму копію (без змін).

## 7. Тестування
- **Характеризація до змін:** `lib/hooks/battle/__tests__/useScrollToCurrent.test.tsx` (happy-dom): без `currentId`/`scrolls=false` → жодного `scrollBy`; токен усередині → немає; нижче/правіше/вище/лівіше → `scrollBy` з точним `dx/dy` і `behavior: 'smooth'`; токена немає в DOM (невидимий) → немає; `scrolls` false→true повторює; зміна `currentId` прокручує до нового.
- **FX-контракт:** `components/fx/__tests__/anchors.test.ts` — `cellPoint` із CTM камери (`a=d=zoom, e/f = зсув`) влучає в центр клітинки; точка поза `[data-fx-clip]` → `undefined`; без прокручуваного предка `scrollViewport` не обрізає.
- **Чисті:** `camera/__tests__/{camera,follow,minimap}.test.ts` — `clampCamera` (центрування по осі, межі, zoom), `centerOn` біля краю затискається, `zoomAround` тримає точку під курсором, `easeCamera` t=0/1/монотонність zoom, `inComfort` межі, `cameraBounds`/`tapZoom`, `followTarget` (немає/без позиції/є, великий footprint), `minimapViewport` обрізання і зворотність з `minimapPointToContent`; `layout.test.ts` — `fitMapView().grow`.
- **Хуки:** `usePanPinch.test.ts` (поріг, щипок з `dmx/dmy`, `panLocked`, `wasDragged`) + `useViewport.test.ts` без змін; `useMapCamera.test.tsx` (фейкові таймери/rAF, стаб `getBoundingClientRect`): початковий фокус, follow на зміну `currentId`, `target=null` не рухає, `userMoved` блокує м'який фолоу всередині ходу і скидається новим ходом, reduced motion миттєво, `recenter`, колесо Ctrl/без, resize зберігає центр, `enabled=false` пасивний; `useFollowTurnSetting` (default off, перемикання).
- **Компоненти:** `BattleMap.test.tsx` — 100×100 у 375×600 → режим камери (нема `overflow-auto`, контейнер = avail, `transform` шару, без `data-map-rotated`), 8×8 → режим «вміщується» як раніше; клік по клітинці через `clickCell` з CTM камери; `MapCameraControls`/`MapMinimap` (клік мінімапи → `flyToMinimap` з нормованими координатами, `hiddenCells` дає `path`, крапки лише для переданих учасників); `BattleMapPanel.test.tsx` — перемикач ДМ видно ДМ і не видно гравцю.
- **Гейти:** під час роботи `pnpm test:related`, `eslint --fix` по файлах; повний `test:run`, `tsc`, лінт по зміненим текам — один раз наприкінці гілки. Лайв-прогін і battle-sweep — у кінці епіку (хвости в `docs/STATUS.md`).

## 8. Питання до власника
1. **Колесо миші в режимі камери:** панорама, а зум — Ctrl/⌘ або щипок трекпада (рекомендація: як сьогодні в режимі прокрутки і працює з пензлем у редакторі) чи «колесо = зум», як у Roll20/Foundry?
2. **Слідування для гравця** — завжди увімкнене без перемикача (рекомендація) чи той самий перемикач, що в ДМ (тоді за замовчуванням увімкнено)?
3. **Мінімапа на телефоні** згорнута за замовчуванням (рекомендація) чи прихована зовсім?
