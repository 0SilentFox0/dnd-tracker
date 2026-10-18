### Task 2: Компонент `BattleMap` і хук масштабування

**Files:**
- Create: `components/battle/map/BattleMap.tsx`, `components/battle/map/MapToken.tsx`, `components/battle/map/index.ts`
- Create: `lib/hooks/battle/useMapViewport.ts` (+ експорт у `lib/hooks/battle/index.ts`)
- Test: `components/battle/map/__tests__/BattleMap.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: Task 1 (`UNIT`, `mapSize`, `cellCenter`, `cellPolygon`, `tokenBox`, `cellKey`, `CellMark`); `Portrait`, `HealthBar` з `@/components/battle/hud`
- Produces:

```ts
export interface BattleMapView {
  selectedId?: string | null;
  currentId?: string | null;
  /** cellKey → позначка; число — вартість руху (показується дрібно в клітинці) */
  marks?: Map<string, CellMark | number>;
  /** Лінія траєкторії від учасника до клітинки/учасника */
  trajectory?: { fromId: string; to: GridPoint } | null;
}

export interface BattleMapActions {
  onCellClick?: (p: GridPoint) => void;
  onCellHover?: (p: GridPoint | null) => void;
  onTokenClick?: (id: string) => void;
}

export function BattleMap(props: { map: BattleMapConfig; participants: BattleParticipant[]; view?: BattleMapView; actions?: BattleMapActions; className?: string }): JSX.Element;

export function useMapViewport(): {
  zoom: number;
  offset: { x: number; y: number };
  bind: { onWheel; onPointerDown; onPointerMove; onPointerUp; onPointerCancel }; // обробники на контейнер
  reset(): void;
};
```

**Поведінка й верстка (дотримуйся точно):**
- Зовнішній контейнер `relative overflow-hidden rounded-xl border border-white/10 bg-black touch-none select-none`, `style={{ aspectRatio: width / height }}` з `mapSize`; на ньому `useMapViewport().bind`.
- Внутрішній шар `absolute inset-0 origin-top-left` з `transform: translate(offset.x px, offset.y px) scale(zoom)`.
- Фон: `next/image` `fill` `className="object-cover"` з `map.background ?? "/screen-bg/battle-bg.webp"`, `sizes="100vw"`, `alt=""`, `priority`.
- SVG `absolute inset-0 h-full w-full` з `viewBox={`0 0 ${width} ${height}`}` і `preserveAspectRatio="none"`:
  - для кожної клітинки `<polygon points={cellPolygon(...)} />`: `fill` — `transparent`, або за позначкою: число/`"move"` → `rgba(120,200,120,.28)`, `"target"` → `rgba(230,80,60,.35)`, `"invalid-target"` → `rgba(120,120,120,.25)`; `stroke="rgba(255,255,255,1)"`, `strokeOpacity={map.opacity}`, `strokeWidth={1.5}`, `vectorEffect="non-scaling-stroke"`; `onClick` → `actions.onCellClick(p)`, `onPointerEnter` → `onCellHover(p)`; курсор `pointer`, якщо є `onCellClick`.
  - числова вартість — `<text>` у центрі клітинки дрібним шрифтом (`fontSize={UNIT * 0.22}`), `pointerEvents="none"`, колір `#e8dcc4`, opacity .8.
  - траєкторія: `<line>` від центру токена `fromId` до `cellCenter(to)`, `stroke="#f2c14e"`, `strokeWidth={4}`, `strokeDasharray="12 10"`, `vectorEffect="non-scaling-stroke"`, `pointerEvents="none"`, плюс коло радіусом `UNIT * 0.18` на кінці.
- Токени (`MapToken`) — HTML поверх SVG, `absolute`, `left/top` у відсотках від `cx/cy` мінус половина `size`, `width/height` у відсотках від `size` (ширина — від `width`, висота — від `height`; оскільки контейнер має той самий aspect ratio, коло лишається колом). Вміст: кнопка `aria-label={name}` з `data-fx-participant={id}`, всередині `Portrait` з `className="!h-full !w-full"` (або обгортка з `size` 100% — перевір, як `Portrait` приймає розмір; можна передати `size` у px, обчислений з ширини контейнера через `ResizeObserver` у `BattleMap`), під портретом тонкий `HealthBar` шириною 90%. Обраний (`selectedId`) — золоте кільце `ring-2 ring-[var(--gold)]`; поточний (`currentId`) — `current` у `Portrait`. Клік → `actions.onTokenClick(id)` з `event.stopPropagation()`.
- Лише учасники з `tokenBox !== null` і не в резерві; мертві рендеряться (Portrait сам робить їх сірими) нижче живих (`z-index`).
- `useMapViewport`: zoom у межах `[1, 3]`, крок колеса ×1.1 до курсора; перетягування лише якщо `zoom > 1` або вказівник пройшов > 4 px (щоб клік по клітинці не ставав drag); два вказівники — pinch (відстань між ними → zoom). Після `reset()` — `zoom 1`, `offset 0`. Обмеж `offset`, щоб карта не виїжджала повністю за край (clamp до `[-(zoom-1)*w, 0]`, де `w`,`h` — розміри контейнера з `getBoundingClientRect`).

- [ ] **Step 1: Failing test** (`BattleMap.test.tsx`, happy-dom): рендер карти 4×3 квадрати з 2 учасниками → 12 `polygon`; є елементи `[data-fx-participant="h"]` і `[data-fx-participant="e"]`; клік по полігону з індексом 5 викликає `onCellClick({ x: 1, y: 1 })`; клік по токену викликає `onTokenClick("h")` і НЕ викликає `onCellClick`; позначка `"target"` дає полігону `fill="rgba(230,80,60,.35)"`. Для гексів 4×3 → 12 полігонів з 6 вершинами. Використовуй `@testing-library/react`, якщо він є в `package.json`, інакше `react-dom/client` + `act` за зразком наявних компонентних тестів (знайди: `grep -rl "vitest-environment happy-dom" components | head`).
- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Реалізація** за описом вище.
- [ ] **Step 4: Run — PASS**, `pnpm exec tsc --noEmit`, `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(battle-map): BattleMap component with grid, tokens, highlights and pan/zoom`

---

