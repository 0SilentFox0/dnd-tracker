# Battle Map — блок 2a: компонент карти й тестова сторінка — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевикористовуваний компонент `BattleMap` (фон, сітка квадрат/гекс з прозорістю, токени учасників, підсвітка досяжних клітинок і цілей, лінія траєкторії, pan/zoom) і тестова сторінка `/dev/battle-map` з мок-учасниками, де можна рухати їх і пробувати атаки — без бою в БД.

**Architecture:** Чиста математика відмальовки в `lib/utils/battle/grid/layout.ts` (центр клітинки, полігон гекса, розмір карти в «одиницях»), чиста логіка підсвітки в `lib/utils/battle/grid/map-view.ts` (на основі рушія блоку 1: `reachable`, `attackReachError`). Компонент рендерить SVG у координатах одиниць (`viewBox`), тож масштабування — лише CSS. Токени — `<foreignObject>`-вільні: SVG `<g>` для клітинок + абсолютно позиціоновані HTML-токени у відсотках поверх SVG (щоб перевикористати `Portrait` і мати `data-fx-participant` для FX). Сторінка-пісочниця тримає стан у `useState` і викликає ті самі функції рушія, що й сервер.

**Tech Stack:** React 19, Next.js 16 App Router, Tailwind, TypeScript strict, Vitest (+ happy-dom для компонента).

**Spec:** `docs/superpowers/specs/2026-10-18-battle-map.md`

## Global Constraints

- Конвенції з `CLAUDE.md`: `@/` імпорти, `simple-import-sort`, `padding-line-between-statements`, мінімальні коментарі, тексти UI українською.
- Компоненти не імпортують `@/lib/api/*`; нетривіальна логіка — у `lib/utils` або хуках `lib/hooks/battle` (barrel `index.ts`).
- ≤ ~7 пропсів; колбеки групуються в один обʼєкт `actions`.
- Без нових залежностей (жодних canvas/drag-бібліотек).
- `react-hooks/exhaustive-deps` — error; `no-console` лише `info/warn/error`.
- Токени мають атрибут `data-fx-participant={id}` (сумісність із FX MVP).
- Сторінка `/dev/battle-map` у production повертає `notFound()`.
- Фон за замовчуванням — `/screen-bg/battle-bg.webp`; портрети мок-юнітів — публічні URL Supabase Storage `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unit-icons/<file>.webp` (файли з `assets/unit-icons/`).

## Review Focus

- Гекс-сітка: токен і підсвітка лягають точно в центр гекса для парних і непарних рядків.
- Істота 2×2 на квадратах займає 2×2 клітинки візуально; на гексах — якір + 6 сусідів (токен по центру якоря, діаметр ~3 гекси).
- Клік по токену союзника/ворога не «провалюється» в клік по клітинці під ним.
- Мобільна ширина (375 px): карта вміщається по ширині, pinch/drag не скролить сторінку.
- Мертвий учасник показаний сірим і не блокує рух (як у рушії).

---

### Task 1: Геометрія відмальовки й підсвітка (pure)

**Files:**
- Create: `lib/utils/battle/grid/layout.ts`, `lib/utils/battle/grid/map-view.ts`
- Modify: `lib/utils/battle/grid/index.ts` (експорт обох)
- Test: `lib/utils/battle/grid/__tests__/layout.test.ts`, `lib/utils/battle/grid/__tests__/map-view.test.ts`

**Interfaces:**
- Consumes: `cellKey`, `footprint`, `neighbors` (`./geometry`); `cellsOf`, `isOnMap`, `sizeOf` (`./occupancy`); `reachable`, `remainingMovement` (`./path`); `attackReachError` (`./attack-reach`)
- Produces:
  - `const UNIT = 100` — розмір клітинки в одиницях SVG
  - `mapSize(map: Pick<BattleMapConfig, "grid" | "cols" | "rows">): { width: number; height: number }`
  - `cellCenter(grid: GridShape, p: GridPoint): { x: number; y: number }`
  - `cellPolygon(grid: GridShape, p: GridPoint): string` — атрибут `points` для `<polygon>`
  - `tokenBox(grid: GridShape, p: BattleParticipant): { cx: number; cy: number; size: number } | null` — центр і діаметр токена в одиницях
  - `type CellMark = "move" | "target" | "invalid-target"`
  - `moveMarks(map, participants, mover): Map<string, number>` — досяжні клітинки з вартістю (обгортка над `reachable(map, participants, mover, remainingMovement(mover))`)
  - `targetMarks(map, participants, attacker, attack): Map<string, CellMark>` — для кожного живого учасника іншої сторони з позицією: ключі клітинок його footprint → `"target"`, якщо `attackReachError(map, participants, attacker, attack, [t]) === null`, інакше `"invalid-target"`

- [ ] **Step 1: Failing tests**

`layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cellCenter, cellPolygon, mapSize, tokenBox, UNIT } from "../layout";

import { GridShape } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

const sq = GridShape.SQUARE;

const hex = GridShape.HEX;

describe("квадрати", () => {
  it("розмір карти й центр клітинки", () => {
    expect(mapSize({ grid: sq, cols: 20, rows: 12 })).toEqual({ width: 20 * UNIT, height: 12 * UNIT });
    expect(cellCenter(sq, { x: 2, y: 1 })).toEqual({ x: 2.5 * UNIT, y: 1.5 * UNIT });
    expect(cellPolygon(sq, { x: 0, y: 0 }).split(" ")).toHaveLength(4);
  });

  it("токен 2×2 — центр на стику чотирьох клітинок, діаметр ~2 клітинки", () => {
    const p = createMockParticipant();

    const big = { ...p, combatStats: { ...p.combatStats, gridSize: 2 }, battleData: { ...p.battleData, position: { x: 3, y: 3 } } };

    const box = tokenBox(sq, big)!;

    expect(box.cx).toBe(4 * UNIT);
    expect(box.cy).toBe(4 * UNIT);
    expect(box.size).toBeGreaterThan(1.5 * UNIT);
  });

  it("учасник без позиції — без токена", () => {
    expect(tokenBox(sq, createMockParticipant())).toBeNull();
  });
});

describe("гекси (pointy-top, odd-r)", () => {
  it("непарний рядок зсунутий на пів ширини", () => {
    const even = cellCenter(hex, { x: 0, y: 0 });

    const odd = cellCenter(hex, { x: 0, y: 1 });

    expect(odd.x - even.x).toBeCloseTo((Math.sqrt(3) * UNIT) / 4, 5);
    expect(odd.y).toBeGreaterThan(even.y);
  });

  it("полігон має 6 вершин; карта вміщує зсунутий рядок", () => {
    expect(cellPolygon(hex, { x: 1, y: 1 }).split(" ")).toHaveLength(6);

    const { width } = mapSize({ grid: hex, cols: 4, rows: 2 });

    const last = cellCenter(hex, { x: 3, y: 1 });

    expect(width).toBeGreaterThanOrEqual(last.x + (Math.sqrt(3) * UNIT) / 4);
  });
});
```

Розміри гекса: радіус `R = UNIT / 2` (від центру до вершини), ширина `w = √3·R`, крок по вертикалі `1.5·R`, `cellCenter = { x: w·(x + 0.5·(y & 1)) + w/2, y: 1.5·R·y + R }`, `mapSize = { width: w·(cols + 0.5), height: 1.5·R·(rows − 1) + 2R }`. Перевір тести проти цих формул і за потреби виправ очікування в тесті (наприклад, різниця `odd.x − even.x` = `w/2` = `√3·UNIT/4`).

`map-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { moveMarks, targetMarks } from "../map-view";

import { AttackType, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] }, combatStats: { ...p.combatStats, speed: 10 }, battleData: { ...p.battleData, position } };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

describe("підсвітка карти", () => {
  it("рух — клітинки в межах залишку руху", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const marks = moveMarks(map, [hero], hero);

    expect(marks.get("2:2")).toBe(2);
    expect(marks.has("3:0")).toBe(false);
  });

  it("цілі — сусід доступний, далекий ворог ні, союзник не підсвічується", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const near = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const far = at("e2", { x: 5, y: 0 }, ParticipantSide.ENEMY);

    const ally = at("a", { x: 0, y: 1 }, ParticipantSide.ALLY);

    const marks = targetMarks(map, [hero, near, far, ally], hero, sword);

    expect(marks.get("1:0")).toBe("target");
    expect(marks.get("5:0")).toBe("invalid-target");
    expect(marks.has("0:1")).toBe(false);
  });
});
```

Run: `pnpm test:run lib/utils/battle/grid/__tests__/layout.test.ts lib/utils/battle/grid/__tests__/map-view.test.ts` — FAIL (модулів немає).

- [ ] **Step 2: Реалізація**

`layout.ts`:

```ts
import { footprint } from "./geometry";
import { sizeOf } from "./occupancy";

import { GridShape } from "@/lib/constants/battle";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const UNIT = 100;

const R = UNIT / 2;

const HEX_W = Math.sqrt(3) * R;

export function mapSize(map: Pick<BattleMapConfig, "grid" | "cols" | "rows">): { width: number; height: number } {
  if (map.grid === GridShape.HEX) return { width: HEX_W * (map.cols + 0.5), height: 1.5 * R * (map.rows - 1) + 2 * R };

  return { width: map.cols * UNIT, height: map.rows * UNIT };
}

export function cellCenter(grid: GridShape, p: GridPoint): { x: number; y: number } {
  if (grid === GridShape.HEX) return { x: HEX_W * (p.x + 0.5 * (p.y & 1)) + HEX_W / 2, y: 1.5 * R * p.y + R };

  return { x: (p.x + 0.5) * UNIT, y: (p.y + 0.5) * UNIT };
}

export function cellPolygon(grid: GridShape, p: GridPoint): string {
  const c = cellCenter(grid, p);

  const corners =
    grid === GridShape.HEX
      ? Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 180) * (60 * i - 30);

          return [c.x + R * Math.cos(a), c.y + R * Math.sin(a)];
        })
      : [[c.x - R, c.y - R], [c.x + R, c.y - R], [c.x + R, c.y + R], [c.x - R, c.y + R]];

  return corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function tokenBox(grid: GridShape, p: BattleParticipant): { cx: number; cy: number; size: number } | null {
  const anchor = p.battleData.position;

  if (!anchor) return null;

  const size = sizeOf(p);

  if (grid === GridShape.HEX) {
    const c = cellCenter(grid, anchor);

    return { cx: c.x, cy: c.y, size: (size > 1 ? 2.6 : 0.86) * R * 2 };
  }

  const cells = footprint(grid, anchor, size).map((cell) => cellCenter(grid, cell));

  const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;

  const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;

  return { cx, cy, size: size * UNIT * 0.86 };
}
```

`map-view.ts`:

```ts
import { attackReachError } from "./attack-reach";
import { cellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";
import { reachable, remainingMovement } from "./path";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type CellMark = "move" | "target" | "invalid-target";

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant): Map<string, number> {
  return reachable(map, participants, mover, remainingMovement(mover));
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = attackReachError(map, participants, attacker, attack, [t]) === null ? "target" : "invalid-target";

    for (const c of cellsOf(map.grid, t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
```

(Підлаштуй сигнатуру виклику `attackReachError` під фактичну після блоку 1 — у ній є додатковий параметр/опція для aoe/hitsAllEnemies; передай значення «не ігнорувати».)

Додай у `index.ts`: `export * from "./layout"; export * from "./map-view";`.

- [ ] **Step 3: Run — PASS**, потім `pnpm exec tsc --noEmit`, `pnpm lint`.

- [ ] **Step 4: Commit** — `feat(battle-map): render layout math and map highlights`

---

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

### Task 3: Сторінка-пісочниця `/dev/battle-map`

**Files:**
- Create: `app/dev/battle-map/page.tsx` (server: `notFound()` у production, інакше рендер клієнта)
- Create: `components/battle/map/dev/BattleMapPlayground.tsx` (`"use client"`)
- Create: `components/battle/map/dev/mock-participants.ts`
- Create: `lib/hooks/battle/useBattleMapPlayground.ts` (стан і логіка пісочниці; експорт у barrel)

**Interfaces:**
- Consumes: `BattleMap` (Task 2), `moveMarks`, `targetMarks`, `placeParticipants`, `attackReachError`, `cellKey`, `DEFAULT_BATTLE_MAP`, `createMockParticipant` **не можна** (тестова фікстура) — мок-учасників будуй вручну в `mock-participants.ts` як `BattleParticipant[]` з мінімальними полями (подивись `lib/utils/battle/__tests__/fixtures/mock-participant.ts` як довідку по обовʼязкових полях і скопіюй потрібну структуру).

**Мок-набір (8 учасників):** союзники — «Лицар» (melee, speed 30), «Лучниця» (ranged `80/320 фт`, speed 30), «Маг» (ranged `60 фт`, speed 30), «Грифон» (melee, speed 40, `gridSize: 2`); вороги — «Скелет-воїн» ×2 (melee, speed 30), «Скелет-лучник» (ranged `80/320 фт`), «Кістяний дракон» (melee, speed 40, `gridSize: 2`). Аватари — `unitIcon("<file>")` = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unit-icons/${file}.webp`; файли підбери з `ls assets/unit-icons` (люди/некроманти/нейтрали — наприклад `humans-*`, `necromancers-*`); якщо env немає — без аватара (ініціали). Різні HP, у одного скелета `currentHp` = 30 % від max, щоб було видно смугу.

**Хук `useBattleMapPlayground()`** повертає `{ map, setMap, participants, activeId, mode, view, actions, controls }`:
- `map` — стан `BattleMapConfig` (старт `DEFAULT_BATTLE_MAP`), учасники розставлені `placeParticipants(map, mock)` при старті й при зміні `cols/rows/grid` (позиції скидаються й розставляються заново).
- `activeId` — чий «хід» (перший союзник на старті); `mode: "move" | "attack"`.
- `view.marks`: у режимі `move` — `moveMarks(...)` для активного; у режимі `attack` — `targetMarks(...)` з першою атакою активного.
- `view.trajectory`: у режимі `attack` при наведенні на клітинку з `"target"` — лінія від активного до цієї клітинки.
- `actions.onCellClick(p)`: `move` — якщо клітинка є в marks, оновити `position` і `movementUsed += cost`; `attack` — якщо `"target"`, знайти ціль під клітинкою й зменшити її `currentHp` на 7 (при ≤ 0 → `status: "dead"`), записати рядок у локальний лог.
- `actions.onTokenClick(id)` — зробити учасника активним (як «вибрати, хто ходить»).
- `controls`: `nextTurn()` (наступний живий у списку, `movementUsed: 0`), `setMode`, `reset()` (початковий мок).

**Сторінка (`BattleMapPlayground`)**: обгортка `battle-hud min-h-screen` (клас із `components/battle/hud/battle-hud.css`; імпортуй CSS так само, як сцена бою — знайди `grep -rn "battle-hud.css" app components`), заголовок «Карта бою — пісочниця», ліворуч на desktop / зверху на mobile панель керування:
- форма сітки (кнопки «Квадрати» / «Гекси»), повзунок прозорості 0–1, поля колонок/рядків (4–40),
- режим «Рух» / «Атака», кнопка «Наступний хід», «Скинути»,
- картка активного учасника: імʼя, залишок руху (`remainingMovement`), атака (назва, тип, дальність),
- лог останніх 6 дій;
праворуч / знизу — `BattleMap` на всю ширину. На ширині < 1024 px — колонка; ≥ 1024 — `grid-cols-[300px_1fr]`. Використовуй наявні HUD-компоненти (`HudPanel`, `HudChipTabs` з `components/hud/page`), якщо вони підходять без підганяння; інакше прості tailwind-кнопки в стилі HUD.

- [ ] **Step 1:** Тест хука (`lib/hooks/battle/__tests__/useBattleMapPlayground.test.ts`, happy-dom, `renderHook` з `@testing-library/react`, якщо є): старт — усі мок-учасники мають позицію; `onCellClick` у режимі `move` на досяжну клітинку змінює позицію активного й `movementUsed`; на недосяжну — нічого; `nextTurn` скидає рух і змінює `activeId`; зміна `grid` на `hex` перерозставляє всіх без перекриттів.
- [ ] **Step 2: Run — FAIL**, реалізація, **Run — PASS**.
- [ ] **Step 3:** Сторінка й мок; `pnpm exec tsc --noEmit`, `pnpm lint`, повний `pnpm test:run`.
- [ ] **Step 4:** Ручна перевірка: `pnpm dev`, відкрити `http://localhost:3000/dev/battle-map` (потрібен вхід — сторінка під авторизацією, як решта застосунку): видно фон, сітку, 8 токенів; клік по клітинці рухає; «Атака» підсвічує цілі; «Гекси» перемальовує. Зафіксуй у звіті, що саме перевірив (або що dev-сервер не вдалося запустити).
- [ ] **Step 5: Commit** — `feat(battle-map): /dev/battle-map playground with mock participants`

---

## Зворотний звʼязок користувача (2026-10-18) → задачі 4–5

- «Гекси прибираємо» — лишається лише квадратна сітка.
- «HUD персонажів і юнітів взяти з поточної реалізації в колонках» — обрано варіант «картка на самому токені»: над кожним токеном компактна плашка в стилі `ParticipantRow` (імʼя, HP, смуга здоровʼя, іконки ефектів).

### Task 4: Прибрати гекси

**Files:** усі, що згадують `GridShape` / `grid` (знайти: `grep -rln "GridShape" lib app components types`), зокрема `lib/constants/battle.ts`, `types/battle.ts`, `lib/schemas/battles.ts`, `lib/utils/battle/grid/{geometry,occupancy,layout,path,placement,attack-reach,map-view}.ts`, їхні тести, `components/battle/map/**`, `lib/hooks/battle/useBattleMapPlayground.ts`, `app/api/__tests__/battles/move-mutation.test.ts`, `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`, `docs/superpowers/specs/2026-10-18-battle-map.md`.

- Видалити `GridShape` і поле `grid` з `BattleMapConfig`, `DEFAULT_BATTLE_MAP`, `battleMapSchema` (старі тіла з `grid` просто ігноруються Zod — схема не `strict`).
- Функції геометрії/відмальовки втрачають параметр `grid`: `neighbors(p)`, `cellDistance(a, b)`, `footprint(anchor, size)`, `footprintDistance(a, b)`, `cellsOf(p)`, `cellCenter(p)`, `cellPolygon(p)`, `tokenBox(p)`, `mapSize(map)`; гекс-гілки, `toCube`, `HEX_*` — видалити. Оновити всі виклики.
- Тести: видалити гекс-кейси; квадратні лишаються без змін за змістом.
- Пісочниця: прибрати перемикач «Квадрати/Гекси».
- Spec: розділ «Рішення» — лише квадратна сітка (Чебишев), прибрати згадки гексів.
- Перевірка: `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`; `grep -rn "hex\|Hex\|HEX\|GridShape" lib app components types` — порожньо (крім випадкових слів не про сітку).
- Commit: `refactor(battle-map): drop hex grid — square only`

### Task 5: Картка HUD над токеном

**Files:**
- Modify: `components/battle/map/MapToken.tsx`, `components/battle/map/BattleMap.tsx`
- Modify: `lib/hooks/battle/useBattleMapPlayground.ts`, `components/battle/map/dev/BattleMapPlayground.tsx`
- Test: `components/battle/map/__tests__/BattleMap.test.tsx`

**Interfaces:**
- `BattleMapView` отримує `hud?: Map<string, { exact: boolean; effects: ActiveEffect[] }>`; без запису для учасника — `exact: true`, ефекти — `[]`.

**Поведінка й верстка — як `components/battle/participants/ParticipantRow.tsx`, у компактному вигляді:**
- Над портретом токена (по центру, з відступом ~4 px) — плашка `rounded-md bg-black/70 px-1.5 py-1 backdrop-blur-[2px] border border-white/10`, ширина = більше з (ширина токена, ~2.2 клітинки в px), `pointer-events-none`.
- Рядок 1: імʼя (`hud-sc font-bold text-[var(--ink)] truncate`) + праворуч HP: при `exact` — `currentHp / maxHp` (червоний `#e04a35` при `hpRatio ≤ 0.25`, інакше `#d6cbb7`), інакше `HealthLabel`.
- Рядок 2: `HealthBar participant exact` (на всю ширину плашки).
- Рядок 3 (лише якщо є ефекти): `EffectLine effects` (іконки).
- Розміри шрифтів масштабуються від розміру клітинки в px (`clamp`, мін. 9 px імʼя / 8 px HP), щоб на 20×12 у десктопі читалось, а на телефоні не розвалювалось; якщо клітинка < 22 px — показувати лише смугу HP без тексту.
- Мертвий/непритомний (`isDown`) — `opacity-40`, імʼя `line-through`, як у рядку.
- Зміна HP: плаваюче число й спалах портрета, як у `ParticipantRow` (`useHpChange`, `useDamageShake`, класи `animate-[hud-float…]`, `animate-[hud-flash-red…]`/`green`).
- Прибрати поточну тонку `HealthBar` під портретом (її замінює плашка).
- Шар плашок вище за токени (`z-index`), щоб сусідні портрети не перекривали текст; плашка поточного/обраного учасника — найвище.
- Пісочниця: будує `hud` з `exact: true` для всіх і ефектами з `useDisplayEffectMap(participants)` (як сцена бою), щоб іконки ефектів відображались; додати двом мок-учасникам по 1–2 активні ефекти (наприклад, бафф і дебафф — подивися формат `ActiveEffect` у `types/battle.ts` і приклади в тестах), щоб рядок ефектів був видимий.
- Тести: плашка показує імʼя й «HP / max» для `exact`; при `exact: false` — немає чисел HP; є іконка ефекту, коли ефект передано.
- Перевірка: focused tests, `pnpm exec tsc --noEmit`, `pnpm lint`, повний `pnpm test:run`.
- Commit: `feat(battle-map): row-style HUD card above map tokens`
