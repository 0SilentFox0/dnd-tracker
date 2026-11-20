# План: карта світу — якість, частина A (вьюпорт і телефон)

Спека: [2026-11-20-world-quality-a-viewport-design.md](../specs/2026-11-20-world-quality-a-viewport-design.md). Гілка `feat/world-quality`, worktree `../dnd-tracker-mapq`.

**Правила виконання (для всіх імплементерів):**
- Тести **пишуться, але не запускаються**. Один повний `pnpm test:run` — лише в задачі 7.
- Після кожної задачі: `pnpm exec eslint --fix <змінені файли>`; `tsc` не запускати (гейт у задачі 7).
- Коментарі мінімальні, англійською, один рядок і лише про «чому». Кирилиця в коді заборонена (лише `messages/*`).
- ≤ 7 props на компонент; групи — об'єктами. `WorldMapView` лишається з 14 props (exempt 14) — **не додавати жодного нового пропа**.
- Хуки — з барела `@/lib/hooks/world`; компоненти не імпортують `@/lib/api/*`.
- Коміт наприкінці кожної задачі (`feat(world): …`), рядок `Co-Authored-By` з атрибуції сесії.

## Відповіді на питання з постановки (перевірено в коді)

1. **`fullscreen` через `slots`.** `WorldMapViewProps.slots` — це вже об'єкт `{ overlay, card, hint }`; додаємо поле `fullscreen?: { full: boolean; toggle(): void }`. Кількість props `WorldMapView` не змінюється (14: `detail, selectedId, edit, handlers, layers, fog, heroes, enemies, dragHeroes, trails, focus, slots, compact, className`). Кнопка рендериться в блоці `data-tour="world.zoom"` лише коли `slots.fullscreen` передано — тому `ShowWorldStage` (не передає) кнопки не має без жодного прапорця.
2. **Esc-драбина.** Два окремі слухачі: `useWorldPlay` (window, bubble) і `useWorldEditorPage` (window, **capture**, + `preventDefault`, щоб `useMapDrawing` пропускав спожиті натискання). Окремий Esc-слухач у `useMapFullscreen` дав би гонку порядку реєстрації (bubble-слухачі в одному компоненті перереєструються при зміні deps). Тому `useMapFullscreen` **не має свого Esc**; обидва хуки сторінки викликають його самі й вирішують крок через спільну чисту функцію `escapeStep` (порядок: «Докладніше» → [ДМ: малювання, віддається `useMapDrawing`] → повний екран → вибір).
3. **Спільна обгортка без ремонту.** В обох хостах карта вже сидить у `div` з `relative ${MAP_HEIGHT}` (гравець: `data-tour="world.map"`; ДМ: обгортка з обома варіантами `WorldMapView` — звичайним і «Очима героя», легендами й кнопками чернетки). Повний екран = зміна **класів цього ж елемента** (`fixed inset-0 z-50 h-dvh` замість `relative ${MAP_HEIGHT}`), позиція в дереві й `key` не змінюються → React не перемонтовує `WorldMapView`, зум/офсет/вибір зберігаються. `fullscreen` хости беруть з хука сторінки (`play.fullscreen`, `useWorldEditorPage().view.fullscreen`).
4. **Де фокус при «Докладніше».** Фокус видає хук сторінки в одній дії `openDetails()` разом з `details.set(true)` — через уже наявний проп `focus` (`{ point, seq }`, у гравця є, ДМ його ще не передає). Фокус лише **панорамує** (`zoom: 1` — `focusAt` бере `max(v.zoom, zoom)`, тож зум не змінюється). Проблема: у ДМ десктопна панель — окремий `aside lg:w-80` у flex-рядку, контейнер карти звужується, а `box` оновлюється лише після `ResizeObserver` (наступний рендер), тобто фокус рахується по старому розміру. Рішення: `WorldMapView` при зміні `box.width` масштабує офсет пропорційно (`useViewport().rescale(k)` у `useLayoutEffect`). `fitBox` зберігає пропорції, тож масштабування рівномірне і центр лишається центром. Те саме виправляє стрибок вигляду при вході/виході з повного екрана. У гравця права колонка (`20rem`) є завжди, тому розмір карти не змінюється і фокус просто центрує маркер. На телефоні фокус не робимо: лист модальний.

## Відхилення від спеки

| Спека | План | Чому |
|---|---|---|
| Повний екран «`role=dialog` через `FullscreenOverlay`» | `FullscreenOverlay` не використовується; обгортка отримує `role="region"` + `aria-label` лише в `full` | Інший елемент замість обгортки перемонтував би `WorldMapView`. До того ж обидві Esc-драбини пропускають події з `target.closest('[role=dialog]')`: з `role=dialog` на обгортці Esc із фокусом на піні/зумі нічого б не робив |
| Esc додається в драбину (окремий хук з Esc, тест «useMapFullscreen: Esc») | `useMapFullscreen` без Esc; Esc — через спільну `escapeStep` у двох хуках сторінки; тест Esc — у `escape-step.test.ts` і `useWorldPlay.test.ts` | Детермінований порядок, без гонки слухачів |
| «`body` блокує скрол» | `document.documentElement.style.overflow = 'hidden'` поки `full`, відновлення в cleanup. `useScrollLock` не беремо | `useScrollLock` глушить `touchmove`/`wheel` на `window` — ламає прокрутку в листі `vaul` (портал) без allow-списку; обгортка `fixed inset-0` і так закриває сторінку |
| «Докладніше» в повному екрані відкриває панель у правій колонці | На десктопі `openDetails()` спершу **виходить** з повного екрана, потім відкриває панель і фокусує. На телефоні лишається в повному екрані (лист — портал `z-50`, видно поверх) | Права колонка поза обгорткою; у повному екрані її не видно, а накладати панель на карту спека забороняє |
| Компактна мітка лише в `MarkerBubble` | Також `DmMarkerBubble`: на десктопі (`DESKTOP_QUERY`, де мітка на карті) — компактний `MarkerBubble`; повна inline-форма лишається в діалозі/листі (< lg). У `WorldMarkerPanel` (секція дочірньої карти) додаються `MoveMapMenu` і «Видалити карту» | Інакше ДМ-мітка (форма на ~300 px) і далі закриває карту; дві дії, що були лише в бульбашці, не губляться |
| Мінімальна тап-ціль через `::before` inset −4px | Також `inset: -6px` для `data-minor` (20 px) | 20 + 8 = 28 < 32 |
| Фокус «Докладніше» стандартним `FOCUS_ZOOM` | `focus.zoom` опційний (`1` = лише панорама) | Не міняти зум користувача при відкритті панелі |

## Задачі й порядок

```
T1 (логіка кластерів) ──► T2 (PinCluster + WorldPins + CSS)  ──┐
T3 (хуки: viewport.rescale, fullscreen, focus, Esc)  ───────────┼─► T4 (WorldMapView) ─► T6 (хости + i18n + whatsNew) ─► T7 (гейти, доки, жива)
T5 (компактна мітка + DM панель) ───────────────────────────────┘
```

- Паралельно можна: {T1→T2}, {T3}, {T5} — різні файли. Спільний файл — лише `messages/*/world.json`: ключі додає **тільки** T2 (кластер) і T6 (повний екран, whatsNew), тому T6 строго після T2.
- Рекомендована видача (економія ходів): імплементер **A** = T1+T2; **B** = T3+T5; після обох — **C** = T4+T6; далі T7 (контролер + Sonnet для живої перевірки).

---

## T1. Чиста логіка: `clusterByPixel`, ранг пінів, зум кластера

**Файли:**
- створити `lib/utils/world/cluster.ts`, `lib/utils/world/__tests__/cluster.test.ts`;
- змінити `lib/utils/world/hero-clusters.ts` (тонка обгортка), `lib/utils/world/pin-tier.ts` (+`pinRank`), `lib/utils/world/__tests__/pin-tier.test.ts`, `lib/constants/world.ts`.

**Константи** (`lib/constants/world.ts`): `PIN_CLUSTER_PX = 28`, `PIN_CLUSTER_PX_COMPACT = 36`.

**`cluster.ts`:**

```ts
import type { MapPoint } from '@/types/world';

export interface PixelCluster<T> {
    key: string;
    point: MapPoint;
    items: T[];
}

interface ClusterOptions<T> {
    key(item: T): string;
    point(item: T): MapPoint;
    px(item: T): { x: number; y: number };
    threshold: number;
}

/** Greedy in input order: the first item of a group is its anchor and representative. */
export function clusterByPixel<T>(
    items: readonly T[],
    { key, point, px, threshold }: ClusterOptions<T>
): PixelCluster<T>[] {
    const groups: (PixelCluster<T> & { at: { x: number; y: number } })[] = [];

    for (const item of items) {
        const at = px(item);

        const home = groups.find(
            (g) => Math.hypot(g.at.x - at.x, g.at.y - at.y) < threshold
        );

        if (home) home.items.push(item);
        else groups.push({ key: key(item), point: point(item), items: [item], at });
    }

    return groups.map(({ at: _at, ...g }) => g);
}

const SPREAD_MARGIN = 1.15;
const MIN_STEP = 1.5;

/** Zoom that splits the closest pair, or null when the list must open instead (max zoom or duplicates). */
export function clusterZoom(
    points: readonly MapPoint[],
    view: { zoom: number; box: { width: number; height: number }; threshold: number; maxZoom: number }
): number | null {
    if (view.zoom >= view.maxZoom) return null;

    let closest = Infinity;

    for (let i = 0; i < points.length; i++)
        for (let j = i + 1; j < points.length; j++)
            closest = Math.min(
                closest,
                Math.hypot(
                    (points[i].x - points[j].x) * view.box.width,
                    (points[i].y - points[j].y) * view.box.height
                )
            );

    if (!(closest > 0)) return null;

    return Math.min(
        view.maxZoom,
        Math.max(view.zoom * MIN_STEP, (view.threshold / closest) * SPREAD_MARGIN)
    );
}

export const clusterCenter = (points: readonly MapPoint[]): MapPoint => { /* centre of the bounding box */ };
```

`box` у `clusterZoom` — розмір листа при зумі 1 (пікселі = норм. × box × zoom).

**`hero-clusters.ts`:** сигнатура й тип `HeroClusterGroup` **без змін**; тіло = `own` першими + `clusterByPixel(ordered, { key: h => h.id, point: h => ({ x: h.x, y: h.y }), px, threshold })` + мапінг у `{ key, x, y, heroes }`. `hero-clusters.test.ts` не чіпати — має лишитись зеленим.

**`pin-tier.ts`:** `pinRank(m: PinLike): number` — порядок за іконкою `castle 0, city 1, portal 2, dungeon 3, landmark 4, battle 5, (без іконки) 6, village 7, camp 8` (minor завжди нижче); `byPinRank` — стабільний компаратор для `[...xs].sort(byPinRank)`, нічия = вхідний порядок.

**Тести:**
- `cluster.test.ts`:
  - `joins items closer than the threshold and splits at it` (23.9 px — один, 24 px — два);
  - `measures in screen pixels: zoom separates the same items`;
  - `the first item in input order is the anchor and the cluster key`;
  - `is greedy: a far third item does not chain through the second`;
  - `is deterministic: same input gives same groups and order`;
  - `clusterZoom returns a zoom that splits the closest pair, clamped to maxZoom`;
  - `clusterZoom never returns less than zoom × 1.5`;
  - `clusterZoom returns null at max zoom`;
  - `clusterZoom returns null for duplicates in one point`;
  - `clusterCenter is the centre of the bounding box`.
- `pin-tier.test.ts`: `pinRank puts castles before cities and minor pins last`; `byPinRank keeps input order on ties`.

---

## T2. `PinCluster` + кластери у `WorldPins` + CSS

**Залежить від T1.** Файли:
- створити `components/world/map/PinCluster.tsx`;
- змінити `components/world/map/WorldPins.tsx`, `components/world/map/HeroCluster.tsx` (лише клас бейджа), `components/world/world-atlas.css`, `components/world/map/__tests__/WorldPins.test.tsx`, `messages/{uk,en}/world.json`.

**`WorldPins` props (7, бюджет не росте):** `compact?: boolean` замінюється на

```ts
screen?: {
    box: { width: number; height: number };
    compact?: boolean;
    cluster?: boolean; // false for DM point/entry tools
};
```

Без `screen` кластеризації немає (так рендерять старі тести й будь-який хост без розміру). `PinHandlers` отримує `onClusterZoom?(center: MapPoint, zoom: number): void` (`WorldMapView` передає його через спред у `handlers`, T4).

**Алгоритм у `WorldPins`:**
1. `visible` = точкові маркери, що не `pinHiddenAtZoom` (як зараз, `points`).
2. `free` = `visible` без `isPinned` (вибраний / потягнутий) — вони завжди звичайні піни.
3. Якщо `screen?.box && screen.cluster !== false`: `clusterByPixel([...free].sort(byPinRank), { key: m => m.id, point: markerAnchor, px: m => ({ x: a.x * box.width * zoom, y: a.y * box.height * zoom }), threshold: compact ? PIN_CLUSTER_PX_COMPACT : PIN_CLUSTER_PX })`.
4. Рендер: зони — як зараз (порядок `markers.map` лишається для зон); точки — кластер з одним елементом → наявна розмітка піна (винести в локальну `renderPin(m)`), з ≥ 2 → `<PinCluster>`. `labelBlockers` рахуються, як і раніше, з усіх `visible`.
5. `data-tour="world.marker"` — на першому відрендереному піні чи кластері.

**`PinCluster`** (4 props): `{ cluster: PixelCluster<WorldMarker>; zoom: number; nextZoom: number | null; actions: { onZoom(center: MapPoint, zoom: number): void; onPick(id: string): void } }`.
- `nextZoom` рахує `WorldPins` через `clusterZoom(items.map(markerAnchor), { zoom, box, threshold, maxZoom: WORLD_MAX_ZOOM })`.
- Зразок — `HeroCluster`: `HudButton` `atlas-pin atlas-pin-cluster absolute`, стиль позиції/`scale(1/zoom)`, `touchAction: 'none'`, `onPointerDown`/`onDoubleClick` — `stopPropagation`, `onDragStart` — `preventDefault`.
- Печатка — іконка представника (`items[0]`, `MARKER_ICON`, `sealStyle(color)` якщо є), бейдж `+{items.length - 1}` (`aria-hidden`), `data-cluster={items.length}`, `aria-label={t('pinCluster', { name, count })}`.
- `nextZoom !== null` → `onClick` = `actions.onZoom(clusterCenter(...), nextZoom)`; інакше кнопка — `PopoverTrigger`, `PopoverContent` зі списком (`aria-label={t('pinClusterList')}`), рядок = іконка + назва, клік → закрити поповер + `actions.onPick(id)`.
- У `WorldPins`: `onZoom` → `handlers.onClusterZoom`, `onPick` → `handlers.onMarkerClick`.

**CSS (`world-atlas.css`):**
- `.atlas-seal { position: relative; }` + `.atlas-seal::before { content: ""; position: absolute; inset: -4px; border-radius: 9999px; }`; `.atlas-pin[data-minor="true"] .atlas-seal::before { inset: -6px; }`.
- `.atlas-hero-badge` перейменувати на `.atlas-count-badge` (використовують `HeroCluster` і `PinCluster`); `.atlas-pin-cluster { overflow: visible; }`.

**i18n** (`world.json`, обидві мови): `pinCluster` («{name} і ще {count}» / «{name} and {count} more»), `pinClusterList` («Місця тут» / «Places here»).

**Тести** (`WorldPins.test.tsx`; існуючі `compact` → `screen={{ box, compact: true }}`):
- `groups pins closer than the threshold into one +N cluster`;
- `the castle represents a cluster with a village and a city` (aria-label з назвою замку);
- `keeps the selected pin out of a cluster`;
- `does not cluster without screen or with cluster: false`;
- `uses the wider compact threshold`;
- `clicking a cluster below max zoom calls onClusterZoom with its centre and a larger zoom`;
- `at max zoom a cluster opens a list and a row calls onMarkerClick`;
- `pins in one point open the list instead of zooming`;
- `zooming in splits a cluster into single pins`.

---

## T3. Хуки: `rescale`, `useMapFullscreen`, `useMapFocus`, Esc-драбина, `openDetails`

**Файли:**
- змінити `lib/hooks/common/useViewport.ts` (+`rescale`), `lib/hooks/common/__tests__/useViewport.test.ts`;
- створити `lib/hooks/world/useMapFullscreen.ts`, `lib/hooks/world/useMapFocus.ts`, `lib/utils/world/escape-step.ts` + тести `lib/hooks/world/__tests__/useMapFullscreen.test.ts`, `lib/utils/world/__tests__/escape-step.test.ts`;
- змінити `lib/hooks/world/index.ts` (барел), `lib/hooks/world/useWorldPlay.ts`, `lib/hooks/world/useWorldEditorPage.ts`, `lib/hooks/world/__tests__/useWorldPlay.test.ts`, `types/world.ts` (+`MapFocus`).

**`useViewport`:** `rescale = useCallback((k: number) => setView(v => ({ ...v, x: v.x * k, y: v.y * k })), [])`, повернути поруч із `focusOn`. Більше нічого не змінюється.

**`types/world.ts`:** `export interface MapFocus { point: MapPoint; seq: number; zoom?: number }` (`zoom: 1` = лише панорама; `focusAt` бере `max`). `WorldMapViewProps.focus` перейде на цей тип у T4.

**`useMapFocus()`** → `{ focus: MapFocus | undefined; focusPoint(point: MapPoint, zoom?: number): void }` — винесене з `useWorldPlay` (`seq` + 1). `useWorldPlay` переходить на нього (поведінка `focusHero`/`pickPlace` без змін).

**`useMapFullscreen()`** → `{ full: boolean; toggle(): void; exit(): void }`:

```ts
useEffect(() => {
    if (!full) return;

    const root = document.documentElement;
    const prev = root.style.overflow;

    root.style.overflow = 'hidden';

    return () => {
        root.style.overflow = prev;
    };
}, [full]);
```

**`escape-step.ts`:**

```ts
export type EscapeStep = 'details' | 'drawing' | 'fullscreen' | 'selection';

export function escapeStep(s: {
    details: boolean;
    drawing?: boolean;
    full: boolean;
    selection: boolean;
}): EscapeStep | null {
    if (s.details) return 'details';
    if (s.drawing) return 'drawing';
    if (s.full) return 'fullscreen';
    if (s.selection) return 'selection';

    return null;
}
```

**`useWorldPlay`:** у слухачі — ранні фільтри без змін (`defaultPrevented`, `isTyping`, `[role=dialog]`), далі `switch (escapeStep({ details: detailsOpen, full, selection: hasSelection }))`: `details` → закрити; `fullscreen` → `exit()`; `selection` → `select(null)`; `null` → return; `preventDefault` у трьох гілках. Deps ефекту + `full`, `exit`. Повертає додатково `fullscreen` і `openDetails()`:

```ts
const desktop = useMediaQuery(DESKTOP_QUERY);

const openDetails = () => {
    if (!selectedMarker) return;
    if (desktop) {
        fullscreen.exit();
        focusPoint(markerAnchor(selectedMarker), 1);
    }
    setDetailsOpen(true);
};
```

**`useWorldEditorPage`:** той самий підхід. Захоплювальний слухач:

```ts
const step = escapeStep({ details: detailsVisible, drawing: drawingActive, full, selection: hasSelection });

if (step === null || step === 'drawing') return; // drawing Esc belongs to useMapDrawing
if (step === 'details') setDetailsOpen(false);
else if (step === 'fullscreen') exit();
else select(null);

e.preventDefault();
// keep the existing activeElement.blur()
```

Новий хук усередині: `useMapFocus()`, `useMapFullscreen()`, `useMediaQuery(DESKTOP_QUERY)`. Повертає нову групу `view: { focus, fullscreen }`, а в `actions` додає `openDetails()` (як у гравця: вихід з повного екрана на десктопі + `focusPoint(markerAnchor(selectedMarker), 1)` + `setDetailsOpen(true)`). `setMode`/`closePanel` повний екран не чіпають.

**Тести:**
- `useViewport.test.ts`: `rescale multiplies the offset and keeps the zoom`; `focusOn with zoom 1 keeps the current zoom` (фіксує поведінку `focusAt`, на яку спирається панорама).
- `useMapFullscreen.test.ts` (happy-dom): `toggle switches full on and off`; `locks page scroll while full and restores the previous overflow on exit`; `restores the overflow on unmount`; `exit is a no-op when not full`.
- `escape-step.test.ts`: `details first`; `drawing before fullscreen`; `fullscreen before selection`; `null when nothing is open`.
- `useWorldPlay.test.ts`: `Esc exits fullscreen after the details and before the selection`; `openDetails on desktop exits fullscreen and focuses the marker keeping zoom` (мок `matchMedia` на desktop); `openDetails on a phone keeps fullscreen and does not focus`.

---

## T4. `WorldMapView`: підкладка, кнопка повного екрана, `rescale`, кластери, фокус

**Залежить від T2, T3.** Файли: `components/world/map/WorldMapView.tsx`, `components/world/world-atlas.css`, `components/world/map/__tests__/WorldMapView.test.tsx`.

- **Props:** без нових. `slots` += `fullscreen?: { full: boolean; toggle(): void }`; `focus?: MapFocus`.
- **Підкладка:** перша дитина кореня `atlas-map` (до `outerRef`), лише коли `size.width > 0`:
  `<Image src={toMediaUrl(map.imageUrl)} alt="" aria-hidden fill sizes={sizes} draggable={false} className="atlas-backdrop pointer-events-none object-cover select-none" />`, де `sizes` — **та сама змінна**, що й у головного зображення (`${Math.round(box.width * Math.min(zoom, MAX_SIZES_ZOOM))}px`). Однакові `src`+`sizes` → той самий URL `/_next/image` → браузер бере з кешу, нового egress немає.
  CSS: `.atlas-backdrop { filter: blur(18px) brightness(.55); transform: scale(1.1); }` (масштаб ховає розмиті краї); `--atlas-paper` фону лишається як запасний, поки картинка вантажиться. Рамка `.atlas-sheet` без змін.
- **Кнопка:** у блоці `data-tour="world.zoom"` після «скинути», лише коли `slots?.fullscreen`: `Button size="icon" variant="ghost" className="atlas-zoom"`, іконка `Maximize`/`Minimize`, `aria-label={t(full ? 'exitFullscreen' : 'fullscreen')}`, `aria-pressed={full}`.
- **`rescale`:**

```ts
const lastWidth = useRef(0);

useLayoutEffect(() => {
    const prev = lastWidth.current;

    lastWidth.current = box.width;

    // keep the viewed area when the sheet resizes (side panel, fullscreen)
    if (prev > 0 && box.width > 0 && box.width !== prev) rescale(box.width / prev);
}, [box.width, rescale]);
```

- **Фокус:** `focusOn(focus.point.x, focus.point.y, focus.zoom ?? FOCUS_ZOOM)`.
- **`WorldPins`:** `screen={{ box: { width: box.width, height: box.height }, compact, cluster: tool !== 'point' && tool !== 'entry' }}`, `handlers={{ ...handlers, onClusterZoom: (p, z) => focusOn(p.x, p.y, z) }}`.
- **`CARD_FALLBACK_SIZE`** → `{ width: 208, height: 64 }` (компактна мітка `w-52`).

**Тести** (`WorldMapView.test.tsx`):
- `renders the blurred backdrop with the same image URL and sizes as the map`;
- `shows the fullscreen button only when slots.fullscreen is given and calls toggle`;
- `the fullscreen button label follows the state`;
- `clusters close pins and a cluster click zooms the view` (зум змінюється → `data-labels` / трансформ шару);
- `does not cluster pins with the point tool`;
- `a focus with zoom 1 pans without zooming`.

---

## T5. Компактна мітка і панель ДМ

**Незалежна.** Файли: `components/world/nav/MarkerBubble.tsx`, `components/world/editor/DmMarkerBubble.tsx`, `components/world/editor/panels/WorldMarkerPanel.tsx`, тести `components/world/nav/__tests__/MarkerBubble.test.tsx`, `components/world/editor/__tests__/DmMarkerBubble.test.tsx`, `components/world/editor/panels/__tests__/WorldMarkerPanel.test.tsx`.

- **`MarkerBubble`** (props без змін). Варіант без `children` і без `embedded` (десктопна мітка): `w-52`, один рядок — іконка, назва (`truncate`, `title`), `HudIconButton size="sm"` «Докладніше» (`PanelRight`, `aria-label={t('more')}`, `data-tour="world.more"`), «Відкрити» (`FolderOpen`, лише з `onOpenMap`), «Закрити» (`X`). Опису й нижньої сітки `BUBBLE_ACTIONS` немає. `embedded` і варіант з `children` — без змін (рендер як зараз).
- **`DmMarkerBubble`:** `const onMap = useMediaQuery(DESKTOP_QUERY)`; якщо `onMap` → `<MarkerBubble marker actions={{ onMore, onClose, onOpenMap: marker.childMapId ? () => m.openMap(marker.childMapId) : undefined }} />`; інакше — поточна inline-форма (лист/діалог) без змін.
- **`WorldMarkerPanel`**, секція `editor.childMap`, коли є дочірня карта: під «Відкрити» додати `MoveMapMenu` (як у `DmMarkerBubble`: `campaignId`, `map={child}`, `maps`, `onMove → editor.map.move.mutateOk`) і кнопку «Видалити карту» (`m.removeMap(child)`, тон danger). Нових ключів i18n немає (`editor.deleteMap` уже є).

**Тести:**
- `MarkerBubble.test.tsx`: оновити `shows name, description and the base actions` → `desktop label shows the name and icon actions without the description`; додати `Open is an icon button only with onOpenMap`; `embedded` і `children` тести лишаються.
- `DmMarkerBubble.test.tsx`: `on desktop renders the compact label with More and Open`; існуючі тести форми — під моком `matchMedia` < 1024 px.
- `WorldMarkerPanel.test.tsx`: `child map section offers move and delete`.

---

## T6. Хости: обгортка повного екрана, висота, «Докладніше», i18n, whatsNew

**Залежить від T4, T5 (і T2 через `world.json`).** Файли: `components/world/play/WorldPlayClient.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`, `messages/{uk,en}/world.json`, `messages/{uk,en}/whatsNew.json`, `lib/onboarding/whats-new.ts`.

- **Висота:** гравець `MAP_HEIGHT = 'h-[calc(100dvh-var(--app-header-h,89px)-6rem)] lg:h-[calc(100dvh-var(--app-header-h,89px)-9rem)] min-h-[20rem]'`; ДМ — `-6rem` у базовому класі, `lg:h-auto lg:min-h-0 lg:flex-1` без змін.
- **Обгортка** (той самий `div`, лише класи/атрибути):

```tsx
<div
    className={full ? 'fixed inset-0 z-50 h-dvh bg-black' : `relative ${MAP_HEIGHT}`}
    role={full ? 'region' : undefined}
    aria-label={full ? t('zoom.fullscreen') : undefined}
    data-tour="world.map"
>
```

  У ДМ — до класу додається `lg:min-w-0` у звичайному стані. `WorldMapView` у `full` отримує `className="rounded-none border-0"` (лише клас, без ремонту). У ДМ це одна обгортка для обох `WorldMapView` (звичайний і «Очима героя»), легенд і кнопок чернетки — повний екран працює в обох.
- **`slots.fullscreen={{ full, toggle }}`** — у гравця й в обох ДМ-варіантах (`eyes` теж).
- **«Докладніше»:** гравець `onMore: play.openDetails`; ДМ `onMore: openDetails` (з `actions`). ДМ передає `focus={view.focus}` у звичайний `WorldMapView`.
- **Нічого не змінюється** в `ShowWorldStage` (без `slots.fullscreen` → кнопки немає; підкладка з'являється автоматично).
- **i18n `world.json`** (обидві мови): `zoom.fullscreen` («Повний екран» / «Full screen»), `zoom.exitFullscreen` («Вийти з повного екрана» / «Exit full screen»).
- **whatsNew:** `{ id: '2026-11-20-world-viewport', date: '2026-11-20', audience: 'all' }` першим у `CORE_WHATS_NEW`; `whatsNew.2026-11-20-world-viewport.{title,body}` в обох `whatsNew.json` (кластери «+N», повний екран, без смуг, компактна мітка з панеллю збоку).

**Тести:** окремих компонентних тестів сторінок немає; покривається T3/T4 + живою перевіркою. `lib/onboarding/__tests__/whats-new.test.ts` має пройти з новим записом (ключі в обох мовах).

---

## T7. Гейти, документація, жива перевірка

**Гейти** (по одному, не паралельно; перед стартом — `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`):
1. `pnpm exec tsc --noEmit`
2. `pnpm cycles`
3. `pnpm lint:dirs --changed main`
4. `pnpm test:run` (один повний прогін). Особливо: `lib/__tests__/props-budget.test.ts` (`WorldMapView` = 14, `WorldPins` ≤ 7, `PinCluster` 4), `lib/i18n/__tests__/scope-size.test.ts` (бюджети i18n). Якщо `scope-size` падає через ріст `world`/`whatsNew` — підняти відповідний `i18n.budgetKb` у `systems/<id>/meta.ts` із запасом ~0.5 KB (як `152c902e7`) і записати в STATUS. `hero-clusters.test.ts` має пройти без змін.
5. Падіння → виправити, перезапустити лише цільові файли (`pnpm test:run <file>`).

**Документація:**
- `docs/architecture/world-map.md`: розділ «Кластери героїв» → «Кластери героїв і пінів» (`clusterByPixel`, поріг 28/36 px, ранг, винятки вибраний/потягнутий/`point`/`entry`, зум кластера або поповер); новий розділ «Вьюпорт (2026-11-20, якість A)»: підкладка (той самий URL), `useMapFullscreen` на обгортці хоста без ремонту, Esc-порядок `escapeStep`, `rescale` при зміні `box`, компактна мітка + `openDetails`; граблі: не ставити `role=dialog` на обгортку (Esc-драбини), не перемонтовувати карту при повному екрані, `sizes` підкладки = `sizes` карти.
- `docs/STATUS.md`: запис про частину A (гілка, гейти, бюджети, жива перевірка, відкрите).

**Жива перевірка** (Sonnet-субагент, браузер):
- Збірка: `NODE_OPTIONS=--max-old-space-size=10240 pnpm exec next build`, потім `RATE_LIMIT_ALLOW_MEMORY=1 pnpm exec next start -p 3010`; `DATABASE_URL` → БД `prodcopy_layers`. Картинка `public/test-maps/meauvil.png` уже на місці (gitignored).
- ДМ — `http://localhost:3010`, гравець — `http://127.0.0.1:3010` (окремі сесії). Кампанія `meauvil-test` (Nouerland: 14 зон, 124 міста, герой на столиці).
- Сценарії (390 px, потім десктоп):
  1. **Кластери:** на зумі 1 піни не зливаються — бейджі «+N»; тап по кластеру наближає й розводить; на максимальному зумі / дублікатах — поповер, рядок вибирає пін; вибраний пін ніколи не в кластері; ДМ в інструменті `point` — без кластерів; drag піна працює.
  2. **Тап-ціль:** `getBoundingClientRect` печатки + `::before` ≥ 32 px (JS-перевірка, не скріншот).
  3. **Смуги:** немає бежевих смуг над/під картою — скріншот зі зменшеним масштабом; підкладка розмита; у мережі немає другого запиту `/_next/image` на картинку карти.
  4. **Повний екран:** кнопка в блоці зуму (ДМ, гравець; у «Показі» її немає); зум/офсет/вибір зберігаються при вході й виході; легенди видно; сторінка під обгорткою не скролиться; Esc: «Докладніше» → повний екран → вибір (по кроку на натискання); ДМ з чернеткою зони — Esc спершу скасовує чернетку.
  5. **Мітка + панель (десктоп):** мітка компактна (назва + іконки), без опису; «Докладніше» відкриває праву колонку, маркер лишається видимим (ДМ — колонка звужує карту, маркер у центрі); у повному екрані «Докладніше» виходить з нього; ДМ: «Перемістити карту» / «Видалити карту» тепер у панелі.
  6. **Телефон:** лист бульбашки й «Докладніше» як раніше, поверх повного екрана.
  7. 0 відповідей 5xx у мережі.
- Результат — таблиця прогресу в звіті; знайдене — виправити або записати у STATUS як відкрите.
