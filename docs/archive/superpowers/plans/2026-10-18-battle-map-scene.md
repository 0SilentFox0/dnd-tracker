# Battle Map — блок 2b: карта в сцені бою — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** У бою з картою центральна колонка (desktop) і вкладка «Карта» (mobile) показують `BattleMap`; хто ходить — рухається кліком по клітинці (справжній `move`), атакує кліком по досяжному ворогу (відкривається майстер атаки з обраною ціллю); ДМ переставляє будь-кого; бої без карти не змінюються.

**Architecture:** Похідна логіка карти — чиста функція `deriveMapScene` (`lib/utils/battle/grid/map-scene.ts`) з тестами; хук `useBattleMapScene` (`lib/hooks/battle`) звʼязує її зі сценою (`useBattleScene`) і мутацією `move`. Звʼязок карти з майстром атаки (живе в `MyTurnControls`) — через «намір атаки» у значенні сцени: карта викликає `requestAttack(targetId)`, `MyTurnControls` споживає намір і відкриває майстер через новий `open(targetId)`. Компонент `BattleMapPanel` лише рендерить `BattleMap` з даними хука.

**Tech Stack:** React 19, TanStack Query, TypeScript strict, Vitest + happy-dom.

**Spec:** `docs/archive/superpowers/specs/2026-10-18-battle-map.md`

## Global Constraints

- Конвенції `CLAUDE.md`: компоненти не імпортують `@/lib/api/*`; логіка — у `lib/utils`/хуках; ≤ ~7 пропсів; `react-hooks/exhaustive-deps` — error; тексти українською.
- Бій без карти (`battle.map` відсутній/`null`) — UI рівно як зараз (колонки зі списками).
- Видимість: точні HP/числа на картці токена — лише якщо `canSeeExactStats(p, viewer)` (`lib/utils/battle/view/visibility.ts`); інакше `HealthLabel` (у `MapTokenHud` це вже підтримано через `view.hud[id].exact`).
- Резерв (`battleData.reserved`) і `pendingSummons` на карті не показуються.
- Карта вміщується у відведену область без прокрутки (сцена вже `below-header`, центральна колонка — `min-h-0`).
- Мутації — лише через `actions` сцени (`useBattleAction`): помилки йдуть у toast сцени (`onFailure`), 409 — refetch (`onConflict`).

## Review Focus

- Гравець не на своєму ході: клік по клітинці нічого не робить, зелених клітинок немає; клік по токену — просто вибір (деталі), як рядок у списку.
- Під час `anyPending` (запит у польоті) повторні кліки по клітинках ігноруються.
- ДМ: вибраний (не поточний) учасник + клік по вільній клітинці → `move` з `free: true`; поточний учасник ДМа — звичайний рух з бюджетом.
- Атака з карти по ворогу, якого правила не дозволяють (сірий): майстер не відкривається, показується причина (toast) з `attackReachError`.
- Mobile: вкладка «Карта» за замовчуванням, коли в бою є карта; нижня панель героя лишається, карта займає решту висоти.

---

### Task 1: Сцена — дія `move`, намір атаки, `open(targetId)` у майстрі

**Files:**
- Modify: `lib/hooks/battle/useBattleScene.ts` (`BattleSceneActions` L53-70 і побудова L237-254; `BattleSceneValue` L101-115)
- Modify: `lib/hooks/battle/useAttackWizard.ts` (`open` L179), `lib/utils/battle/flows/attack-flow.ts` (дія `OPEN`)
- Modify: `components/battle/turn/MyTurnControls.tsx`
- Test: `lib/utils/battle/flows/__tests__/attack-flow.test.ts` (доповнити), `lib/hooks/battle/__tests__/` (тест хука, якщо є шаблон тестів `useAttackWizard`; інакше — лише reducer)

**Interfaces:**
- `BattleSceneActions.move` = `useMoveParticipant(campaignId, battleId, o)` (з `@/lib/hooks/battles`), з тими ж `o` (`onConflict`, `onFailure`), що інші дії.
- `BattleSceneValue` + `attackIntent: string | null`, `requestAttack(targetId: string): void`, `clearAttackIntent(): void` (стан `useState` поряд із `selectedId`).
- `attackFlow` дія `OPEN` приймає необовʼязковий `targetIds?: string[]`: якщо передано — `targetIds` = перші `maxTargets` з них; крок лишається `"weapon"`, коли зброї > 1, інакше `"target"`.
- `useAttackWizard.open(targetId?: string)`: з `targetId` — `OPEN` з `targetIds: [targetId]`; якщо крок `"target"` — одразу `confirmTargets()` (до кидка), щоб гравець не вибирав ціль удруге.
- `MyTurnControls`: `useEffect` — коли `attackIntent` не `null` і фаза дозволяє дію (та сама умова, за якої видно `ActionGrid` у фазі acting), викликає `attack.open(attackIntent)` і `clearAttackIntent()`. Якщо дія вже використана (`hero.actionFlags.hasUsedAction` і немає `pendingExtraActions`) — лише `clearAttackIntent()`.

- [ ] **Step 1:** Тест reducer: `OPEN` з `targetIds: ["e1"]` і однією зброєю → `step: "target"`, `targetIds: ["e1"]`; з двома зброями → `step: "weapon"`, `targetIds` збережено й обрізається `SELECT_WEAPON` до `maxTargets`. Run — FAIL.
- [ ] **Step 2:** Реалізація reducer + `open(targetId?)` у хуку.
- [ ] **Step 3:** Сцена: `move` у `actions`, `attackIntent`/`requestAttack`/`clearAttackIntent`; `MyTurnControls` — ефект споживання наміру.
- [ ] **Step 4:** `pnpm test:run lib/utils/battle/flows lib/hooks/battle components/battle`, `pnpm exec tsc --noEmit`, `pnpm lint`.
- [ ] **Step 5: Commit** — `feat(battle-map): scene move action and attack intent; open attack wizard with a preselected target`

---

### Task 2: `deriveMapScene` і хук `useBattleMapScene`

**Files:**
- Create: `lib/utils/battle/grid/map-scene.ts` (+ експорт у `index.ts`)
- Create: `lib/hooks/battle/useBattleMapScene.ts` (+ barrel)
- Test: `lib/utils/battle/grid/__tests__/map-scene.test.ts`

**Interfaces:**

```ts
export interface MapSceneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[]; // initiativeOrder
  current: BattleParticipant | null;
  viewer: Viewer;                     // з lib/utils/battle/view
  canAct: boolean;                    // isMyTurn && !anyPending && current контролюється глядачем
  isDM: boolean;
  selectedId: string | null;
  hoverCell: GridPoint | null;
  effects: Map<string, ActiveEffect[]>;
}

export type MapClick =
  | { kind: "none" }
  | { kind: "move"; participantId: string; to: GridPoint; free: boolean }
  | { kind: "attack"; targetId: string }
  | { kind: "reject"; reason: string }
  | { kind: "select"; id: string };

export function deriveMapScene(input: MapSceneInput): {
  participants: BattleParticipant[];   // без резерву
  view: BattleMapView;                  // selectedId, currentId, marks, trajectory, hud
  cellClick(p: GridPoint): MapClick;
  tokenClick(id: string): MapClick;
};
```

Правила:
- `participants` — `initiativeOrder` без `battleData.reserved`.
- `hud` — для кожного: `{ exact: canSeeExactStats(p, viewer), effects: effects.get(id) ?? [] }`.
- `marks` (лише при `canAct` і `current` з позицією): `moveMarks(map, participants, current)` + поверх — `targetMarks(map, participants, current, current.battleData.attacks[0])`, якщо атака є і `!current.actionFlags.hasUsedAction || (current.battleData.pendingExtraActions ?? 0) > 0`.
- `trajectory`: якщо `hoverCell` — клітинка з позначкою `"target"` → `{ fromId: current.id, to: hoverCell }`.
- `cellClick(p)`:
  - ДМ і `selectedId` ≠ `current?.id` і вибраний — учасник на карті → `{ kind: "move", participantId: selectedId, to: p, free: true }`;
  - `canAct` і `marks` містить число для `cellKey(p)` → `{ kind: "move", participantId: current.id, to: p, free: false }`;
  - клітинка зайнята ворожим токеном з позначкою → як `tokenClick` цього ворога;
  - інакше `{ kind: "none" }`.
- `tokenClick(id)`:
  - `canAct`, ціль — ворог поточного з позначкою `"target"` → `{ kind: "attack", targetId: id }`;
  - `canAct`, ворог з `"invalid-target"` → `{ kind: "reject", reason: attackReachError(...) ?? "Ціль недосяжна" }`;
  - інакше `{ kind: "select", id }`.

Хук `useBattleMapScene()`:
- бере з `useBattleScene()`: `battle`, `current`, `viewer`, `isMyTurn`, `isDM`, `selectedId`, `select`, `effects`, `actions`, `anyPending`, `requestAttack`, `toast` (подивись, як сцена показує повідомлення — використай той самий механізм для `reject`);
- `hoverCell` — `useState`;
- `canAct = isMyTurn && !anyPending && !!current`;
- повертає `{ map, participants, view, actions: { onCellClick, onCellHover, onTokenClick } }` або `null`, якщо `battle.map` немає;
- обробник `MapClick`: `move` → `actions.move.mutate({ participantId, to, ...(free && { free: true }) })` (expectedVersion додає `useBattleAction`); `attack` → `requestAttack(targetId)`; `reject` → toast; `select` → `select(id)`.

- [ ] **Step 1:** Тести `deriveMapScene` для кожного правила вище (мок-учасники як у `map-view.test.ts`; `viewer` = `{ userId: "u1", isDM: false, canSeeEnemyHp: false }`): не свій хід → без marks і `cellClick` → none; свій хід → move-клітинка дає move; сусідній ворог → attack; далекий ворог мечем → reject з текстом; ДМ із вибраним не-поточним → free move; ворожий hud `exact: false`, союзний `true`; резерв відсутній у `participants`. Run — FAIL.
- [ ] **Step 2:** Реалізація; хук.
- [ ] **Step 3:** focused tests, tsc, lint.
- [ ] **Step 4: Commit** — `feat(battle-map): map scene derivation and hook`

---

### Task 3: Карта в розкладках сцени

**Files:**
- Create: `components/battle/map/BattleMapPanel.tsx` (`"use client"`; викликає `useBattleMapScene()`; `null` → нічого)
- Modify: `components/battle/scene/DesktopBattleLayout.tsx` (центральний `<main>` L51-54), `components/battle/scene/MobileBattleLayout.tsx` (вкладки L59-72)
- Test: `components/battle/scene/__tests__/` — якщо є тести розкладок, доповнити: з картою в desktop рендериться `[data-fx-clip]` і немає заголовків «Союзники/Вороги»; без карти — як було.

**Поведінка:**
- Desktop: якщо `battle.map` — `<main className="min-h-0 p-3"><BattleMapPanel /></main>` (карта вписується в увесь центр); інакше поточний код зі списками.
- Mobile: якщо `battle.map` — вкладки «Карта» / «Союзники» / «Вороги», за замовчуванням «Карта»; на «Карті» область `min-h-0 flex-1` без `overflow-y-auto` (карта вміщується сама); інші вкладки — як зараз.
- `BattleMapPanel`: `<BattleMap map participants view actions className="h-full" />` — переконайся, що `BattleMap` займає наданий прямокутник (він уже має обгортку з `ResizeObserver` і `fitMapBox`).
- Права колонка desktop лишається (деталі обраного / журнал): клік по токену → `select(id)` відкриває `ParticipantDetails`, як рядок.

- [ ] **Step 1:** Тест(и) розкладки (або, якщо тестів розкладок немає, тест `BattleMapPanel` з моком `useBattleMapScene`). Run — FAIL.
- [ ] **Step 2:** Реалізація.
- [ ] **Step 3:** focused tests, tsc, lint, повний `pnpm test:run`.
- [ ] **Step 4: Commit** — `feat(battle-map): battle scene shows the map in the centre column and a mobile tab`

---

### Task 4: Перевірка в браузері на локальній базі

**Files:** без змін коду (лише виправлення, якщо щось знайдеться).

- [ ] Локальна база `prodcopy` (`.env.local` → `localhost:54322/prodcopy`). Знайди або створи через UI бій у будь-якій кампанії, де користувач — ДМ; задай карту SQL-запитом **лише до локальної бази**: `update battle_scenes set map='{"cols":20,"rows":12,"background":null,"opacity":0.35}' where id='<id>';`
- [ ] Старт бою → учасники розставлені (союзники ліворуч, вороги праворуч через рядок).
- [ ] Поточний учасник: зелені клітинки, клік → токен переїжджає, залишок руху зменшується; не свій хід — кліки нічого не роблять.
- [ ] Ворог поруч → клік відкриває майстер атаки з ціллю, атака проходить; далекий ворог мечем → toast з причиною.
- [ ] ДМ: вибрати не-поточного учасника → клік по клітинці переставляє вільно.
- [ ] Бій без карти — колонки зі списками, як раніше.
- [ ] Звіт: що перевірено, скріншоти (шляхи), знайдені проблеми.
