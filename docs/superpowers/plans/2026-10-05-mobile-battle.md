# Мобільний бій (пункт 6) — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Бій передає дельти замість повного стану, клієнт патчить кеш і захищений від подвійного тапу, а екрани бою — новий HUD для телефону й десктопа з майстрами на редʼюсерах.

**Architecture:** Сервер (`runBattleMutation`) будує `ClientBattleDelta` з уже збережених змін і шле її у відповідь та в Pusher (`battle-delta`). Клієнт застосовує її чистою `applyBattleDelta` через один хук `useBattleAction`. Сторінка бою стає server component → `BattleSceneProvider` → `BattleScreen` (мобільна / десктопна розкладка). Майстри атаки, книги й ходу — `useReducer` над чистими переходами з `lib/utils/battle/flows`. Що бачить гравець — чисті функції `lib/utils/battle/view`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, TanStack Query 5, Pusher, Prisma 6, Vitest (+ happy-dom, Testing Library), Tailwind 4, vaul (через `ResponsiveDialog`), `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-10-05-mobile-battle-design.md`

## Global Constraints

- Шари: компоненти й сторінки не імпортують `@/lib/api/*`; запити — `lib/api/battles.ts`; завантаження/мутації/логіка — хуки `lib/hooks/battle*` (імпорт через барел `@/lib/hooks/battle`, `@/lib/hooks/battles`; усередині домену — відносні шляхи); чисті обчислення — `lib/utils/battle/**` з тестами в сусідніх `__tests__/`.
- Діалоги — лише `ResponsiveDialog`; підтвердження — `useConfirm`; кнопки форм — `ActionBar` там, де це форма; стани завантаження — `components/common/states`.
- Мінімум коментарів (лише «чому»), документація українською, ідентифікатори англійською.
- `padding-line-between-statements`, `simple-import-sort`, `react-hooks/exhaustive-deps` = error, `no-console` (лише info/warn/error) — `pnpm lint --fix` після кожної задачі.
- Слово «шкода», не «урон», у новому UI. Кнопка автокидка — «AI ROLL».
- Кольори сторін: союзник `#6f8fb0`, ворог `#9c2a1d`. Метали кіл: 0 залізо, I бронза, II срібло, III золото, IV міфрил, V платина.
- Поріг Pusher — `PUSHER_DELTA_LIMIT_BYTES = 9_500`.
- Egress: жодного GET бою на звичайну дію; список спелів — спільний ключ `useSpells`, `enabled` лише коли книга відкрита.
- Кожен коміт закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Тести: `pnpm test:run <file>`; UI-тести з `// @vitest-environment happy-dom` у першому рядку.

## Відхилення від spec (узгодити з користувачем до старту)

1. **Без посилення слотом (upcasting).** Сервер не приймає рівень слота, а правила «що дає вище коло» в моделі `Spell` немає. Книга показує кола-метали і кількість слотів, але заклинання витрачає слот свого кола (як зараз). Посилення — окреме рішення про правила.
2. **Без локального превʼю спела.** `processSpell` залежить від серверного завантаження спела і саммонів. Підсумок майстра показує введені кидки й суму кубиків («остаточну шкоду порахує сервер»), результат — з відповіді. Клієнтський `spellPreview` і `useSpellPreview` видаляються; `dryRun` у роуті лишається (його використовує `simulate-battle`).
3. **Попередження про іншу концентрацію не робимо.** Рушій не відстежує, яке заклинання з концентрацією зараз тримається; книга лише позначає «концентрація» на спелі.
4. **Тост — власний `BattleToast`.** `useNotify` у проєкті — модальне вікно, а не тост; для 409 і нейтральної моралі потрібен легкий неблокуючий тост на сторінці бою.

## Review Focus

- **Дельта при старті бою з 10+ учасниками** (`order` + усі `upserted`) більша за 9 500 байт → у Pusher має піти `refetch`, а відповідь DM — повна дельта; гравці роблять рівно один GET. Тест — Task 3.
- **Дві дельти прийшли в зворотному порядку** (Pusher v+2 раніше за відповідь v+1) → клієнт не має «відкотитися» до старішого стану: v+2 дає `refetch`, v+1 після refetch ігнорується. Тест — Task 2.
- **Rollback/reset/start** (`cancelledFrom`) → журнал у кеші обрізається, нові записи доклеюються, повторне застосування тієї ж дельти нічого не змінює. Тест — Task 2.
- **Подвійний тап «Атакувати»** → другий запит несе стару `expectedVersion` → 409 → тост і інвалідація, майстер не закривається з помилкою «невідомо». Тест — Task 4 і Task 17.
- **Гравець керує кількома учасниками / DM узяв керування** → `isMyTurn`, `myParticipants`, «хід через N» рахуються для поточного з моїх, а не для першого. Тест — Task 8 і Task 12.

---

## Карта файлів

**Створити**

| Шлях | Відповідальність |
|---|---|
| `lib/utils/battle/pipeline/client-delta.ts` | `buildClientDelta` — дельта для клієнта з результату мутації |
| `lib/utils/battle/client/apply-delta.ts` | `applyBattleDelta`, `acceptFullBattle` |
| `lib/utils/battle/view/health.ts` | `healthState` |
| `lib/utils/battle/view/knowledge.ts` | `knownArmorClass`, `observedTraits` |
| `lib/utils/battle/view/visibility.ts` | `visibleParticipant`, `canSeeExactHp` |
| `lib/utils/battle/view/queue.ts` | `turnQueue`, `turnsUntil` |
| `lib/utils/battle/view/hero.ts` | `spellTier`, `abilityCharges`, `effectiveArmorClass`, `bonusTargetSide`, `lastAction` |
| `lib/utils/battle/view/index.ts` | барел |
| `lib/utils/battle/flows/attack-flow.ts` | редʼюсер майстра атаки |
| `lib/utils/battle/flows/spell-flow.ts` | редʼюсер книги заклинань |
| `lib/utils/battle/flows/turn-flow.ts` | редʼюсер ходу гравця |
| `lib/utils/battle/flows/index.ts` | барел |
| `lib/hooks/battles/useBattleAction.ts` | спільна battle-мутація з `expectedVersion`, дельтою, 409 |
| `lib/hooks/common/useMediaQuery.ts` | `useMediaQuery(query)` |
| `lib/hooks/battle/useBattleScene.ts` | контекст сцени (`BattleSceneContext`, `useBattleScene`, `useBattleSceneValue`) |
| `lib/hooks/battle/useBattleToast.ts` | стан тосту бою |
| `lib/hooks/battle/useAttackWizard.ts` | `useReducer(attackFlow)` + мутація |
| `lib/hooks/battle/useSpellBook.ts` | `useReducer(spellFlow)` + `useSpells` + мутація |
| `lib/hooks/battle/usePlayerTurn.ts` | `useReducer(turnFlow)` + відлік + мораль |
| `components/battle/hud/theme.ts` | токени кольорів і металів |
| `components/battle/hud/fonts.ts` | `next/font` для бою |
| `components/battle/hud/battle-hud.css` | keyframes і CSS-змінні бою |
| `components/battle/hud/Portrait.tsx`, `EffectChip.tsx`, `HealthBar.tsx`, `SlotGrid.tsx`, `index.ts` | примітиви HUD |
| `components/battle/scene/BattleSceneProvider.tsx` | провайдер |
| `components/battle/scene/BattleScreen.tsx` | вибір розкладки |
| `components/battle/scene/MobileBattleLayout.tsx`, `DesktopBattleLayout.tsx` | розкладки |
| `components/battle/scene/InitiativeTrack.tsx`, `LastActionTicker.tsx`, `ParticipantRow.tsx`, `ParticipantDetails.tsx`, `BattleLog.tsx` | поле бою |
| `components/battle/scene/MyHeroPanel.tsx`, `ActionGrid.tsx`, `TurnCountdown.tsx`, `ConnectionBanner.tsx`, `BattleToast.tsx`, `BattleTopBar.tsx` | мій герой і шапка |
| `components/battle/wizards/DiceInput.tsx`, `AttackWizard.tsx`, `SpellBook.tsx`, `BonusActionPicker.tsx` | майстри |
| `components/battle/fx/ResultOverlay.tsx`, `DamageFx.tsx` | результати й анімації |
| `app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx` | клієнтська частина сторінки |

**Змінити:** `types/api.ts`, `types/battle.ts`, `lib/utils/battle/pipeline/run-battle-mutation.ts`, `lib/utils/battle/pipeline/legacy-battle.ts`, `lib/api/battles.ts`, `lib/api/battles-types.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battles/index.ts`, `lib/hooks/battle/usePusherBattleSync.ts`, `lib/hooks/battle/index.ts`, `lib/hooks/common/useIsMobile.ts`, `lib/hooks/common/index.ts`, `lib/utils/abilities/engine/collect-modifiers.ts`, `lib/utils/abilities/engine/timed-effects.ts`, `lib/utils/abilities/registry/effects/{static,state,hp}.ts`, `lib/utils/battle/resistance/index.ts`, `lib/utils/battle/damage/impl.ts`, `lib/utils/battle/damage/breakdown.ts`, `lib/utils/battle/types/damage-*.ts`, `lib/utils/battle/attack/process/{compute,actions}.ts`, `lib/utils/battle/spell/{process,process-effects}.ts`, `scripts/simulate-battle.ts`, `app/campaigns/[id]/battles/[battleId]/page.tsx`, `components/battle/panels/DmQuickActionsPanel.tsx`, `docs/ARCHITECTURE.md`, `CLAUDE.md`.

**Видалити (Task 22):** див. spec §3.3 + `app/api/.../damage-breakdown/`, `useBattles-cache.ts`.

## Фаза A — дельти

### Task 1: Тип `ClientBattleDelta` і серверний `buildClientDelta`

**Files:**
- Modify: `types/api.ts` (після `BattleScene`)
- Create: `lib/utils/battle/pipeline/client-delta.ts`
- Test: `lib/utils/battle/pipeline/__tests__/client-delta.test.ts`

**Interfaces:**
- Produces: `ClientBattleDelta`, `BattleRefetchSignal`, `BattleMutationResponse<R>` (у `@/types/api`); `buildClientDelta(args): ClientBattleDelta`.

- [ ] **Step 1: Додати типи в `types/api.ts`**

```ts
export interface ClientBattleDelta {
  battleId: string;
  version: number;
  scene: {
    status: BattleScene["status"];
    round: number;
    turnIndex: number;
    pendingMoraleCheck: unknown;
    startedAt?: string;
    completedAt?: string;
  };
  upserted: BattleParticipant[];
  removed: string[];
  order?: string[];
  pending?: BattleParticipant[];
  setup?: BattlePreparationParticipant[];
  log: BattleAction[];
  cancelledFrom?: number;
}

export interface BattleRefetchSignal {
  battleId: string;
  version: number;
  refetch: true;
}

export interface BattleMutationResponse<R = Record<string, unknown>> {
  delta: ClientBattleDelta;
  response?: R;
}
```

(`BattleParticipant`, `BattleAction`, `BattlePreparationParticipant` уже імпортуються у `types/api.ts` — перевірити й додати до імпорту з `./battle`, якщо бракує.)

- [ ] **Step 2: Написати тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildClientDelta } from "@/lib/utils/battle/pipeline/client-delta";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, hp = 10, side = ParticipantSide.ALLY): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id, side }, combatStats: { ...base.combatStats, currentHp: hp } };
};

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 2, turnIndex: 1, version: 7,
  eventSeq: 10, pendingMoraleCheck: null, startedAt: new Date("2026-01-01"), completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date() };

describe("buildClientDelta", () => {
  it("лише змінені учасники, без order, коли порядок той самий", () => {
    const a = p("a"), b = p("b"), b2 = p("b", 4);

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b], pending: [] },
      after: { ...scene, version: 8, turnIndex: 0 },
      participants: [a, b2],
      pending: [],
      upsertedIds: ["b"],
      log: [],
    });

    expect(d.version).toBe(8);
    expect(d.upserted).toEqual([b2]);
    expect(d.upserted[0]).toBe(b2);
    expect(d.removed).toEqual([]);
    expect(d.order).toBeUndefined();
    expect(d.pending).toBeUndefined();
    expect(d.scene).toMatchObject({ status: "active", round: 2, turnIndex: 0, startedAt: "2026-01-01T00:00:00.000Z" });
  });

  it("видалення і зміна порядку → removed + order", () => {
    const a = p("a"), b = p("b"), c = p("c");

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b, c], pending: [] },
      after: { ...scene, version: 8 },
      participants: [c, a],
      pending: [],
      upsertedIds: [],
      log: [],
    });

    expect(d.removed).toEqual(["b"]);
    expect(d.order).toEqual(["c", "a"]);
  });

  it("саммон у pending → повний список pending; переведення з pending в бій → order", () => {
    const a = p("a"), s = p("s", 5, ParticipantSide.ALLY);

    const toPending = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [s],
      upsertedIds: ["s"],
      log: [],
    });

    expect(toPending.pending).toEqual([s]);
    expect(toPending.upserted).toEqual([]);

    const promoted = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [s] },
      after: { ...scene, version: 9 },
      participants: [a, s],
      pending: [],
      upsertedIds: ["s"],
      log: [],
    });

    expect(promoted.pending).toEqual([]);
    expect(promoted.upserted).toEqual([s]);
    expect(promoted.order).toEqual(["a", "s"]);
    expect(promoted.removed).toEqual([]);
  });

  it("prepared → setup; журнал і cancelledFrom передаються як є", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }];

    const d = buildClientDelta({
      before: { scene, meta: { ...meta, setup }, participants: [p("a")], pending: [] },
      after: { ...scene, status: "prepared", version: 8, round: 1, turnIndex: 0 },
      participants: [],
      pending: [],
      upsertedIds: [],
      log: [],
      cancelledFrom: 0,
    });

    expect(d.setup).toEqual(setup);
    expect(d.cancelledFrom).toBe(0);
    expect(d.removed).toEqual(["a"]);
    expect(d.order).toEqual([]);
  });
});
```

- [ ] **Step 3: Запустити — має впасти**

Run: `pnpm test:run lib/utils/battle/pipeline/__tests__/client-delta.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/battle/pipeline/client-delta'`.

- [ ] **Step 4: Реалізація `lib/utils/battle/pipeline/client-delta.ts`**

```ts
import type { BattleMeta, BattleSceneState } from "@/lib/utils/battle/store";
import type { ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant, BattlePreparationParticipant } from "@/types/battle";

const ids = (list: BattleParticipant[]) => list.map((p) => p.basicInfo.id);

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function buildClientDelta(args: {
  before: { scene: BattleSceneState; meta: BattleMeta; participants: BattleParticipant[]; pending: BattleParticipant[] };
  after: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  upsertedIds: string[];
  log: BattleAction[];
  cancelledFrom?: number;
}): ClientBattleDelta {
  const { before, after, participants, pending, log, cancelledFrom } = args;

  const changed = new Set(args.upsertedIds);

  const afterIds = new Set([...ids(participants), ...ids(pending)]);

  const beforeOrder = ids(before.participants);

  const afterOrder = ids(participants);

  const beforePending = ids(before.pending);

  const pendingChanged = !sameIds(beforePending, ids(pending)) || pending.some((p) => changed.has(p.basicInfo.id));

  return {
    battleId: after.id,
    version: after.version,
    scene: {
      status: after.status,
      round: after.round,
      turnIndex: after.turnIndex,
      pendingMoraleCheck: after.pendingMoraleCheck,
      ...(after.startedAt && { startedAt: after.startedAt.toISOString() }),
      ...(after.completedAt && { completedAt: after.completedAt.toISOString() }),
    },
    upserted: participants.filter((p) => changed.has(p.basicInfo.id)),
    removed: [...beforeOrder, ...beforePending].filter((id) => !afterIds.has(id)),
    ...(!sameIds(beforeOrder, afterOrder) && { order: afterOrder }),
    ...(pendingChanged && { pending }),
    ...(after.status === "prepared" && { setup: before.meta.setup as BattlePreparationParticipant[] }),
    log,
    ...(cancelledFrom !== undefined && { cancelledFrom }),
  };
}
```

(Якщо `BattleMeta.setup` уже типізовано як `BattlePreparationParticipant[]`, прибрати `as`.)

- [ ] **Step 5: Тест зелений**

Run: `pnpm test:run lib/utils/battle/pipeline/__tests__/client-delta.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix types/api.ts lib/utils/battle/pipeline
git add types/api.ts lib/utils/battle/pipeline/client-delta.ts lib/utils/battle/pipeline/__tests__/client-delta.test.ts
git commit -m "feat(battle): ClientBattleDelta builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Клієнтська `applyBattleDelta`

**Files:**
- Create: `lib/utils/battle/client/apply-delta.ts`
- Test: `lib/utils/battle/client/__tests__/apply-delta.test.ts`

**Interfaces:**
- Consumes: `ClientBattleDelta` (Task 1).
- Produces: `applyBattleDelta(cached: BattleScene, delta: ClientBattleDelta): BattleScene | "refetch"`; `acceptFullBattle(cached: BattleScene | undefined, incoming: BattleScene): BattleScene`.

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { acceptFullBattle, applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const p = (id: string, hp = 10): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id }, combatStats: { ...base.combatStats, currentHp: hp } };
};

const entry = (actionIndex: number): BattleAction => ({ actionIndex, resultText: `#${actionIndex}` }) as BattleAction;

const a = p("a"), b = p("b");

const cached: BattleScene = {
  id: "b1", campaignId: "c1", name: "Бій", status: "active", participants: [], currentRound: 1, currentTurnIndex: 0,
  initiativeOrder: [a, b], pendingSummons: [], battleLog: [entry(1), entry(2)], createdAt: "x", version: 5,
  isDM: true, userRole: "dm", campaign: { id: "c1", friendlyFire: false },
};

const delta = (over: Partial<ClientBattleDelta> = {}): ClientBattleDelta => ({
  battleId: "b1", version: 6,
  scene: { status: "active", round: 1, turnIndex: 1, pendingMoraleCheck: null },
  upserted: [], removed: [], log: [], ...over,
});

describe("applyBattleDelta", () => {
  it("стара або та сама версія — кеш без змін (те саме посилання)", () => {
    expect(applyBattleDelta(cached, delta({ version: 5 }))).toBe(cached);
    expect(applyBattleDelta(cached, delta({ version: 3 }))).toBe(cached);
  });

  it("пропуск версії — refetch", () => {
    expect(applyBattleDelta(cached, delta({ version: 7 }))).toBe("refetch");
    expect(applyBattleDelta({ ...cached, version: undefined }, delta())).toBe("refetch");
  });

  it("послідовна — патч учасника, решта зберігає посилання, мета-поля кешу лишаються", () => {
    const b2 = p("b", 3);

    const next = applyBattleDelta(cached, delta({ upserted: [b2], log: [entry(3)] })) as BattleScene;

    expect(next.version).toBe(6);
    expect(next.currentTurnIndex).toBe(1);
    expect(next.initiativeOrder[0]).toBe(a);
    expect(next.initiativeOrder[1]).toBe(b2);
    expect(next.battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3]);
    expect(next).toMatchObject({ isDM: true, userRole: "dm", campaign: { id: "c1", friendlyFire: false } });
  });

  it("order + removed + pending", () => {
    const s = p("s");

    const next = applyBattleDelta(cached, delta({ removed: ["a"], order: ["b", "s"], upserted: [s], pending: [] })) as BattleScene;

    expect(next.initiativeOrder.map((x) => x.basicInfo.id)).toEqual(["b", "s"]);
    expect(next.pendingSummons).toEqual([]);
  });

  it("cancelledFrom обрізає журнал; повторне застосування тієї ж дельти — без змін", () => {
    const d = delta({ cancelledFrom: 2, log: [entry(2)] });

    const next = applyBattleDelta(cached, d) as BattleScene;

    expect(next.battleLog.map((e) => e.resultText)).toEqual(["#1", "#2"]);
    expect(applyBattleDelta(next, d)).toBe(next);
  });

  it("reset у prepared: setup і порожні учасники", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: "enemy" as const }];

    const next = applyBattleDelta(cached, delta({
      scene: { status: "prepared", round: 1, turnIndex: 0, pendingMoraleCheck: null },
      removed: ["a", "b"], order: [], setup, cancelledFrom: 0,
    })) as BattleScene;

    expect(next.status).toBe("prepared");
    expect(next.initiativeOrder).toEqual([]);
    expect(next.participants).toEqual(setup);
    expect(next.battleLog).toEqual([]);
  });

  it("зворотний порядок: v7 раніше за v6 → refetch, потім v6 після refetch(v7) ігнорується", () => {
    expect(applyBattleDelta(cached, delta({ version: 7 }))).toBe("refetch");

    const refetched = { ...cached, version: 7 };

    expect(applyBattleDelta(refetched, delta({ version: 6 }))).toBe(refetched);
  });
});

describe("acceptFullBattle", () => {
  it("зберігає isDM/userRole/campaign, якщо у відповіді їх немає; ігнорує старішу версію", () => {
    const incoming = { ...cached, version: 9, isDM: undefined, userRole: undefined, campaign: undefined };

    expect(acceptFullBattle(cached, incoming)).toMatchObject({ version: 9, isDM: true, userRole: "dm" });
    expect(acceptFullBattle(cached, { ...cached, version: 4 })).toBe(cached);
  });
});
```

- [ ] **Step 2: Запустити — падає (модуля немає)**

Run: `pnpm test:run lib/utils/battle/client/__tests__/apply-delta.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реалізація `lib/utils/battle/client/apply-delta.ts`**

```ts
import type { BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

function mergeLog(previous: BattleAction[], incoming: BattleAction[], cancelledFrom?: number): BattleAction[] {
  const incomingIds = new Set(incoming.map((e) => e.actionIndex));

  const kept = previous.filter(
    (e) => !incomingIds.has(e.actionIndex) && (cancelledFrom === undefined || e.actionIndex < cancelledFrom),
  );

  return [...kept, ...incoming];
}

export function applyBattleDelta(cached: BattleScene, delta: ClientBattleDelta): BattleScene | "refetch" {
  if (cached.version !== undefined && delta.version <= cached.version) return cached;

  if (cached.version === undefined || delta.version !== cached.version + 1) return "refetch";

  const byId = new Map<string, BattleParticipant>(cached.initiativeOrder.map((p) => [p.basicInfo.id, p]));

  for (const p of delta.upserted) byId.set(p.basicInfo.id, p);

  for (const id of delta.removed) byId.delete(id);

  const order = delta.order ?? cached.initiativeOrder.map((p) => p.basicInfo.id).filter((id) => byId.has(id));

  const initiativeOrder = order.map((id) => byId.get(id)).filter((p): p is BattleParticipant => p !== undefined);

  const { scene } = delta;

  return {
    ...cached,
    version: delta.version,
    status: scene.status,
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    pendingMoraleCheck: scene.pendingMoraleCheck,
    startedAt: scene.startedAt ?? cached.startedAt,
    completedAt: scene.completedAt ?? cached.completedAt,
    initiativeOrder,
    pendingSummons: delta.pending ?? cached.pendingSummons,
    participants: delta.setup ?? (scene.status === "prepared" ? cached.participants : []),
    battleLog: mergeLog(cached.battleLog ?? [], delta.log, delta.cancelledFrom),
    battleLogMode: undefined,
    battleLogCancelledFrom: undefined,
  };
}

export function acceptFullBattle(cached: BattleScene | undefined, incoming: BattleScene): BattleScene {
  if (cached?.version !== undefined && incoming.version !== undefined && incoming.version < cached.version) return cached;

  return {
    ...incoming,
    isDM: incoming.isDM ?? cached?.isDM,
    userRole: incoming.userRole ?? cached?.userRole,
    campaign: incoming.campaign ?? cached?.campaign,
  };
}
```

- [ ] **Step 4: Тест зелений**

Run: `pnpm test:run lib/utils/battle/client/__tests__/apply-delta.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/client
git add lib/utils/battle/client
git commit -m "feat(battle): applyBattleDelta for the client cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Пайплайн шле дельти; `simulate-battle` їх застосовує

**Files:**
- Modify: `lib/utils/battle/pipeline/run-battle-mutation.ts:236-270` (гілка після `saveBattle`)
- Modify: `lib/utils/battle/pipeline/legacy-battle.ts` (`buildPusherMessages`)
- Modify: `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`, `lib/utils/battle/pipeline/__tests__/legacy-battle.test.ts`
- Modify: `scripts/simulate-battle.ts:146-175` (`call`)

**Interfaces:**
- Consumes: `buildClientDelta` (Task 1), `applyBattleDelta` (Task 2).
- Produces: усі мутаційні роути відповідають `BattleMutationResponse` (`{ delta, response? }`); Pusher — подія `battle-delta` з `ClientBattleDelta` або `BattleRefetchSignal`; `battle-completed` — `{ battleId, version }`; `turn-started` без змін. `dryRun`/`GET` — без змін.

- [ ] **Step 1: Переписати тести пайплайна (мають впасти)**

У `run-battle-mutation.test.ts` замінити тести «успіх — 200…», «великий стан…», «ліміт payload…» на:

```ts
  it("успіх — 200, { delta, response } для того, хто діяв, і battle-delta для інших", async () => {
    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: [goblin] })) });

    const mutate = vi.fn((ctx: BattleMutationContext) => ({
      participants: ctx.participants, pending: ctx.pending, events: [], response: { moraleResult: { ok: true } },
    }));

    const res = await runBattleMutation(req(), { params, access: "member", mutate }, d);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.delta).toMatchObject({ battleId: "b1", version: 4, removed: [] });
    expect(json.delta.upserted.map((p: { basicInfo: { id: string } }) => p.basicInfo.id)).toEqual(["gob"]);
    expect(json.response).toEqual({ moraleResult: { ok: true } });

    const messages = vi.mocked(d.publish).mock.calls[0][0];

    expect(messages[0]).toMatchObject({ event: "battle-delta", channel: "private-battle-b1" });
    expect(messages[0].payload).toEqual(json.delta);
  });

  it("велика дельта — battle-delta з refetch, відповідь усе одно повна", async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      createMockParticipant({ basicInfo: { ...hero.basicInfo, id: `h${i}` } }),
    );

    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: many })) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: () => ({ participants: many, pending: [], events: [] }) }, d);

    expect((await res.json()).delta.upserted).toHaveLength(60);
    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });

  it("ліміт — у байтах: довгий кириличний запис журналу дає refetch", async () => {
    const text = "Ш".repeat(6_000);

    const cyr = { ...delta(), events: [{ seq: 5, type: "attack", round: 1, actorId: null, targets: [], details: {}, hpChanges: [], resultText: text }] };

    const d = deps({ saveBattle: vi.fn(async () => cyr) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });

  it("бій із 10 учасниками, атака по одній цілі — дельта вміщується в Pusher", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => createMockParticipant({ basicInfo: { ...hero.basicInfo, id: `p${i}` } }));

    const d = deps({
      loadBattle: vi.fn(async () => loaded({ participants: ten })),
      saveBattle: vi.fn(async () => ({ ...delta(), upserted: [ten[3]] })),
    });

    await runBattleMutation(req(), { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: [], events: [] }) }, d);

    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toHaveProperty("upserted");
  });
```

Інші тести файлу, що читають `json.initiativeOrder` з мутаційної відповіді, перевести на `json.delta` (dryRun-тести не чіпати). У `legacy-battle.test.ts` блок `describe("buildPusherMessages")` замінити на:

```ts
describe("buildPusherMessages", () => {
  const payload = { battleId: "b1", version: 4, scene: { status: "active" as const, round: 1, turnIndex: 0, pendingMoraleCheck: null }, upserted: [], removed: [], log: [] };

  it("зміна ходу на гравця — battle-delta + turn-started у його канал", () => {
    const messages = buildPusherMessages({ before: { ...scene, turnIndex: 1 }, after: scene, participants: [hero, goblin], delta: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-delta", "turn-started"]);
    expect(messages[1]).toMatchObject({ channel: "private-user-u-player", payload: { battleId: "b1", participantId: "hero" } });
  });

  it("хід переходить до DM-учасника — без turn-started", () => {
    expect(buildPusherMessages({ before: scene, after: { ...scene, turnIndex: 1 }, participants: [hero, goblin], delta: payload }).map((m) => m.event)).toEqual(["battle-delta"]);
  });

  it("завершення бою — battle-completed; battle-started більше немає", () => {
    expect(buildPusherMessages({ before: { ...scene, status: "prepared" }, after: scene, participants: [hero], delta: payload }).map((m) => m.event)).toEqual(["battle-delta", "turn-started"]);
    expect(buildPusherMessages({ before: scene, after: { ...scene, status: "completed" }, participants: [hero], delta: payload }).map((m) => m.event)).toContain("battle-completed");
  });

  it("велика дельта — refetch", () => {
    const big = { ...payload, upserted: Array.from({ length: 60 }, () => hero) };

    expect(buildPusherMessages({ before: scene, after: scene, participants: [hero], delta: big })[0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });
});
```

- [ ] **Step 2: Запустити — падають**

Run: `pnpm test:run lib/utils/battle/pipeline`
Expected: FAIL (відповідь ще легасі, подія `battle-updated`).

- [ ] **Step 3: `buildPusherMessages` у `legacy-battle.ts`**

Замінити функцію:

```ts
export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  delta: ClientBattleDelta;
}): PusherMessage[] {
  const { before, after, participants, delta } = args;

  const channel = battleChannelName(after.id);

  const fits = Buffer.byteLength(JSON.stringify(delta), "utf8") <= PUSHER_DELTA_LIMIT_BYTES;

  const payload: ClientBattleDelta | BattleRefetchSignal = fits ? delta : { battleId: after.id, version: after.version, refetch: true };

  const messages: PusherMessage[] = [{ channel, event: "battle-delta", payload }];

  if (after.status === "completed" && before.status !== "completed") {
    messages.push({ channel, event: "battle-completed", payload: { battleId: after.id, version: after.version } });
  }

  const turnMoved = before.round !== after.round || before.turnIndex !== after.turnIndex || before.status !== after.status;

  const active = participants[after.turnIndex];

  if (after.status === "active" && turnMoved && active && active.basicInfo.controlledBy !== "dm") {
    messages.push({
      channel: userChannelName(active.basicInfo.controlledBy),
      event: "turn-started",
      payload: { battleId: after.id, participantId: active.basicInfo.id, participantName: active.basicInfo.name },
    });
  }

  return messages;
}
```

Імпорти: `import type { BattleRefetchSignal, ClientBattleDelta } from "@/types/api";` (прибрати `BattleScene`, якщо більше не потрібен у файлі — `toLegacyBattle` лишається для dryRun і далі його використовує).

- [ ] **Step 4: Гілка збереження в `runBattleMutation`**

Замінити блок від `const shared = toLegacyBattle(...)` до кінця `return respondWith(...)` (після обчислення `entries` і `cancelledFrom`) на:

```ts
    const clientDelta = buildClientDelta({
      before: loaded,
      after,
      participants: result.participants,
      pending: result.pending,
      upsertedIds: delta.upserted.map((p) => p.basicInfo.id),
      log: entries,
      cancelledFrom,
    });

    deps.publish(buildPusherMessages({ before: loaded.scene, after, participants: result.participants, delta: clientDelta }));

    return NextResponse.json({ delta: clientDelta, ...(result.response && { response: result.response }) });
```

Додати імпорт `import { buildClientDelta } from "./client-delta";`. `respondWith` і `respond` лишаються лише для гілки `dryRun`.

- [ ] **Step 5: Тести пайплайна зелені**

Run: `pnpm test:run lib/utils/battle/pipeline`
Expected: PASS.

- [ ] **Step 6: `scripts/simulate-battle.ts` застосовує дельти**

Додати імпорти `import { applyBattleDelta } from "../lib/utils/battle/client/apply-delta";` і `import type { BattleMutationResponse } from "../types/api";`. Додати функцію читання стану й переписати успішну гілку `call`:

```ts
async function readState(): Promise<BattleScene> {
  const res = await runBattleMutation(
    new Request("http://localhost/battle"),
    {
      params: { id: ctx.campaignId, battleId: ctx.battleId },
      access: "member",
      dryRun: () => true,
      includeRecentEvents: 100,
      mutate: (c) => ({ participants: c.participants, pending: c.pending, events: [] }),
    },
    deps,
  );

  return (await res.json()) as BattleScene;
}
```

```ts
  if (res.status === 200) {
    const dry = !("delta" in json);

    const fresh = dry ? (json.battle ?? json) as BattleScene : null;

    const { delta } = json as unknown as BattleMutationResponse;

    const applied = dry ? fresh : state ? applyBattleDelta(state, delta) : "refetch";

    state = applied === "refetch" || applied === null ? await readState() : applied;

    for (const e of (dry ? fresh?.battleLog ?? [] : delta.log) as BattleAction[]) {
      if (!log.some((l) => l.actionIndex === e.actionIndex)) log.push(e);

      console.info(`   📜 [р${e.round}] ${e.resultText}`);
    }
  }
```

На початку `main()` перед `await call("start", START)` додати `state = await readState();` (щоб дельта старту мала базову версію). Перевірки сценарію, що читають `body.moraleResult` / `body.battle`, перевести на `body.response?.moraleResult` (знайти: `grep -n "body\." scripts/simulate-battle.ts`).

- [ ] **Step 7: Симуляція на локальній БД**

Перевірити `.env.local`: `grep -E "^(DATABASE_URL|DIRECT_URL)" .env.local` — обидва `localhost:54322`. Якщо Docker не запущений: `open -a Docker`, дочекатися, `pnpm db:local`.
Run: `pnpm simulate-battle`
Expected: `✅ Перевірок: 34, провалено: 0`.

- [ ] **Step 8: Commit**

```bash
pnpm lint --fix lib/utils/battle/pipeline scripts/simulate-battle.ts
git add lib/utils/battle/pipeline scripts/simulate-battle.ts
git commit -m "feat(battle): mutations respond with deltas, Pusher sends battle-delta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `useBattleAction`, API на дельтах, Pusher-синхронізація

**Files:**
- Modify: `lib/api/battles.ts` (усі мутації бою), `lib/api/battles-types.ts` (прибрати `DamageBreakdown*` у Task 22, тут не чіпати)
- Create: `lib/hooks/battles/useBattleAction.ts`
- Modify: `lib/hooks/battles/useBattles.ts`, `lib/hooks/battles/index.ts`
- Delete: `lib/hooks/battles/useBattles-cache.ts` (константу `BATTLE_ACTIVE_REFETCH_INTERVAL_MS` перенести в `useBattles.ts`)
- Modify: `lib/hooks/battle/usePusherBattleSync.ts`, `lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx`
- Test: `lib/hooks/battles/__tests__/useBattleAction.test.tsx`

**Interfaces:**
- Consumes: `applyBattleDelta`, `acceptFullBattle` (Task 2), `BattleMutationResponse` (Task 1).
- Produces:
  - `lib/api/battles.ts`: `type WithVersion<T> = T & { expectedVersion?: number }`; `nextTurn(c, b, body: WithVersion<object>)`, `attack(c, b, data: WithVersion<AttackData & { endTurn?: boolean }>)`, `bonusAction`, `moraleCheck`, `castSpell`, `startBattle`, `resetBattle`, `completeBattle`, `rollbackBattleAction`, `addBattleParticipant`, `updateBattleParticipant` — усі повертають `Promise<BattleMutationResponse<R>>`. `attackAndNextTurn`, `spellPreview`, `getDamageBreakdown` — видалити наприкінці (Task 22), тут лише перестати використовувати.
  - `useBattleAction<TVars, TResp>(campaignId, battleId, fn, options?)` → `UseMutationResult<TResp | undefined, unknown, TVars>`; `options: { invalidate?: ("battles" | "active-battles")[]; onConflict?: () => void }`.
  - `useBattles.ts` хуки: `useNextTurn`, `useAttack`, `useMoraleCheck`, `useBonusAction`, `useCastSpell`, `useStartBattle`, `useResetBattle`, `useCompleteBattle`, `useRollbackBattleAction`, `useAddBattleParticipant`, `useUpdateBattleParticipant` — кожен приймає `(campaignId, battleId, options?: { onConflict?: () => void })`.

- [ ] **Step 1: Тест `useBattleAction` (падає)**

`lib/hooks/battles/__tests__/useBattleAction.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleAction } from "../useBattleAction";

import { ApiError } from "@/lib/api/client";
import type { BattleScene, ClientBattleDelta } from "@/types/api";

const key = ["battle", "c1", "b1"];

const base = { id: "b1", status: "active", initiativeOrder: [], battleLog: [], participants: [], currentRound: 1, currentTurnIndex: 0, version: 5 } as unknown as BattleScene;

const delta = (version: number): ClientBattleDelta => ({
  battleId: "b1", version, scene: { status: "active", round: 1, turnIndex: 1, pendingMoraleCheck: null }, upserted: [], removed: [], log: [],
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  qc.setQueryData(key, base);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, wrapper };
}

describe("useBattleAction", () => {
  it("підставляє expectedVersion з кешу, застосовує дельту, повертає response", async () => {
    const { qc, wrapper } = setup();

    const fn = vi.fn(async () => ({ delta: delta(6), response: { ok: 1 } }));

    const { result } = renderHook(() => useBattleAction<{ x: number }, { ok: number }>("c1", "b1", fn), { wrapper });

    let out: unknown;

    await act(async () => {
      out = await result.current.mutateAsync({ x: 1 });
    });

    expect(fn).toHaveBeenCalledWith({ x: 1, expectedVersion: 5 });
    expect(out).toEqual({ ok: 1 });
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(6);
  });

  it("пропуск версії — інвалідація замість патчу", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useBattleAction("c1", "b1", async () => ({ delta: delta(8) })), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: key });
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(5);
  });

  it("409 — onConflict і інвалідація, помилка прокидується", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const onConflict = vi.fn();

    const fn = vi.fn(async () => {
      throw new ApiError("conflict", 409, "/x", { code: "conflict", version: 7 });
    });

    const { result } = renderHook(() => useBattleAction("c1", "b1", fn, { onConflict }), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toBeInstanceOf(ApiError);
    });

    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/hooks/battles/__tests__/useBattleAction.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: `lib/hooks/battles/useBattleAction.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { BattleMutationResponse, BattleScene } from "@/types/api";

export interface BattleActionOptions {
  invalidate?: ("battles" | "active-battles")[];
  onConflict?: () => void;
}

export function useBattleAction<TVars extends object, TResp = Record<string, unknown>>(
  campaignId: string,
  battleId: string,
  fn: (vars: TVars & { expectedVersion?: number }) => Promise<BattleMutationResponse<TResp>>,
  options: BattleActionOptions = {},
) {
  const queryClient = useQueryClient();

  const key = ["battle", campaignId, battleId];

  return useMutation({
    mutationFn: async (vars: TVars) => {
      const expectedVersion = queryClient.getQueryData<BattleScene>(key)?.version;

      const { delta, response } = await fn({ ...vars, expectedVersion });

      const cached = queryClient.getQueryData<BattleScene>(key);

      const next = cached ? applyBattleDelta(cached, delta) : "refetch";

      if (next === "refetch") void queryClient.invalidateQueries({ queryKey: key });
      else queryClient.setQueryData(key, next);

      for (const list of options.invalidate ?? []) {
        void queryClient.invalidateQueries({ queryKey: list === "battles" ? ["battles", campaignId] : ["active-battles"] });
      }

      return response;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: key });
        options.onConflict?.();
      }
    },
  });
}
```

- [ ] **Step 4: Тест зелений**

Run: `pnpm test:run lib/hooks/battles/__tests__/useBattleAction.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: `lib/api/battles.ts` — мутації повертають дельти**

Для кожної мутації бою замінити тип відповіді. Приклад (решта — так само, шляхи роутів ті самі):

```ts
export type WithVersion<T> = T & { expectedVersion?: number };

export async function nextTurn(campaignId: string, battleId: string, body: WithVersion<object> = {}): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/next-turn`, body);
}

export async function attack(
  campaignId: string,
  battleId: string,
  data: WithVersion<AttackData & { endTurn?: boolean }>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/attack`, data);
}

export async function moraleCheck(
  campaignId: string,
  battleId: string,
  data: WithVersion<MoraleCheckData>,
): Promise<BattleMutationResponse<{ moraleResult: MoraleCheckResult }>> {
  return campaignPost(campaignId, `/battles/${battleId}/morale-check`, data);
}

export async function rollbackBattleAction(
  campaignId: string,
  battleId: string,
  body: WithVersion<{ actionIndex: number }>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/rollback`, body);
}
```

`bonusAction`, `castSpell`, `startBattle`, `resetBattle`, `completeBattle` (`WithVersion<{ result?: "victory" | "defeat" }>`), `addBattleParticipant`, `updateBattleParticipant` (`WithVersion<{ currentHp?: number; removeFromBattle?: boolean }>`) — аналогічно `BattleMutationResponse`. `MoraleCheckResult` імпортувати типом з `@/lib/utils/battle/battle-morale`. Перевірити поточні тіла rollback/updateParticipant у файлі (рядки 250–281) і зберегти шляхи.

- [ ] **Step 6: `useBattles.ts` на `useBattleAction`**

Видалити `mergeBattleCache`-імпорт і всі `onSuccess` з `setQueryData`. Перенести константу:

```ts
/** Fallback-polling для активного бою. 30s — знижує egress; оновлення йдуть через Pusher та мутації. */
export const BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000;
```

Хуки мутацій:

```ts
type ActionOpts = { onConflict?: () => void };

export const useNextTurn = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => nextTurn(c, b, body), { ...o, invalidate: ["battles"] });

export const useAttack = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AttackData & { endTurn?: boolean }>(c, b, (data) => attack(c, b, data), { ...o, invalidate: ["battles"] });

export const useMoraleCheck = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MoraleCheckData, { moraleResult: MoraleCheckResult }>(c, b, (data) => moraleCheck(c, b, data), o);

export const useBonusAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<BonusActionData>(c, b, (data) => bonusAction(c, b, data), o);

export const useCastSpell = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<SpellCastData>(c, b, (data) => castSpell(c, b, data), o);

export const useStartBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => startBattle(c, b, body), { ...o, invalidate: ["battles", "active-battles"] });

export const useResetBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => resetBattle(c, b, body), { ...o, invalidate: ["battles"] });

export const useCompleteBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ result?: "victory" | "defeat" }>(c, b, (body) => completeBattle(c, b, body), { ...o, invalidate: ["battles", "active-battles"] });

export const useRollbackBattleAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ actionIndex: number }>(c, b, (body) => rollbackBattleAction(c, b, body), { ...o, invalidate: ["battles"] });

export const useAddBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AddParticipantData>(c, b, (data) => addBattleParticipant(c, b, data), o);

export const useUpdateBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ participantId: string; data: { currentHp?: number; removeFromBattle?: boolean } }>(
    c, b, ({ participantId, data, expectedVersion }) => updateBattleParticipant(c, b, participantId, { ...data, expectedVersion }), o,
  );
```

`useAttackAndNextTurn`, `useSpellPreview`, `useAttack` (стара) — видалити; `useUpdateBattle` (PATCH /) — `onSuccess: (data) => queryClient.setQueryData(key, acceptFullBattle(queryClient.getQueryData(key), data))`. Оновити барел `lib/hooks/battles/index.ts` (прибрати `mergeBattleCache`, `useAttackAndNextTurn`, `useSpellPreview`; додати `useBattleAction`, `BATTLE_ACTIVE_REFETCH_INTERVAL_MS`). Старі споживачі (`useBattleSceneLogic*`, сторінка) тимчасово ламаються типами — це нормально, їх видаляє Task 21–22; щоб збірка лишалась зеленою між задачами, у `useBattleSceneLogic.ts` замінити `useAttackAndNextTurn(id, battleId)` на `useAttack(id, battleId)` і в `useBattleSceneLogic-handlers.ts` викликати `attackAndNextTurnMutation.mutateAsync({ ...data, endTurn: true })`; у `page.tsx` прибрати `useSpellPreview` і прев'ю (кнопка спела кастує одразу). Решту місць, що читають `BattleScene` з `onSuccess` мутацій (`triggerGlobalDamageFromBattle`, `findLastSpellAction(updatedBattle…)`), перевести на читання кешу після `mutateAsync`: `queryClient.getQueryData(["battle", id, battleId])` — тимчасово, до Task 21.

- [ ] **Step 7: `usePusherBattleSync` слухає `battle-delta`**

Замінити `applyBattlePayload` і три `bind` на:

```ts
      const onDelta = (data: unknown) => {
        if (!data || typeof data !== "object" || !("version" in data)) {
          void queryClient.invalidateQueries({ queryKey: queryKey() });

          return;
        }

        const cached = queryClient.getQueryData<BattleScene>(queryKey());

        const signal = data as ClientBattleDelta | BattleRefetchSignal;

        if (cached?.version !== undefined && signal.version <= cached.version) return;

        const next = !cached || "refetch" in signal ? "refetch" : applyBattleDelta(cached, signal);

        if (next === "refetch") void queryClient.invalidateQueries({ queryKey: queryKey() });
        else queryClient.setQueryData(queryKey(), next);
      };
```

```ts
      battleChannel.bind("battle-delta", onDelta);
```

Прибрати `battleSnapshot`, `debugLog`-виклики, що посилались на старі payload, `mergeBattleCache`-імпорт. На cleanup — `battleChannel.unbind("battle-delta", onDelta)` перед `unsubscribe`, і `pusher.connection.unbind("state_change", onState)` (виділити `onState` в іменовану функцію).

- [ ] **Step 8: Оновити `usePusherBattleSync.test.tsx`**

У тестах замінити `simulateTrigger(channel, "battle-updated", fullBattle)` на дельти: кеш заповнити `{ ...battle, version: 1 }`, тригерити `battle-delta` з `{ battleId, version: 2, scene: {...}, upserted: [...], removed: [], log: [] }` і перевіряти, що обидва клієнти отримали однаковий `initiativeOrder`. Додати тест: `battle-delta` з `{ battleId, version: 5, refetch: true }` → `invalidateQueries` викликано один раз; з `version: 1` (≤ кешу) → не викликано.

- [ ] **Step 9: Прогнати тести й типи**

Run: `pnpm test:run lib/hooks lib/utils/battle && pnpm exec tsc --noEmit`
Expected: PASS, без помилок типів.

- [ ] **Step 10: Commit**

```bash
pnpm lint --fix lib/api/battles.ts lib/hooks app/campaigns
git add -A lib/api/battles.ts lib/hooks app/campaigns
git commit -m "feat(battle): client applies deltas via useBattleAction; Pusher battle-delta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Фаза B — рушій

### Task 5: Структуровані кроки шкоди (`DamageStep`)

**Files:**
- Modify: `types/battle.ts` (новий тип `DamageStep`; поле `actionDetails.damageSteps`)
- Modify: `lib/utils/abilities/engine/collect-modifiers.ts` (`ModifierEntry.flag?`, `ModifierEntry.icon?`)
- Modify: `lib/utils/battle/resistance/index.ts` (`ResistanceResult.steps`)
- Modify: `lib/utils/battle/types/damage-calculations.ts`, `lib/utils/battle/damage/impl.ts` (`steps`)
- Modify: `lib/utils/battle/types/damage-breakdown.ts`, `lib/utils/battle/damage/breakdown.ts`, `lib/utils/battle/damage/breakdown-helpers.ts` (`steps`, `targetSteps`)
- Modify: `lib/utils/battle/attack/process/compute.ts`, `lib/utils/battle/attack/process/actions.ts`
- Modify: `lib/utils/battle/spell/process-damage.ts` (+ тип `SpellCalculation`), `lib/utils/battle/spell/process-actions.ts`
- Test: `lib/utils/battle/__tests__/damage-steps.test.ts`

**Interfaces:**
- Produces (`@/types/battle`):

```ts
export interface DamageStep {
  label: string;
  side: "attacker" | "target";
  kind: "dice" | "flat" | "percent" | "multiplier" | "immunity";
  value: number;
  after: number;
  icon?: string | null;
}
```

  `BattleAction["actionDetails"].damageSteps?: Record<string, DamageStep[]>` (ключ — id цілі).
- `calculateDamageWithModifiersImpl(...)` → `DamageCalculationResult` з новим `steps: DamageStep[]`.
- `applyResistance(...)` → `ResistanceResult` з новим `steps: DamageStep[]` (side `"target"`).
- `computeDamageBreakdown(...)` → `DamageBreakdownResult` з новими `steps: DamageStep[]` (attacker + target).

- [ ] **Step 1: Тест, що падає** — `lib/utils/battle/__tests__/damage-steps.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { calculateDamageWithModifiersImpl } from "@/lib/utils/battle/damage/impl";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage/breakdown";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { battleActionToEvent, eventToBattleAction } from "@/lib/utils/battle/store";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const passive = (key: string, name: string, effects: ResolvedAbility["effects"]): ResolvedAbility =>
  ({ key, name, trigger: { event: "passive" }, effects, source: { type: "skill", id: key, name, icon: `/icons/${key}.png` } }) as ResolvedAbility;

function withAbilities(id: string, side: ParticipantSide, abilities: ResolvedAbility[]): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, side, sourceType: "unit" },
    battleData: { ...base.battleData, resolvedAbilities: abilities },
  };
}

const attacker = withAbilities("a", ParticipantSide.ALLY, [
  passive("expert-attack", "Експертна атака", [{ kind: "damageBonus", damageKind: "melee", percent: 25 }] as ResolvedAbility["effects"]),
]);

const target = withAbilities("t", ParticipantSide.ENEMY, [
  passive("expert-defense", "Експертний захист", [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 20 }] as ResolvedAbility["effects"]),
]);

describe("кроки шкоди", () => {
  it("атакувальник: кубики → характеристика → % з умінь, after останнього = totalDamage", () => {
    const r = calculateDamageWithModifiersImpl(attacker, 6, 3, AttackType.MELEE, { allParticipants: [attacker, target] });

    expect(r.steps.map((s) => [s.kind, s.label, s.value])).toEqual([
      ["dice", "Кубики", 6],
      ["flat", "Сила", 3],
      ["percent", "Експертна атака", 25],
    ]);
    expect(r.steps.at(-1)?.after).toBe(r.totalDamage);
    expect(r.steps[2].icon).toBe("/icons/expert-attack.png");
    expect(r.steps.every((s) => s.side === "attacker")).toBe(true);
  });

  it("ціль: опір із назвою джерела; імунітет — один крок до 0", () => {
    const r = applyResistance(target, 11, "slashing", { participants: [attacker, target] });

    expect(r.finalDamage).toBe(8);
    expect(r.steps).toEqual([{ label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 8, icon: "/icons/expert-defense.png" }]);

    const immune = withAbilities("i", ParticipantSide.ENEMY, [
      passive("stone", "Кам'яна шкіра", [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 100 }] as ResolvedAbility["effects"]),
    ]);

    expect(applyResistance(immune, 11, "slashing").steps).toEqual([
      { label: "Кам'яна шкіра", side: "target", kind: "immunity", value: -100, after: 0, icon: "/icons/stone.png" },
    ]);
  });

  it("computeDamageBreakdown повертає кроки обох сторін, останній after = finalDamage", () => {
    const attack = { name: "Рапіра", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

    const r = computeDamageBreakdown({ attacker, target, attack, damageRolls: [6], allParticipants: [attacker, target] });

    expect(r.steps.some((s) => s.side === "target" && s.label === "Експертний захист")).toBe(true);
    expect(r.steps.at(-1)?.after).toBe(r.finalDamage);
  });

  it("damageSteps переживають запис у подію і читання назад", () => {
    const action = {
      id: "x", battleId: "b1", round: 1, actionIndex: 3, timestamp: new Date(), actorId: "a", actorName: "A", actorSide: "ally",
      actionType: "attack", targets: [], resultText: "",
      actionDetails: { damageSteps: { t: [{ label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 }] } },
    } as unknown as BattleAction;

    const back = eventToBattleAction({ ...battleActionToEvent(action), seq: 3 } as never, "b1");

    expect(back.actionDetails.damageSteps?.t[0].label).toBe("Кубики");
  });
});
```

(Якщо форма ефекту `damageBonus`/`flag` у схемі відрізняється — `grep -n "DamageBonusSchema\|resistance" lib/utils/abilities/schema/effects.ts` і підставити точні поля; суть тесту не змінюється. Якщо `createMockParticipant` дає героя з `meleeMultiplier`, у фікстурі вище вже стоїть `sourceType: "unit"`, щоб не було кроку коефіцієнта DM.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/battle/__tests__/damage-steps.test.ts`
Expected: FAIL — `steps` undefined.

- [ ] **Step 3: `DamageStep` у `types/battle.ts`**

Додати інтерфейс (див. Interfaces) і в `actionDetails` `BattleAction` поле `damageSteps?: Record<string, DamageStep[]>;`.

- [ ] **Step 4: `ModifierEntry` знає прапорець і іконку**

У `collect-modifiers.ts`:

```ts
export interface ModifierEntry {
  label: string;
  sourceType: AbilitySource["type"] | "effect" | "action";
  flat: number;
  percent: number;
  flag?: FlagEffect;
  icon?: string | null;
}
```

У `add` додати параметр `icon?: string | null` і писати його в обидва `entries.push`; для прапорця — `result.entries.push({ label, sourceType, flat: 0, percent: 0, flag: effect, icon })`. Виклики: пасивні — `add(effect, source, ability.name, ability.source.type, ability.source.icon)`; активні ефекти — `add(effect, subject, ae.name, "effect", ae.icon ?? ae.source?.icon)` (`source` з'явиться в Task 6 — тут лишити `ae.icon`); `extra` — без іконки.

- [ ] **Step 5: `applyResistance` будує кроки**

У `resistance/index.ts` замінити `matchingResistances` і додати кроки:

```ts
function matchingResistances(target: BattleParticipant, damageType: string, opts: ResistanceOptions = {}) {
  const { entries } = collectModifiers(withSelf(opts.participants ?? [], target), target.basicInfo.id, { flag: "resistance" }, opts.extra);

  return entries.flatMap((e) =>
    e.flag?.flag === "resistance" && matchesDamageType(e.flag.damageType, damageType, opts.fromSpell === true)
      ? [{ label: e.label, percent: e.flag.percent, icon: e.icon }]
      : [],
  );
}
```

`hasImmunity` і `getCombinedResistancePercent` працюють із полем `percent` так само. `ResistanceResult` отримує `steps: DamageStep[]`. У `applyResistance`:

```ts
  const matches = matchingResistances(target, damageType, opts);

  const immune = matches.find((m) => m.percent >= 100);

  if (immune) {
    breakdown.push(`${damage} ${damageType} → ІМУНІТЕТ (0 урону)`);

    return {
      finalDamage: 0, immunityApplied: true, resistanceApplied: false, breakdown,
      steps: [{ label: immune.label, side: "target", kind: "immunity", value: -100, after: 0, icon: immune.icon }],
    };
  }

  const resistancePercent = Math.min(BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, matches.reduce((s, m) => s + m.percent, 0));

  if (resistancePercent > 0) {
    finalDamage = Math.floor(damage * (1 - resistancePercent / BATTLE_CONSTANTS.PERCENT_DIVISOR));
    breakdown.push(`${damage} ${damageType} → -${resistancePercent}% опір (${finalDamage} урону)`);

    let used = 0;

    const steps = matches.map((m, i): DamageStep => {
      used = Math.min(resistancePercent, used + m.percent);

      const after = i === matches.length - 1 ? finalDamage : Math.floor(damage * (1 - used / BATTLE_CONSTANTS.PERCENT_DIVISOR));

      return { label: m.label, side: "target", kind: "percent", value: -m.percent, after, icon: m.icon };
    });

    return { finalDamage, immunityApplied: false, resistanceApplied: true, breakdown, steps };
  }

  breakdown.push(`${damage} ${damageType} урону`);

  return { finalDamage, immunityApplied: false, resistanceApplied: false, breakdown, steps: [] };
```

`applyResistanceToMultipleDamage` склеює `steps` усіх типів (`steps.push(...result.steps)`).

- [ ] **Step 6: `calculateDamageWithModifiersImpl` будує кроки атакувальника**

У `DamageCalculationResult` додати `steps: DamageStep[]`. В `impl.ts` після обчислення `baseWithStat` і `mods`:

```ts
  const steps: DamageStep[] = [{ label: "Кубики", side: "attacker", kind: "dice", value: baseDamage, after: baseDamage }];

  let running = baseDamage;

  if (statModifier !== 0) {
    running += statModifier;
    steps.push({ label: attackType === AttackType.MELEE ? "Сила" : "Спритність", side: "attacker", kind: "flat", value: statModifier, after: running });
  }

  if (heroLevelPart + heroDicePart > 0) {
    running += heroLevelPart + heroDicePart;
    steps.push({ label: "Рівень героя", side: "attacker", kind: "flat", value: heroLevelPart + heroDicePart, after: running });
  }

  let percentSoFar = 0;

  for (const e of mods.entries.filter((x) => x.percent)) {
    percentSoFar += e.percent;
    steps.push({ label: e.label, side: "attacker", kind: "percent", value: e.percent, after: baseWithStat + Math.floor((baseWithStat * percentSoFar) / BATTLE_CONSTANTS.PERCENT_DIVISOR), icon: e.icon });
  }

  let flatSoFar = 0;

  for (const e of mods.entries.filter((x) => x.flat)) {
    flatSoFar += e.flat;
    steps.push({ label: e.label, side: "attacker", kind: "flat", value: e.flat, after: baseWithStat + percentBonusDamage + flatSoFar, icon: e.icon });
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], after: totalDamage };
```

(блок ставиться після рядка `const totalDamage = ...`; повернути `steps` у результаті).

- [ ] **Step 7: `computeDamageBreakdown` і кроки цілі**

`getDefenderResistanceBreakdown` у `breakdown-helpers.ts` повертає ще `targetSteps: DamageStep[]` (з `applyResistance(...).steps`). У `computeDamageBreakdown`:

```ts
  const steps: DamageStep[] = [...damageCalculation.steps];

  if (isCritical) steps.push({ label: "Критичне влучання", side: "attacker", kind: "multiplier", value: 2, after: totalDamage });
```

(одразу після `totalDamage *= 2`), після `heroDm`:

```ts
  if (heroDm.breakdownLine) steps.push({ label: "Коефіцієнт DM", side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: totalDamage });
```

(якщо `applyHeroDmDamageMultiplier` не повертає `multiplier` — додати це поле в `hero-dm-multiplier.ts`: множник, який він застосував), і в кінці `steps.push(...targetSteps)`; повернути `steps`. `DamageBreakdownResult`, `DamageBreakdownTargetResult` отримують `steps: DamageStep[]`; multi-target заповнює `steps` для кожної цілі.

- [ ] **Step 8: Атака пише `damageSteps` у подію**

У `attack/process/compute.ts` зібрати кроки поруч із розрахунком і повернути їх:

```ts
  const damageSteps: DamageStep[] = [...damageCalculation.steps];

  if (criticalEffectApplied?.effect.type === "double_damage") damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "multiplier", value: 2, after: physicalDamage });

  if (criticalEffectApplied?.effect.type === "max_damage") damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "flat", value: physicalDamage - damageCalculation.totalDamage, after: physicalDamage });
```

(кроки ставляться після відповідних змін `physicalDamage`), для `additional_damage` — `kind: "flat"` з різницею; після `heroDm` — крок «Коефіцієнт DM»; якщо `dmgMult !== 1` — `{ label: "Частка шкоди", kind: "multiplier", value: dmgMult, after: physicalDamageForTarget }`; далі `...resistanceResult.steps`; якщо `totalAdditionalDamage > 0` — `{ label: "Додаткова шкода", kind: "flat", value: totalAdditionalDamage, after: totalFinalDamage }`. Повернути `damageSteps`. В `actions.ts` у `actionDetails` влучання додати `damageSteps: { [target.basicInfo.id]: damageSteps }`.

- [ ] **Step 9: Спели пишуть кроки цілей**

У `SpellCalculation` (тип у `lib/utils/battle/types/` — знайти `grep -rn "interface SpellCalculation" lib/utils/battle/types`) додати `damageSteps?: Record<string, DamageStep[]>`. У `computeSpellDamageAndApply` після `applyResistance`: `damageSteps[target.basicInfo.id] = resistanceResult.steps;`, повернути в `spellCalculation`. У `process-actions.ts` (дія спела, рядок ~235) додати `damageSteps: spellCalculation.damageSteps`.

- [ ] **Step 10: Тести зелені, регресія рушія**

Run: `pnpm test:run lib/utils/battle lib/utils/abilities`
Expected: PASS (нові 4 + усі існуючі; якщо старі тести порівнюють `ResistanceResult`/`DamageCalculationResult` через `toEqual` — додати `steps: expect.any(Array)`).

- [ ] **Step 11: Commit**

```bash
pnpm lint --fix types/battle.ts lib/utils
git add types/battle.ts lib/utils
git commit -m "feat(battle): structured damage steps with sources in breakdown and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Джерело ефекту (`ActiveEffect.source`)

**Files:**
- Modify: `types/battle.ts` (`ActiveEffect.source?`)
- Modify: `lib/utils/abilities/engine/timed-effects.ts` (`TimedEffectInput.source?`, `effectSource`)
- Modify: `lib/utils/abilities/registry/effects/static.ts`, `state.ts`, `hp.ts` (передати `source`)
- Modify: `lib/utils/battle/spell/process-effects.ts`, `lib/utils/battle/spell/process.ts` (передати кастера)
- Modify: `lib/utils/abilities/engine/collect-modifiers.ts` (іконка ефекту → `ae.icon ?? ae.source?.icon`)
- Test: `lib/utils/abilities/engine/__tests__/effect-source.test.ts`

**Interfaces:**
- Produces: `ActiveEffect.source?: { participantId: string; name: string; abilityName?: string; icon?: string | null }`; `effectSource(owner: BattleParticipant | undefined, ability: { name: string; source?: { icon?: string | null } }): ActiveEffect["source"]`.

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { applySpellAdditionalModifier } from "@/lib/utils/battle/spell/process-effects";

const owner = (() => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id: "fin", name: "Фіндан" } };
})();

describe("джерело ефекту", () => {
  it("effectSource бере учасника й уміння", () => {
    expect(effectSource(owner, { name: "Отруйний клинок", source: { icon: "/i.png" } })).toEqual({
      participantId: "fin", name: "Фіндан", abilityName: "Отруйний клинок", icon: "/i.png",
    });
  });

  it("upsertTimedEffect записує source у ActiveEffect", () => {
    const target = createMockParticipant();

    const next = upsertTimedEffect(
      target,
      { timedKey: "k#0", name: "Отрута", type: "debuff", rounds: 2, stackable: false, source: effectSource(owner, { name: "Отруйний клинок" }) },
      1,
    );

    expect(next.battleData.activeEffects.at(-1)?.source).toMatchObject({ participantId: "fin", abilityName: "Отруйний клинок" });
  });

  it("модифікатор спела отримує кастера як джерело", () => {
    const target = createMockParticipant();

    const [t] = applySpellAdditionalModifier(
      { id: "s1", name: "Отруйна хмара", icon: "/s.png" } as never,
      [target],
      { modifier: "poison", duration: 2, damage: 3 },
      1,
      owner,
    );

    expect(t.battleData.activeEffects.at(-1)?.source).toMatchObject({ participantId: "fin", abilityName: "Отруйна хмара", icon: "/s.png" });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/abilities/engine/__tests__/effect-source.test.ts`
Expected: FAIL — `effectSource` is not exported.

- [ ] **Step 3: Реалізація**

`types/battle.ts` — у `ActiveEffect`:

```ts
  source?: { participantId: string; name: string; abilityName?: string; icon?: string | null };
```

`timed-effects.ts`:

```ts
export function effectSource(
  owner: BattleParticipant | undefined,
  ability: { name: string; source?: { icon?: string | null } },
): ActiveEffect["source"] {
  if (!owner) return undefined;

  return { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName: ability.name, icon: ability.source?.icon };
}
```

`TimedEffectInput` + `source?: ActiveEffect["source"]`; в об'єкті ефекту `...(input.source && { source: input.source })`.

`registry/effects/static.ts`, `state.ts`, `hp.ts` — у кожен виклик `upsertTimedEffect` додати `source: effectSource(findParticipant(input.participants, input.ownerId), ability)` (у `static.ts` `owner` уже знайдено — `source: effectSource(owner, ability)`).

`process-effects.ts` — `applySpellAdditionalModifier` і `applySpellDurationEffects` отримують останній параметр `caster?: BattleParticipant` і в `addActiveEffect(...)` додають `source: effectSource(caster, { name: spell.name, source: { icon: spell.icon } })`. У `process.ts` (рядки ~255–261) передати `caster`.

`collect-modifiers.ts` — у циклі активних ефектів `add(effect, subject, ae.name, "effect", ae.icon ?? ae.source?.icon)`.

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix types/battle.ts lib/utils
git add types/battle.ts lib/utils
git commit -m "feat(battle): active effects remember who applied them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Фаза C — що бачить гравець

### Task 7: Стан HP, відомий AC, помічене в бою, видимість

**Files:**
- Create: `lib/utils/battle/view/health.ts`, `lib/utils/battle/view/knowledge.ts`, `lib/utils/battle/view/visibility.ts`, `lib/utils/battle/view/index.ts`
- Test: `lib/utils/battle/view/__tests__/health.test.ts`, `knowledge.test.ts`, `visibility.test.ts`

**Interfaces:**
- Produces:
  - `type HealthState = "unhurt" | "wounded" | "bloodied" | "dying" | "down"`; `HEALTH_LABEL: Record<HealthState, string>`; `healthState(p: BattleParticipant): HealthState`; `healthSegments(s: HealthState): 0 | 1 | 2 | 3 | 4`.
  - `interface KnownArmorClass { min?: number; max?: number; evidence: { actorName: string; total: number; hit: boolean; round: number }[] }`; `knownArmorClass(log: BattleAction[], targetId: string): KnownArmorClass`; `formatKnownArmorClass(k: KnownArmorClass): string`.
  - `interface ObservedTrait { label: string; kind: DamageStep["kind"]; value: number; icon?: string | null }`; `observedTraits(log: BattleAction[], targetId: string): ObservedTrait[]`.
  - `interface Viewer { userId: string | null; isDM: boolean; canSeeEnemyHp: boolean }`; `canSeeExactStats(p: BattleParticipant, viewer: Viewer): boolean`; `sanitizeLogEntry(e: BattleAction, viewer: Viewer): BattleAction`; `hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean): DamageStep[]`.

- [ ] **Step 1: Тести, що падають**

`health.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { healthSegments, healthState } from "@/lib/utils/battle/view";

const at = (currentHp: number, maxHp = 40, status: "active" | "unconscious" | "dead" = "active") => {
  const p = createMockParticipant();

  return { ...p, combatStats: { ...p.combatStats, currentHp, maxHp, status } };
};

describe("healthState", () => {
  it.each([
    [40, "unhurt"], [39, "wounded"], [21, "wounded"], [20, "bloodied"], [11, "bloodied"], [10, "dying"], [1, "dying"], [0, "down"],
  ] as const)("%i/40 → %s", (hp, state) => {
    expect(healthState(at(hp))).toBe(state);
  });

  it("непритомний із HP > 0 — повалений", () => {
    expect(healthState(at(15, 40, "unconscious"))).toBe("down");
  });

  it("сегменти", () => {
    expect([healthSegments("unhurt"), healthSegments("bloodied"), healthSegments("down")]).toEqual([4, 2, 0]);
  });
});
```

`knowledge.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatKnownArmorClass, knownArmorClass, observedTraits } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const atk = (actorName: string, total: number, isHit: boolean, round = 1, extra: Partial<BattleAction["actionDetails"]> = {}): BattleAction =>
  ({
    actionIndex: Math.random(), round, actorName, actionType: "attack",
    targets: [{ participantId: "t", participantName: "Т" }],
    actionDetails: { totalAttackValue: total, isHit, isCritical: false, isCriticalFail: false, ...extra },
  }) as unknown as BattleAction;

describe("knownArmorClass", () => {
  it("нічого не відомо — ?", () => {
    expect(formatKnownArmorClass(knownArmorClass([], "t"))).toBe("?");
  });

  it("влучання 15 і промах 12 → 13–15", () => {
    const k = knownArmorClass([atk("Годрік", 15, true), atk("Фрейда", 12, false)], "t");

    expect(k).toMatchObject({ min: 13, max: 15 });
    expect(formatKnownArmorClass(k)).toBe("13–15");
    expect(k.evidence).toHaveLength(2);
  });

  it("лише промахи → ≥; лише влучання → ≤; рівні межі → одне число", () => {
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 13, false)], "t"))).toBe("≥ 14");
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 16, true)], "t"))).toBe("≤ 16");
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 14, true), atk("B", 13, false)], "t"))).toBe("14");
  });

  it("натуральні 20 і 1 нічого не кажуть про AC; чужі цілі ігноруються", () => {
    const crit = atk("A", 9, true, 1, { isCritical: true });

    const other = { ...atk("A", 5, false), targets: [{ participantId: "x", participantName: "X" }] } as BattleAction;

    expect(formatKnownArmorClass(knownArmorClass([crit, other], "t"))).toBe("?");
  });

  it("суперечність (AC змінився) — лише останній раунд", () => {
    const k = knownArmorClass([atk("A", 12, true, 1), atk("B", 15, false, 2)], "t");

    expect(formatKnownArmorClass(k)).toBe("≥ 16");
  });
});

describe("observedTraits", () => {
  it("унікальні кроки цілі з подій", () => {
    const step = { label: "Експертний захист", side: "target" as const, kind: "percent" as const, value: -20, after: 8 };

    const log = [
      atk("A", 15, true, 1, { damageSteps: { t: [{ label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 }, step] } }),
      atk("B", 16, true, 2, { damageSteps: { t: [step] } }),
    ];

    expect(observedTraits(log, "t")).toEqual([{ label: "Експертний захист", kind: "percent", value: -20 }]);
  });
});
```

`visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { canSeeExactStats, hiddenTargetSteps, sanitizeLogEntry } from "@/lib/utils/battle/view";
import type { BattleAction, DamageStep } from "@/types/battle";

const side = (s: ParticipantSide) => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, side: s } };
};

const player = { userId: "u", isDM: false, canSeeEnemyHp: false };

describe("видимість", () => {
  it("союзника видно точно, ворога — ні, DM і seeEnemyHp бачать усе", () => {
    expect(canSeeExactStats(side(ParticipantSide.ALLY), player)).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), player)).toBe(false);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, isDM: true })).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, canSeeEnemyHp: true })).toBe(true);
  });

  it("журнал для гравця без targetAC і damageBreakdown; DM бачить усе", () => {
    const e = { actionDetails: { targetAC: 15, damageBreakdown: "x", totalAttackValue: 19 } } as unknown as BattleAction;

    expect(sanitizeLogEntry(e, player).actionDetails).toEqual({ totalAttackValue: 19 });
    expect(sanitizeLogEntry(e, { ...player, isDM: true })).toBe(e);
  });

  it("кроки цілі ховаються, доки не помічені в журналі", () => {
    const steps: DamageStep[] = [
      { label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 },
      { label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 4 },
    ];

    expect(hiddenTargetSteps(steps, "t", [], false).map((s) => s.label)).toEqual(["Кубики"]);

    const seen = [{ targets: [{ participantId: "t" }], actionDetails: { damageSteps: { t: [steps[1]] } } }] as unknown as BattleAction[];

    expect(hiddenTargetSteps(steps, "t", seen, false)).toHaveLength(2);
    expect(hiddenTargetSteps(steps, "t", [], true)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Запустити — падають**

Run: `pnpm test:run lib/utils/battle/view`
Expected: FAIL — module not found.

- [ ] **Step 3: Реалізація**

`health.ts`:

```ts
import type { BattleParticipant } from "@/types/battle";

export type HealthState = "unhurt" | "wounded" | "bloodied" | "dying" | "down";

export const HEALTH_LABEL: Record<HealthState, string> = {
  unhurt: "неушкоджений",
  wounded: "поранений",
  bloodied: "закривавлений",
  dying: "при смерті",
  down: "повалений",
};

export function healthState(p: BattleParticipant): HealthState {
  const { currentHp, maxHp, status } = p.combatStats;

  if (status !== "active" || currentHp <= 0) return "down";

  const ratio = maxHp > 0 ? currentHp / maxHp : 0;

  if (ratio >= 1) return "unhurt";

  if (ratio > 0.5) return "wounded";

  if (ratio > 0.25) return "bloodied";

  return "dying";
}

const SEGMENTS = { unhurt: 4, wounded: 3, bloodied: 2, dying: 1, down: 0 } as const;

export function healthSegments(s: HealthState): 0 | 1 | 2 | 3 | 4 {
  return SEGMENTS[s];
}
```

`knowledge.ts`:

```ts
import type { BattleAction, DamageStep } from "@/types/battle";

export interface KnownArmorClass {
  min?: number;
  max?: number;
  evidence: { actorName: string; total: number; hit: boolean; round: number }[];
}

export interface ObservedTrait {
  label: string;
  kind: DamageStep["kind"];
  value: number;
  icon?: string | null;
}

const targets = (e: BattleAction, id: string) => e.targets?.some((t) => t.participantId === id) ?? false;

function bounds(evidence: KnownArmorClass["evidence"]): Pick<KnownArmorClass, "min" | "max"> {
  let min: number | undefined;

  let max: number | undefined;

  for (const e of evidence) {
    if (e.hit) max = max === undefined ? e.total : Math.min(max, e.total);
    else min = min === undefined ? e.total + 1 : Math.max(min, e.total + 1);
  }

  return { min, max };
}

export function knownArmorClass(log: BattleAction[], targetId: string): KnownArmorClass {
  const evidence = log
    .filter((e) => e.actionType === "attack" && targets(e, targetId))
    .filter((e) => typeof e.actionDetails?.totalAttackValue === "number" && typeof e.actionDetails.isHit === "boolean")
    .filter((e) => !e.actionDetails.isCritical && !e.actionDetails.isCriticalFail)
    .map((e) => ({ actorName: e.actorName, total: e.actionDetails.totalAttackValue as number, hit: e.actionDetails.isHit as boolean, round: e.round }));

  const all = bounds(evidence);

  if (all.min === undefined || all.max === undefined || all.min <= all.max) return { ...all, evidence };

  const lastRound = Math.max(...evidence.map((e) => e.round));

  const recent = evidence.filter((e) => e.round === lastRound);

  return { ...bounds(recent), evidence: recent };
}

export function formatKnownArmorClass({ min, max }: KnownArmorClass): string {
  if (min !== undefined && max !== undefined) return min === max ? `${min}` : `${min}–${max}`;

  if (max !== undefined) return `≤ ${max}`;

  if (min !== undefined) return `≥ ${min}`;

  return "?";
}

export function observedTraits(log: BattleAction[], targetId: string): ObservedTrait[] {
  const seen = new Map<string, ObservedTrait>();

  for (const e of log) {
    for (const s of e.actionDetails?.damageSteps?.[targetId] ?? []) {
      if (s.side !== "target" || seen.has(s.label)) continue;

      seen.set(s.label, { label: s.label, kind: s.kind, value: s.value, ...(s.icon && { icon: s.icon }) });
    }
  }

  return [...seen.values()];
}
```

`visibility.ts`:

```ts
import { observedTraits } from "./knowledge";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

export interface Viewer {
  userId: string | null;
  isDM: boolean;
  canSeeEnemyHp: boolean;
}

export function canSeeExactStats(p: BattleParticipant, viewer: Viewer): boolean {
  return viewer.isDM || viewer.canSeeEnemyHp || p.basicInfo.side === ParticipantSide.ALLY;
}

export function sanitizeLogEntry(e: BattleAction, viewer: Viewer): BattleAction {
  if (viewer.isDM) return e;

  const { targetAC: _ac, damageBreakdown: _b, ...rest } = e.actionDetails ?? {};

  void _ac;
  void _b;

  return { ...e, actionDetails: rest };
}

export function hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean): DamageStep[] {
  if (exact) return steps;

  const known = new Set(observedTraits(log, targetId).map((t) => t.label));

  return steps.filter((s) => s.side === "attacker" || known.has(s.label));
}
```

`index.ts`:

```ts
export * from "./health";
export * from "./knowledge";
export * from "./visibility";
```

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/battle/view`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/view
git add lib/utils/battle/view
git commit -m "feat(battle): player view rules — health states, known AC, observed traits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Черга ходів, «хід через N», мій герой

**Files:**
- Create: `lib/utils/battle/view/queue.ts`, `lib/utils/battle/view/hero.ts`; Modify: `lib/utils/battle/view/index.ts`
- Test: `lib/utils/battle/view/__tests__/queue.test.ts`, `hero.test.ts`

**Interfaces:**
- Produces:
  - `type QueueEntry = { kind: "turn" | "extra"; participant: BattleParticipant; current: boolean; down: boolean } | { kind: "round"; round: number }`; `turnQueue(order: BattleParticipant[], turnIndex: number, round: number): QueueEntry[]`; `turnsUntil(queue: QueueEntry[], myIds: string[]): number | null`.
  - `type SpellTier = "iron" | "bronze" | "silver" | "gold" | "mithril" | "platinum"`; `spellTier(level: number): SpellTier`; `ROMAN: readonly string[]` (`["0","I","II","III","IV","V"]`); `slotLevels(p): { level: 1|2|3|4|5; max: number; current: number }[]`.
  - `interface AbilityCharge { key: string; name: string; icon?: string | null; left: number; limit: number; per: "battle" | "round" | "turn" }`; `abilityCharges(p): AbilityCharge[]`.
  - `effectiveArmorClass(p: BattleParticipant, all: BattleParticipant[]): number`.
  - `bonusTargetSide(a: ResolvedAbility): "ally" | "enemy" | null`.
  - `lastAction(log: BattleAction[]): BattleAction | null`.
  - `needsMoraleCheck(p: BattleParticipant, pendingMoraleCheck: unknown): boolean`.
  - `attackDamageFormula(p: BattleParticipant, attack: BattleAttack): string`; `damageDiceSlots(p, attack): number[]`.
  - `weaponPreview(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]): { bonuses: { label: string; percent: number; flat: number; icon?: string | null }[]; estimate: number }` — бонуси шкоди з умінь для цього типу атаки і середня шкода з ними (без захисту цілі).

- [ ] **Step 1: Тести, що падають**

`queue.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { type QueueEntry, turnQueue, turnsUntil } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, over: { extra?: boolean; active?: boolean; down?: boolean } = {}): BattleParticipant => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id },
    combatStats: { ...b.combatStats, status: over.down ? "dead" : "active", currentHp: over.down ? 0 : 10 },
    actionFlags: { ...b.actionFlags, hasExtraTurn: over.extra ?? false },
    battleData: { ...b.battleData, extraTurnActive: over.active ?? false },
  };
};

const shape = (q: QueueEntry[]) => q.map((e) => (e.kind === "round" ? `|${e.round}` : `${e.kind === "extra" ? "+" : ""}${e.participant.basicInfo.id}${e.current ? "*" : ""}`));

describe("turnQueue", () => {
  it("решта раунду → межа → наступний раунд", () => {
    expect(shape(turnQueue([p("a"), p("b"), p("c")], 1, 3))).toEqual(["b*", "c", "|4", "a", "b", "c"]);
  });

  it("додаткові ходи — наприкінці раунду, у порядку ініціативи", () => {
    const order = [p("a", { extra: true }), p("b"), p("c", { extra: true })];

    expect(shape(turnQueue(order, 1, 3))).toEqual(["b*", "c", "+a", "+c", "|4", "a", "b", "c"]);
  });

  it("повалений не отримує додаткового ходу", () => {
    expect(shape(turnQueue([p("a", { extra: true, down: true }), p("b")], 1, 1))).toEqual(["b*", "|2", "a", "b"]);
  });

  it("додатковий хід триває — він поточний", () => {
    const order = [p("a", { active: true }), p("b"), p("c", { extra: true })];

    expect(shape(turnQueue(order, 0, 3))).toEqual(["+a*", "+c", "|4", "a", "b", "c"]);
  });

  it("turnsUntil: моя черга, повалені не рахуються, мій хід = 0, кілька моїх — найближчий", () => {
    const q = turnQueue([p("a"), p("x", { down: true }), p("b"), p("me"), p("me2")], 0, 1);

    expect(turnsUntil(q, ["me"])).toBe(2);
    expect(turnsUntil(q, ["me2", "me"])).toBe(2);
    expect(turnsUntil(q, ["a"])).toBe(0);
    expect(turnsUntil(q, ["nobody"])).toBeNull();
  });
});
```

`hero.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { abilityCharges, bonusTargetSide, effectiveArmorClass, lastAction, needsMoraleCheck, slotLevels, spellTier, weaponPreview } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction } from "@/types/battle";

const ability = (over: Partial<ResolvedAbility>): ResolvedAbility =>
  ({ key: "k", name: "Друге дихання", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d10" }], source: { type: "skill", id: "s", name: "S" }, ...over }) as ResolvedAbility;

describe("мій герой", () => {
  it("spellTier", () => {
    expect([0, 1, 2, 3, 4, 5].map(spellTier)).toEqual(["iron", "bronze", "silver", "gold", "mithril", "platinum"]);
  });

  it("slotLevels — п'ять кіл, відсутні з max 0", () => {
    const p = createMockParticipant();

    const s = slotLevels({ ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 4, current: 3 }, "3": { max: 2, current: 2 } } } });

    expect(s).toEqual([
      { level: 1, max: 4, current: 3 }, { level: 2, max: 0, current: 0 }, { level: 3, max: 2, current: 2 },
      { level: 4, max: 0, current: 0 }, { level: 5, max: 0, current: 0 },
    ]);
  });

  it("abilityCharges — лише обмежені бонусні дії, з урахуванням використань", () => {
    const p = createMockParticipant();

    const limited = ability({ key: "sw", limits: { perBattle: 1 } });

    const charges = abilityCharges({
      ...p,
      battleData: { ...p.battleData, resolvedAbilities: [limited, ability({ key: "free" })], abilityUsage: { sw: { battle: 1, round: 1, turn: 1 } } },
    });

    expect(charges).toEqual([{ key: "sw", name: "Друге дихання", icon: undefined, left: 0, limit: 1, per: "battle" }]);
  });

  it("effectiveArmorClass враховує ауру союзника", () => {
    const base = createMockParticipant();

    const me = { ...base, basicInfo: { ...base.basicInfo, id: "me" }, combatStats: { ...base.combatStats, armorClass: 16 } };

    const paladin = {
      ...base,
      basicInfo: { ...base.basicInfo, id: "pal" },
      battleData: { ...base.battleData, resolvedAbilities: [ability({ key: "aura", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 4, target: "allAllies" }] as ResolvedAbility["effects"] })] },
    };

    expect(effectiveArmorClass(me, [me, paladin])).toBe(20);
  });

  it("bonusTargetSide", () => {
    expect(bonusTargetSide(ability({ effects: [{ kind: "heal", amount: "1d8", target: "eventTarget" }] as ResolvedAbility["effects"] }))).toBe("ally");
    expect(bonusTargetSide(ability({ effects: [{ kind: "dealDamage", amount: "2d6", target: "eventTarget" }] as ResolvedAbility["effects"] }))).toBe("enemy");
    expect(bonusTargetSide(ability({}))).toBeNull();
  });

  it("lastAction пропускає end_turn", () => {
    const log = [{ actionType: "attack", actionIndex: 1 }, { actionType: "end_turn", actionIndex: 2 }] as BattleAction[];

    expect(lastAction(log)?.actionIndex).toBe(1);
    expect(lastAction([])).toBeNull();
  });

  it("needsMoraleCheck: мораль ≠ 0, не некромант, людина з від'ємною — ні, вже перевірено — ні", () => {
    const p = createMockParticipant();

    const m = (morale: number, race = "elf") => ({ ...p, abilities: { ...p.abilities, race }, combatStats: { ...p.combatStats, morale } });

    expect(needsMoraleCheck(m(1), null)).toBe(true);
    expect(needsMoraleCheck(m(0), null)).toBe(false);
    expect(needsMoraleCheck(m(-1, "human"), null)).toBe(false);
    expect(needsMoraleCheck(m(2, "necromancer"), null)).toBe(false);
    expect(needsMoraleCheck(m(1), { participantId: p.basicInfo.id })).toBe(false);
  });

  it("weaponPreview: бонус ближнього бою видно на мечі, але не на луку; оцінка з бонусом", () => {
    const base = createMockParticipant();

    const me = {
      ...base,
      basicInfo: { ...base.basicInfo, sourceType: "unit" as const },
      battleData: { ...base.battleData, resolvedAbilities: [ability({ key: "ea", name: "Експертна атака", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", damageKind: "melee", percent: 25 }] as ResolvedAbility["effects"] })] },
    };

    const sword = { name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

    const bow = { ...sword, name: "Лук", type: AttackType.RANGED };

    const s = weaponPreview(me, sword, [me]);

    expect(s.bonuses.map((b) => [b.label, b.percent])).toEqual([["Експертна атака", 25]]);
    expect(weaponPreview(me, bow, [me]).bonuses).toEqual([]);
    expect(s.estimate).toBeGreaterThan(weaponPreview({ ...me, battleData: { ...me.battleData, resolvedAbilities: [] } }, sword, [me]).estimate);
  });

  it("сторона з ParticipantSide лишається рядком", () => {
    expect(ParticipantSide.ALLY).toBe("ally");
    expect(AttackType.MELEE).toBeDefined();
  });
});
```

(Якщо `modifyStat`/`dealDamage` мають інші імена полів — звірити з `lib/utils/abilities/schema/effects.ts`. Расові ключі — звірити з `BATTLE_RACE` у `lib/constants/battle`.)

- [ ] **Step 2: Запустити — падають**

Run: `pnpm test:run lib/utils/battle/view`
Expected: FAIL — `turnQueue` is not exported.

- [ ] **Step 3: Реалізація**

`queue.ts`:

```ts
import type { BattleParticipant } from "@/types/battle";

export type QueueEntry =
  | { kind: "turn" | "extra"; participant: BattleParticipant; current: boolean; down: boolean }
  | { kind: "round"; round: number };

const isDown = (p: BattleParticipant) => p.combatStats.status !== "active" || p.combatStats.currentHp <= 0;

const item = (kind: "turn" | "extra", participant: BattleParticipant, current = false): QueueEntry => ({
  kind, participant, current, down: isDown(participant),
});

export function turnQueue(order: BattleParticipant[], turnIndex: number, round: number): QueueEntry[] {
  const current = order[turnIndex];

  const extraActive = current?.battleData.extraTurnActive === true;

  const extras = order.filter((p) => p !== current && p.actionFlags.hasExtraTurn && !isDown(p)).map((p) => item("extra", p));

  const rest = extraActive ? [item("extra", current, true)] : order.slice(turnIndex).map((p, i) => item("turn", p, i === 0));

  return [...rest, ...extras, { kind: "round", round: round + 1 }, ...order.map((p) => item("turn", p))];
}

export function turnsUntil(queue: QueueEntry[], myIds: string[]): number | null {
  let count = 0;

  for (const e of queue) {
    if (e.kind === "round") continue;

    if (myIds.includes(e.participant.basicInfo.id) && !e.down) return e.current ? 0 : count;

    if (!e.down) count += 1;
  }

  return null;
}
```

`hero.ts`:

```ts
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { AttackType as AttackTypeValue } from "@/lib/constants/battle";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { calculateDamageWithModifiersImpl } from "@/lib/utils/battle/damage/impl";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { BATTLE_RACE } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { getDiceSlots, mergeDiceFormulas } from "@/lib/utils/battle/balance/dice";
import type { AttackType } from "@/lib/constants/battle";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

export type SpellTier = "iron" | "bronze" | "silver" | "gold" | "mithril" | "platinum";

const TIERS: SpellTier[] = ["iron", "bronze", "silver", "gold", "mithril", "platinum"];

export const ROMAN = ["0", "I", "II", "III", "IV", "V"] as const;

export function spellTier(level: number): SpellTier {
  return TIERS[Math.max(0, Math.min(5, level))];
}

export function slotLevels(p: BattleParticipant): { level: 1 | 2 | 3 | 4 | 5; max: number; current: number }[] {
  return ([1, 2, 3, 4, 5] as const).map((level) => {
    const s = p.spellcasting?.spellSlots?.[String(level)];

    return { level, max: s?.max ?? 0, current: s?.current ?? 0 };
  });
}

export interface AbilityCharge {
  key: string;
  name: string;
  icon?: string | null;
  left: number;
  limit: number;
  per: "battle" | "round" | "turn";
}

export function abilityCharges(p: BattleParticipant): AbilityCharge[] {
  return (p.battleData.resolvedAbilities ?? []).flatMap((a) => {
    if (a.trigger.event !== "bonusAction" || !a.limits) return [];

    const per = a.limits.perBattle ? "battle" : a.limits.perRound ? "round" : a.limits.perTurn ? "turn" : null;

    if (!per) return [];

    const limit = (per === "battle" ? a.limits.perBattle : per === "round" ? a.limits.perRound : a.limits.perTurn) as number;

    const used = p.battleData.abilityUsage?.[a.key]?.[per] ?? 0;

    return [{ key: a.key, name: a.name, icon: a.source.icon ?? undefined, left: Math.max(0, limit - used), limit, per }];
  });
}

export function effectiveArmorClass(p: BattleParticipant, all: BattleParticipant[]): number {
  return statWithModifiers(withSelf(all, p), p.basicInfo.id, "armor", p.combatStats.armorClass);
}

const HOSTILE = new Set(["dealDamage", "dot", "applyCondition"]);

export function bonusTargetSide(a: ResolvedAbility): "ally" | "enemy" | null {
  const aimed = a.effects.filter((e) => "target" in e && e.target === "eventTarget");

  if (aimed.length === 0) return null;

  const hostile = aimed.some((e) =>
    HOSTILE.has(e.kind) || (("flat" in e && typeof e.flat === "number" && e.flat < 0) || ("percent" in e && typeof e.percent === "number" && e.percent < 0)),
  );

  return hostile ? "enemy" : "ally";
}

export function lastAction(log: BattleAction[]): BattleAction | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (log[i].actionType !== "end_turn") return log[i];
  }

  return null;
}

export function needsMoraleCheck(p: BattleParticipant, pendingMoraleCheck: unknown): boolean {
  if ((pendingMoraleCheck as { participantId?: string } | null)?.participantId === p.basicInfo.id) return false;

  const race = p.abilities.race?.toLowerCase() ?? "";

  if (race === BATTLE_RACE.NECROMANCER) return false;

  const morale = race === BATTLE_RACE.HUMAN && p.combatStats.morale < 0 ? 0 : p.combatStats.morale;

  return morale !== 0;
}

export function attackDamageFormula(p: BattleParticipant, attack: BattleAttack): string {
  const weapon = attack.damageDice ?? "";

  return p.basicInfo.sourceType === "character"
    ? mergeDiceFormulas(weapon, getHeroDamageDiceForLevel(p.abilities.level, attack.type as AttackType))
    : weapon;
}

export function weaponPreview(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]) {
  const type = (attack.type === "melee" ? AttackTypeValue.MELEE : AttackTypeValue.RANGED) as AttackType;

  const mods = collectModifiers(withSelf(all, p), p.basicInfo.id, { damage: { kind: attack.type === "melee" ? "melee" : "ranged" } });

  const bonuses = mods.entries.filter((e) => e.percent || e.flat).map((e) => ({ label: e.label, percent: e.percent, flat: e.flat, icon: e.icon }));

  const avg = Math.round(getDiceAverage(attackDamageFormula(p, attack) || "1d6"));

  const estimate = calculateDamageWithModifiersImpl(p, avg, getAttackAbilityModifier(p.abilities, type), type, { allParticipants: all }).totalDamage;

  return { bonuses, estimate };
}

export function damageDiceSlots(p: BattleParticipant, attack: BattleAttack): number[] {
  const slots = getDiceSlots(attackDamageFormula(p, attack) || "1d6").filter((s) => Number.isFinite(s) && s >= 1);

  return slots.length ? slots : [6];
}
```

(Якщо `flat` у `modifyStat` — об'єкт-формула, а не число, `typeof` уже це відсікає. Перевірити шлях `statWithModifiers`/`withSelf` — `lib/utils/abilities/engine/collect-modifiers.ts` / `participants.ts`.)

`index.ts` + `export * from "./queue"; export * from "./hero";`.

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/battle/view`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/view
git add lib/utils/battle/view
git commit -m "feat(battle): turn queue with morale extra turns, hero panel helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Фаза D — флоу на редʼюсерах

### Task 9: `attackFlow`

**Files:**
- Create: `lib/utils/battle/flows/attack-flow.ts`, `lib/utils/battle/flows/index.ts`
- Test: `lib/utils/battle/flows/__tests__/attack-flow.test.ts`

**Interfaces:**
- Produces:

```ts
export type AttackMode = "normal" | "advantage" | "disadvantage";
export type RollOutcome = "hit" | "crit" | "miss" | "critFail";
export interface Strike { targetId: string; d20?: number; second?: number; outcome?: RollOutcome; damage: number[] }
export interface AttackOutcomeSummary { kind: "miss" | "hit" | "crit"; targetId: string; damage: number; downed: boolean }
export interface AttackFlowState {
  step: "closed" | "weapon" | "target" | "roll" | "damage" | "summary" | "submitting" | "result";
  weaponCount: number;
  attackId?: string;
  maxTargets: number;
  diceSlots: number[];
  targetIds: string[];
  mode: AttackMode;
  strikes: Strike[];
  index: number;
  reactionDamage?: number;
  error?: string;
  results: AttackOutcomeSummary[];
}
export type AttackFlowAction =
  | { type: "OPEN"; weaponCount: number; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "SELECT_WEAPON"; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_MODE"; mode: AttackMode }
  | { type: "ROLL"; d20: number; second?: number; outcome: RollOutcome }
  | { type: "DAMAGE"; values: number[]; reactionDamage?: number }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; results: AttackOutcomeSummary[] }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };
export const initialAttackFlow: AttackFlowState;
export function attackFlow(s: AttackFlowState, a: AttackFlowAction): AttackFlowState;
export function attackPayload(s: AttackFlowState, attackerId: string): AttackData & { endTurn: boolean };
export function effectiveD20(strike: Strike, mode: AttackMode): number;
```

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { type AttackFlowAction, attackFlow, type AttackFlowState, attackPayload, initialAttackFlow } from "@/lib/utils/battle/flows";

const run = (...actions: AttackFlowAction[]) => actions.reduce<AttackFlowState>(attackFlow, initialAttackFlow);

const open = (weaponCount = 1, maxTargets = 1): AttackFlowAction => ({ type: "OPEN", weaponCount, attackId: "rapier", maxTargets, diceSlots: [8] });

describe("attackFlow", () => {
  it("одна зброя — одразу ціль; кілька — спершу зброя", () => {
    expect(run(open()).step).toBe("target");
    expect(run(open(3)).step).toBe("weapon");
    expect(run(open(3), { type: "SELECT_WEAPON", attackId: "bow", maxTargets: 2, diceSlots: [8] })).toMatchObject({ step: "target", attackId: "bow", maxTargets: 2 });
  });

  it("одна ціль — заміна; кілька — перемикання до максимуму", () => {
    expect(run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }).targetIds).toEqual(["b"]);

    const multi = run(open(1, 2), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "TOGGLE_TARGET", id: "c" });

    expect(multi.targetIds).toEqual(["a", "b"]);
    expect(attackFlow(multi, { type: "TOGGLE_TARGET", id: "a" }).targetIds).toEqual(["b"]);
  });

  it("без цілі далі не йде", () => {
    expect(run(open(), { type: "CONFIRM_TARGETS" }).step).toBe("target");
  });

  it("промах однієї цілі — одразу відправка, без кроку шкоди", () => {
    const s = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 3, outcome: "miss" });

    expect(s.step).toBe("submitting");
    expect(attackPayload(s, "me")).toEqual({ attackerId: "me", attackId: "rapier", targetIds: ["a"], attackRoll: 3, damageRolls: [], endTurn: false });
  });

  it("влучання → шкода → підсумок → відправка; payload з кидками", () => {
    const s = run(
      open(),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "CONFIRM_TARGETS" },
      { type: "SET_MODE", mode: "advantage" },
      { type: "ROLL", d20: 14, second: 6, outcome: "hit" },
      { type: "DAMAGE", values: [6], reactionDamage: 2 },
    );

    expect(s.step).toBe("summary");
    expect(attackPayload(s, "me")).toEqual({
      attackerId: "me", attackId: "rapier", targetIds: ["a"], attackRoll: 14, advantageRoll: 6, damageRolls: [6], reactionDamage: 2, endTurn: false,
    });
    expect(attackFlow(s, { type: "SUBMIT" }).step).toBe("submitting");
  });

  it("дві цілі: кидок на кожну; шкода лише для влучених; payload лише з влучених", () => {
    const s = run(
      open(1, 2),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "TOGGLE_TARGET", id: "b" },
      { type: "CONFIRM_TARGETS" },
      { type: "ROLL", d20: 4, outcome: "miss" },
    );

    expect(s).toMatchObject({ step: "roll", index: 1 });

    const t = run(
      open(1, 2), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "CONFIRM_TARGETS" },
      { type: "ROLL", d20: 4, outcome: "miss" }, { type: "ROLL", d20: 17, outcome: "hit" },
    );

    expect(t).toMatchObject({ step: "damage", index: 1 });

    const u = attackFlow(t, { type: "DAMAGE", values: [5] });

    expect(attackPayload(u, "me")).toEqual({ attackerId: "me", attackId: "rapier", targetIds: ["b"], attackRolls: [17], damageRolls: [5], endTurn: false });
  });

  it("BACK із підсумку — до шкоди, з кидка першої цілі — до вибору цілі", () => {
    const sum = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 14, outcome: "hit" }, { type: "DAMAGE", values: [6] });

    expect(attackFlow(sum, { type: "BACK" }).step).toBe("damage");
    expect(run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "BACK" }).step).toBe("target");
  });

  it("FAIL повертає на підсумок із помилкою й не губить кидки; SUCCESS → result; CLOSE → closed", () => {
    const sum = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 14, outcome: "hit" }, { type: "DAMAGE", values: [6] }, { type: "SUBMIT" });

    const failed = attackFlow(sum, { type: "FAIL", error: "Стан бою змінився" });

    expect(failed).toMatchObject({ step: "summary", error: "Стан бою змінився" });
    expect(failed.strikes[0].damage).toEqual([6]);

    const ok = attackFlow(sum, { type: "SUCCESS", results: [{ kind: "hit", targetId: "a", damage: 9, downed: false }] });

    expect(ok.step).toBe("result");
    expect(attackFlow(ok, { type: "CLOSE" })).toEqual(initialAttackFlow);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/battle/flows/__tests__/attack-flow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реалізація `attack-flow.ts`**

```ts
import type { AttackData } from "@/types/api";

export type AttackMode = "normal" | "advantage" | "disadvantage";

export type RollOutcome = "hit" | "crit" | "miss" | "critFail";

export interface Strike {
  targetId: string;
  d20?: number;
  second?: number;
  outcome?: RollOutcome;
  damage: number[];
}

export interface AttackOutcomeSummary {
  kind: "miss" | "hit" | "crit";
  targetId: string;
  damage: number;
  downed: boolean;
}

export interface AttackFlowState {
  step: "closed" | "weapon" | "target" | "roll" | "damage" | "summary" | "submitting" | "result";
  weaponCount: number;
  attackId?: string;
  maxTargets: number;
  diceSlots: number[];
  targetIds: string[];
  mode: AttackMode;
  strikes: Strike[];
  index: number;
  reactionDamage?: number;
  error?: string;
  results: AttackOutcomeSummary[];
}

export type AttackFlowAction =
  | { type: "OPEN"; weaponCount: number; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "SELECT_WEAPON"; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_MODE"; mode: AttackMode }
  | { type: "ROLL"; d20: number; second?: number; outcome: RollOutcome }
  | { type: "DAMAGE"; values: number[]; reactionDamage?: number }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; results: AttackOutcomeSummary[] }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialAttackFlow: AttackFlowState = {
  step: "closed", weaponCount: 0, maxTargets: 1, diceSlots: [], targetIds: [], mode: "normal", strikes: [], index: 0, results: [],
};

const isHit = (s: Strike) => s.outcome === "hit" || s.outcome === "crit";

const nextHit = (strikes: Strike[], from: number) => strikes.findIndex((s, i) => i >= from && isHit(s));

const prevHit = (strikes: Strike[], before: number) => {
  for (let i = before - 1; i >= 0; i -= 1) if (isHit(strikes[i])) return i;

  return -1;
};

export function attackFlow(s: AttackFlowState, a: AttackFlowAction): AttackFlowState {
  switch (a.type) {
    case "OPEN":
      return { ...initialAttackFlow, step: a.weaponCount > 1 ? "weapon" : "target", weaponCount: a.weaponCount, attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots };
    case "SELECT_WEAPON":
      return { ...s, step: "target", attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots, targetIds: s.targetIds.slice(0, a.maxTargets) };
    case "TOGGLE_TARGET": {
      if (s.maxTargets <= 1) return { ...s, targetIds: [a.id] };

      if (s.targetIds.includes(a.id)) return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id) };

      return s.targetIds.length >= s.maxTargets ? s : { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "CONFIRM_TARGETS":
      return s.targetIds.length === 0
        ? s
        : { ...s, step: "roll", index: 0, error: undefined, strikes: s.targetIds.map((targetId) => ({ targetId, damage: [] })) };
    case "SET_MODE":
      return { ...s, mode: a.mode };
    case "ROLL": {
      const strikes = s.strikes.map((st, i) => (i === s.index ? { ...st, d20: a.d20, second: a.second, outcome: a.outcome, damage: [] } : st));

      if (s.index + 1 < strikes.length) return { ...s, strikes, index: s.index + 1 };

      const first = nextHit(strikes, 0);

      return first === -1 ? { ...s, strikes, step: "submitting", error: undefined } : { ...s, strikes, step: "damage", index: first };
    }
    case "DAMAGE": {
      const strikes = s.strikes.map((st, i) => (i === s.index ? { ...st, damage: a.values } : st));

      const next = nextHit(strikes, s.index + 1);

      return next === -1
        ? { ...s, strikes, reactionDamage: a.reactionDamage ?? s.reactionDamage, step: "summary" }
        : { ...s, strikes, reactionDamage: a.reactionDamage ?? s.reactionDamage, index: next };
    }
    case "BACK": {
      if (s.step === "summary") return { ...s, step: "damage", index: prevHit(s.strikes, s.strikes.length), error: undefined };

      if (s.step === "damage") {
        const prev = prevHit(s.strikes, s.index);

        return prev === -1 ? { ...s, step: "roll", index: s.strikes.length - 1 } : { ...s, index: prev };
      }

      if (s.step === "roll") return s.index > 0 ? { ...s, index: s.index - 1 } : { ...s, step: "target" };

      if (s.step === "target" && s.weaponCount > 1) return { ...s, step: "weapon" };

      return s;
    }
    case "SUBMIT":
      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "SUCCESS":
      return { ...s, step: "result", results: a.results, error: undefined };
    case "FAIL":
      return { ...s, step: s.strikes.some(isHit) ? "summary" : "roll", index: s.strikes.some(isHit) ? s.index : s.strikes.length - 1, error: a.error };
    case "CLOSE":
      return initialAttackFlow;
  }
}

export function effectiveD20(strike: Strike, mode: AttackMode): number {
  const d = strike.d20 ?? 0;

  if (strike.second === undefined || mode === "normal") return d;

  return mode === "advantage" ? Math.max(d, strike.second) : Math.min(d, strike.second);
}

export function attackPayload(s: AttackFlowState, attackerId: string): AttackData & { endTurn: boolean } {
  const base = { attackerId, attackId: s.attackId, endTurn: false };

  if (s.strikes.length === 1) {
    const [st] = s.strikes;

    return {
      ...base,
      targetIds: [st.targetId],
      attackRoll: st.d20,
      ...(st.second !== undefined && s.mode === "advantage" && { advantageRoll: st.second }),
      ...(st.second !== undefined && s.mode === "disadvantage" && { disadvantageRoll: st.second }),
      damageRolls: isHit(st) ? st.damage : [],
      ...(isHit(st) && s.reactionDamage !== undefined && { reactionDamage: s.reactionDamage }),
    } as AttackData & { endTurn: boolean };
  }

  const hits = s.strikes.filter(isHit);

  const used = hits.length ? hits : s.strikes;

  return {
    ...base,
    targetIds: used.map((st) => st.targetId),
    attackRolls: used.map((st) => effectiveD20(st, s.mode)),
    damageRolls: hits.flatMap((st) => st.damage),
  } as AttackData & { endTurn: boolean };
}
```

`flows/index.ts`: `export * from "./attack-flow";`

(Тест «промах однієї цілі» очікує payload без `advantageRoll` і з `attackRoll: 3` — так і виходить. Ключ `attackId` у payload може бути `undefined` лише якщо `OPEN` не викликали — у тестах він завжди є.)

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/battle/flows`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/flows
git add lib/utils/battle/flows
git commit -m "feat(battle): attack wizard reducer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: `spellFlow`

**Files:**
- Create: `lib/utils/battle/flows/spell-flow.ts`; Modify: `lib/utils/battle/flows/index.ts`
- Test: `lib/utils/battle/flows/__tests__/spell-flow.test.ts`

**Interfaces:**
- Produces:

```ts
export type SpellTargetMode = "none" | "single" | "multi";
export interface SpellPick { spellId: string; level: number; targetMode: SpellTargetMode; needsHit: boolean; needsSaves: boolean; diceSlots: number[] }
export interface SpellFlowState {
  step: "closed" | "book" | "spell" | "targets" | "rolls" | "summary" | "submitting" | "result";
  casterId?: string;
  level: number;
  pick?: SpellPick;
  targetIds: string[];
  hitRoll?: number;
  saves: Record<string, number>;
  damage: (number | undefined)[];
  error?: string;
}
export type SpellFlowAction =
  | { type: "OPEN"; casterId: string; level: number }
  | { type: "SET_LEVEL"; level: number }
  | { type: "PICK"; pick: SpellPick }
  | { type: "TO_TARGETS" }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_HIT"; value: number }
  | { type: "SET_SAVE"; id: string; value: number }
  | { type: "SET_DAMAGE"; index: number; value: number }
  | { type: "TO_SUMMARY" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };
export const initialSpellFlow: SpellFlowState;
export function spellFlow(s: SpellFlowState, a: SpellFlowAction): SpellFlowState;
export function rollsComplete(s: SpellFlowState): boolean;
export function spellPayload(s: SpellFlowState, casterType: string): SpellCastData;
```

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { rollsComplete, spellFlow, type SpellFlowAction, type SpellFlowState, initialSpellFlow, spellPayload, type SpellPick } from "@/lib/utils/battle/flows";

const run = (...a: SpellFlowAction[]) => a.reduce<SpellFlowState>(spellFlow, initialSpellFlow);

const ray: SpellPick = { spellId: "ray", level: 2, targetMode: "single", needsHit: true, needsSaves: false, diceSlots: [6, 6] };

const cloud: SpellPick = { spellId: "cloud", level: 1, targetMode: "multi", needsHit: false, needsSaves: true, diceSlots: [8] };

const aura: SpellPick = { spellId: "aura", level: 3, targetMode: "none", needsHit: false, needsSaves: false, diceSlots: [] };

describe("spellFlow", () => {
  it("відкривається на сторінці кола; вибір спела → сторінка спела; TO_TARGETS → цілі", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray });

    expect(s).toMatchObject({ step: "spell", level: 2 });
    expect(spellFlow(s, { type: "TO_TARGETS" }).step).toBe("targets");
  });

  it("без цілей (aura) — одразу кидки, а без кубиків — підсумок", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 3 }, { type: "PICK", pick: aura }, { type: "TO_TARGETS" });

    expect(s.step).toBe("summary");
  });

  it("одна ціль — заміна, кілька — перемикання; підтвердження без цілі не проходить", () => {
    const one = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" });

    expect(one.targetIds).toEqual(["b"]);

    const many = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" });

    expect(many.targetIds).toEqual(["a", "b"]);
    expect(run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "CONFIRM_TARGETS" }).step).toBe("targets");
  });

  it("кидки: потрібні влучання й усі кубики; рятівні — необов'язкові", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" });

    expect(s.step).toBe("rolls");
    expect(rollsComplete(s)).toBe(false);

    const filled = [{ type: "SET_HIT", value: 15 }, { type: "SET_DAMAGE", index: 0, value: 4 }, { type: "SET_DAMAGE", index: 1, value: 6 }] as SpellFlowAction[];

    const done = filled.reduce(spellFlow, s);

    expect(rollsComplete(done)).toBe(true);
    expect(spellFlow(s, { type: "TO_SUMMARY" }).step).toBe("rolls");
    expect(spellFlow(done, { type: "TO_SUMMARY" }).step).toBe("summary");
    expect(spellPayload(done, "character")).toEqual({ casterId: "me", casterType: "character", spellId: "ray", targetIds: ["a"], damageRolls: [4, 6], hitRoll: 15 });
  });

  it("рятівні кидки потрапляють у payload; зняття цілі прибирає її кидок", () => {
    let s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "CONFIRM_TARGETS" });

    s = [{ type: "SET_SAVE", id: "a", value: 12 }, { type: "SET_SAVE", id: "b", value: 7 }, { type: "SET_DAMAGE", index: 0, value: 5 }].reduce(spellFlow, s as SpellFlowState);

    expect(spellPayload(s, "unit").savingThrows).toEqual([{ participantId: "a", roll: 12 }, { participantId: "b", roll: 7 }]);

    const back = spellFlow(spellFlow(s, { type: "BACK" }), { type: "TOGGLE_TARGET", id: "b" });

    expect(back.saves).toEqual({ a: 12 });
  });

  it("FAIL — на підсумок із помилкою; SET_LEVEL гортає книгу й скидає вибір", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 3 }, { type: "PICK", pick: aura }, { type: "TO_TARGETS" }, { type: "SUBMIT" }, { type: "FAIL", error: "x" });

    expect(s).toMatchObject({ step: "summary", error: "x" });

    const turned = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "SET_LEVEL", level: 4 });

    expect(turned).toMatchObject({ step: "book", level: 4, pick: undefined });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/battle/flows/__tests__/spell-flow.test.ts`
Expected: FAIL — `spellFlow` not exported.

- [ ] **Step 3: Реалізація `spell-flow.ts`**

```ts
import type { SpellCastData } from "@/types/api";

export type SpellTargetMode = "none" | "single" | "multi";

export interface SpellPick {
  spellId: string;
  level: number;
  targetMode: SpellTargetMode;
  needsHit: boolean;
  needsSaves: boolean;
  diceSlots: number[];
}

export interface SpellFlowState {
  step: "closed" | "book" | "spell" | "targets" | "rolls" | "summary" | "submitting" | "result";
  casterId?: string;
  level: number;
  pick?: SpellPick;
  targetIds: string[];
  hitRoll?: number;
  saves: Record<string, number>;
  damage: (number | undefined)[];
  error?: string;
}

export type SpellFlowAction =
  | { type: "OPEN"; casterId: string; level: number }
  | { type: "SET_LEVEL"; level: number }
  | { type: "PICK"; pick: SpellPick }
  | { type: "TO_TARGETS" }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_HIT"; value: number }
  | { type: "SET_SAVE"; id: string; value: number }
  | { type: "SET_DAMAGE"; index: number; value: number }
  | { type: "TO_SUMMARY" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialSpellFlow: SpellFlowState = { step: "closed", level: 0, targetIds: [], saves: {}, damage: [] };

const needsRolls = (p: SpellPick) => p.needsHit || p.needsSaves || p.diceSlots.length > 0;

export function rollsComplete(s: SpellFlowState): boolean {
  if (!s.pick) return false;

  if (s.pick.needsHit && !(s.hitRoll && s.hitRoll >= 1 && s.hitRoll <= 20)) return false;

  return s.pick.diceSlots.every((_, i) => typeof s.damage[i] === "number");
}

const afterTargets = (s: SpellFlowState): SpellFlowState =>
  s.pick && needsRolls(s.pick) ? { ...s, step: "rolls" } : { ...s, step: "summary" };

export function spellFlow(s: SpellFlowState, a: SpellFlowAction): SpellFlowState {
  switch (a.type) {
    case "OPEN":
      return { ...initialSpellFlow, step: "book", casterId: a.casterId, level: a.level };
    case "SET_LEVEL":
      return { ...initialSpellFlow, step: "book", casterId: s.casterId, level: a.level };
    case "PICK":
      return { ...s, step: "spell", pick: a.pick, targetIds: [], saves: {}, hitRoll: undefined, damage: a.pick.diceSlots.map(() => undefined), error: undefined };
    case "TO_TARGETS":
      if (!s.pick) return s;

      return s.pick.targetMode === "none" ? afterTargets(s) : { ...s, step: "targets" };
    case "TOGGLE_TARGET": {
      if (s.pick?.targetMode === "single") return { ...s, targetIds: [a.id], saves: {} };

      if (s.targetIds.includes(a.id)) {
        const { [a.id]: _gone, ...saves } = s.saves;

        void _gone;

        return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id), saves };
      }

      return { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "CONFIRM_TARGETS":
      return s.targetIds.length === 0 ? s : afterTargets(s);
    case "SET_HIT":
      return { ...s, hitRoll: a.value };
    case "SET_SAVE":
      return { ...s, saves: { ...s.saves, [a.id]: a.value } };
    case "SET_DAMAGE":
      return { ...s, damage: s.damage.map((v, i) => (i === a.index ? a.value : v)) };
    case "TO_SUMMARY":
      return rollsComplete(s) ? { ...s, step: "summary", error: undefined } : s;
    case "BACK": {
      const order: SpellFlowState["step"][] = ["book", "spell", "targets", "rolls", "summary"];

      let i = order.indexOf(s.step) - 1;

      if (order[i] === "rolls" && s.pick && !needsRolls(s.pick)) i -= 1;

      if (order[i] === "targets" && s.pick?.targetMode === "none") i -= 1;

      return i >= 0 ? { ...s, step: order[i], error: undefined } : s;
    }
    case "SUBMIT":
      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "SUCCESS":
      return { ...s, step: "result" };
    case "FAIL":
      return { ...s, step: "summary", error: a.error };
    case "CLOSE":
      return initialSpellFlow;
  }
}

export function spellPayload(s: SpellFlowState, casterType: string): SpellCastData {
  const saves = Object.entries(s.saves).map(([participantId, roll]) => ({ participantId, roll }));

  return {
    casterId: s.casterId as string,
    casterType,
    spellId: s.pick?.spellId as string,
    targetIds: s.pick?.targetMode === "none" ? [] : s.targetIds,
    damageRolls: s.damage.filter((v): v is number => typeof v === "number"),
    ...(saves.length > 0 && { savingThrows: saves }),
    ...(s.pick?.needsHit && s.hitRoll !== undefined && { hitRoll: s.hitRoll }),
  };
}
```

(У тесті з `BACK` із кроку `rolls` має вийти `targets`, тоді `TOGGLE_TARGET b` прибирає `b` і його рятівний кидок — що й перевіряється.)

`flows/index.ts` + `export * from "./spell-flow";`

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/battle/flows`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/flows
git add lib/utils/battle/flows
git commit -m "feat(battle): spellbook reducer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `turnFlow`

**Files:**
- Create: `lib/utils/battle/flows/turn-flow.ts`; Modify: `lib/utils/battle/flows/index.ts`
- Test: `lib/utils/battle/flows/__tests__/turn-flow.test.ts`

**Interfaces:**
- Produces:

```ts
export interface TurnFlowState { phase: "waiting" | "morale" | "acting" | "countdown" | "ended"; stayed: boolean; moraleResult?: "extra" | "skip" | "none" }
export type TurnFlowAction =
  | { type: "BEGIN"; needsMorale: boolean }
  | { type: "MORALE_RESULT"; result: "extra" | "skip" | "none" }
  | { type: "EXHAUSTED" }
  | { type: "STAY" }
  | { type: "END" };
export const initialTurnFlow: TurnFlowState;
export const COUNTDOWN_SECONDS = 5;
export function turnFlow(s: TurnFlowState, a: TurnFlowAction): TurnFlowState;
```

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { initialTurnFlow, turnFlow, type TurnFlowAction, type TurnFlowState } from "@/lib/utils/battle/flows";

const run = (...a: TurnFlowAction[]) => a.reduce<TurnFlowState>(turnFlow, initialTurnFlow);

describe("turnFlow", () => {
  it("BEGIN із моралью → morale; без → acting", () => {
    expect(run({ type: "BEGIN", needsMorale: true }).phase).toBe("morale");
    expect(run({ type: "BEGIN", needsMorale: false }).phase).toBe("acting");
  });

  it("паніка — хід закінчується; інші результати — до дій", () => {
    expect(run({ type: "BEGIN", needsMorale: true }, { type: "MORALE_RESULT", result: "skip" })).toMatchObject({ phase: "ended", moraleResult: "skip" });
    expect(run({ type: "BEGIN", needsMorale: true }, { type: "MORALE_RESULT", result: "extra" })).toMatchObject({ phase: "acting", moraleResult: "extra" });
  });

  it("дії вичерпано → відлік; «Залишитись» → дії, і повторне вичерпання відлік не запускає", () => {
    const c = run({ type: "BEGIN", needsMorale: false }, { type: "EXHAUSTED" });

    expect(c.phase).toBe("countdown");

    const stayed = turnFlow(c, { type: "STAY" });

    expect(stayed).toMatchObject({ phase: "acting", stayed: true });
    expect(turnFlow(stayed, { type: "EXHAUSTED" }).phase).toBe("acting");
  });

  it("EXHAUSTED поза діями ігнорується; END завжди закінчує", () => {
    expect(run({ type: "EXHAUSTED" }).phase).toBe("waiting");
    expect(run({ type: "BEGIN", needsMorale: false }, { type: "END" }).phase).toBe("ended");
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/battle/flows/__tests__/turn-flow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реалізація `turn-flow.ts`**

```ts
export interface TurnFlowState {
  phase: "waiting" | "morale" | "acting" | "countdown" | "ended";
  stayed: boolean;
  moraleResult?: "extra" | "skip" | "none";
}

export type TurnFlowAction =
  | { type: "BEGIN"; needsMorale: boolean }
  | { type: "MORALE_RESULT"; result: "extra" | "skip" | "none" }
  | { type: "EXHAUSTED" }
  | { type: "STAY" }
  | { type: "END" };

export const initialTurnFlow: TurnFlowState = { phase: "waiting", stayed: false };

export const COUNTDOWN_SECONDS = 5;

export function turnFlow(s: TurnFlowState, a: TurnFlowAction): TurnFlowState {
  switch (a.type) {
    case "BEGIN":
      return { phase: a.needsMorale ? "morale" : "acting", stayed: false };
    case "MORALE_RESULT":
      return s.phase === "morale" ? { ...s, phase: a.result === "skip" ? "ended" : "acting", moraleResult: a.result } : s;
    case "EXHAUSTED":
      return s.phase === "acting" && !s.stayed ? { ...s, phase: "countdown" } : s;
    case "STAY":
      return s.phase === "countdown" ? { ...s, phase: "acting", stayed: true } : s;
    case "END":
      return { ...s, phase: "ended" };
  }
}
```

`flows/index.ts` + `export * from "./turn-flow";`

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run lib/utils/battle/flows`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/flows
git add lib/utils/battle/flows
git commit -m "feat(battle): player turn reducer with countdown and stay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Фаза E — провайдер і хуки

### Task 12: `BattleSceneProvider`, `useBattleScene`, тост, серверна сторінка

**Files:**
- Create: `lib/hooks/common/useMediaQuery.ts`; Modify: `lib/hooks/common/useIsMobile.ts`, `lib/hooks/common/index.ts`
- Create: `lib/hooks/battle/useBattleToast.ts`, `lib/hooks/battle/useHpChange.ts`, `lib/hooks/battle/useBattleScene.ts`; Modify: `lib/hooks/battle/index.ts`
- Create: `components/battle/scene/BattleSceneProvider.tsx`
- Create: `app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx`; Modify: `app/campaigns/[id]/battles/[battleId]/page.tsx`
- Test: `lib/hooks/battle/__tests__/useBattleScene.test.tsx`, `lib/hooks/battle/__tests__/useHpChange.test.tsx`

**Interfaces:**
- Consumes: Task 4 хуки мутацій, Task 7–8 `view`.
- Produces:

```ts
// lib/hooks/common/useMediaQuery.ts
export function useMediaQuery(query: string, serverValue?: boolean): boolean;

// lib/hooks/battle/useBattleToast.ts
export interface BattleToastApi { message: string | null; show(message: string): void; dismiss(): void }
export function useBattleToast(): BattleToastApi;

// lib/hooks/battle/useHpChange.ts
export function useHpChange(hp: number): { delta: number; id: number } | null;

// lib/hooks/battle/useBattleScene.ts
export type ResultFx =
  | { kind: "hit" | "crit"; targetName: string; damage: number; downed: boolean; d20: number; total?: number; weapon?: string }
  | { kind: "miss"; targetName: string; d20: number; known: string }
  | { kind: "morale-extra" | "morale-skip"; name: string; d10: number; morale: number };
export interface BattleSceneValue {
  campaignId: string;
  battleId: string;
  battle: BattleScene;
  userId: string | null;
  isDM: boolean;
  viewer: Viewer;
  current: BattleParticipant | null;
  myParticipants: BattleParticipant[];
  hero: BattleParticipant | null;          // кого показувати в MyHeroPanel
  isMyTurn: boolean;
  queue: QueueEntry[];
  allies: BattleParticipant[];
  enemies: BattleParticipant[];
  connection: PusherConnectionState;
  dmControlledId: string | null;
  setDmControlledId(id: string | null): void;
  selectedId: string | null;
  select(id: string | null): void;
  toast: BattleToastApi;
  result: ResultFx | null;
  showResult(fx: ResultFx | null): void;
  readBattle(): BattleScene | undefined;   // свіжий знімок кешу після мутації
  actions: {
    nextTurn: ReturnType<typeof useNextTurn>;
    attack: ReturnType<typeof useAttack>;
    moraleCheck: ReturnType<typeof useMoraleCheck>;
    bonusAction: ReturnType<typeof useBonusAction>;
    castSpell: ReturnType<typeof useCastSpell>;
    start: ReturnType<typeof useStartBattle>;
    reset: ReturnType<typeof useResetBattle>;
    complete: ReturnType<typeof useCompleteBattle>;
    rollback: ReturnType<typeof useRollbackBattleAction>;
    addParticipant: ReturnType<typeof useAddBattleParticipant>;
    updateParticipant: ReturnType<typeof useUpdateBattleParticipant>;
  };
  anyPending: boolean;
}
export const BattleSceneContext: React.Context<BattleSceneValue | null>;
export function useBattleScene(): BattleSceneValue;   // кидає, якщо поза провайдером
export function useBattleSceneValue(campaignId: string, battleId: string, userId: string | null): { value: BattleSceneValue | null; loading: boolean };
export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null): { current: BattleParticipant | null; isMyTurn: boolean; myParticipants: BattleParticipant[]; hero: BattleParticipant | null };
```

- [ ] **Step 1: Тести, що падають**

`useBattleScene.test.tsx` — чиста частина `deriveTurn` (решта хука — проводка):

```tsx
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { deriveTurn } from "../useBattleScene";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleScene } from "@/types/api";

const p = (id: string, controlledBy: string, side = ParticipantSide.ALLY) => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, controlledBy, side } };
};

const battle = (turnIndex: number) =>
  ({ initiativeOrder: [p("gob", "dm", ParticipantSide.ENEMY), p("h1", "u1"), p("h2", "u1"), p("other", "u2")], currentTurnIndex: turnIndex }) as unknown as BattleScene;

describe("deriveTurn", () => {
  it("гравець з двома героями: hero — поточний, якщо це мій, інакше перший живий мій", () => {
    expect(deriveTurn(battle(2), "u1", false, null)).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "h2" } } });

    const waiting = deriveTurn(battle(0), "u1", false, null);

    expect(waiting.isMyTurn).toBe(false);
    expect(waiting.hero?.basicInfo.id).toBe("h1");
    expect(waiting.myParticipants.map((x) => x.basicInfo.id)).toEqual(["h1", "h2"]);
  });

  it("DM: хід ворога — його; взяв керування гравцем — його", () => {
    expect(deriveTurn(battle(0), "dm-user", true, null).isMyTurn).toBe(true);
    expect(deriveTurn(battle(3), "dm-user", true, null).isMyTurn).toBe(false);
    expect(deriveTurn(battle(3), "dm-user", true, "other")).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "other" } } });
  });
});
```

`useHpChange.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHpChange } from "../useHpChange";

describe("useHpChange", () => {
  it("на першому рендері нічого; при зміні — дельта і новий id", () => {
    const { result, rerender } = renderHook(({ hp }) => useHpChange(hp), { initialProps: { hp: 20 } });

    expect(result.current).toBeNull();

    rerender({ hp: 12 });

    expect(result.current).toEqual({ delta: -8, id: 1 });

    rerender({ hp: 20 });

    expect(result.current).toEqual({ delta: 8, id: 2 });
  });
});
```

- [ ] **Step 2: Запустити — падають**

Run: `pnpm test:run lib/hooks/battle/__tests__/useBattleScene.test.tsx lib/hooks/battle/__tests__/useHpChange.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: `useMediaQuery` і `useIsMobile` поверх нього**

```ts
import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);

      mql.addEventListener("change", onChange);

      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}
```

`useIsMobile.ts`:

```ts
import { useMediaQuery } from "./useMediaQuery";

export const MOBILE_QUERY = "(max-width: 639px)";

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
```

Барел: `export { useMediaQuery } from "./useMediaQuery";`.

- [ ] **Step 4: `useBattleToast` і `useHpChange`**

```ts
"use client";

import { useCallback, useRef, useState } from "react";

export interface BattleToastApi {
  message: string | null;
  show(message: string): void;
  dismiss(): void;
}

const TOAST_MS = 3_500;

export function useBattleToast(): BattleToastApi {
  const [message, setMessage] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    setMessage(null);
  }, []);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);

    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return { message, show, dismiss };
}
```

```ts
"use client";

import { useState } from "react";

export function useHpChange(hp: number): { delta: number; id: number } | null {
  const [prev, setPrev] = useState(hp);

  const [change, setChange] = useState<{ delta: number; id: number } | null>(null);

  if (hp !== prev) {
    setPrev(hp);
    setChange({ delta: hp - prev, id: (change?.id ?? 0) + 1 });
  }

  return change;
}
```

- [ ] **Step 5: `useBattleScene.ts`**

```ts
"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import { useBattleToast, type BattleToastApi } from "./useBattleToast";
import { type PusherConnectionState, usePusherBattleSync } from "./usePusherBattleSync";

import { ParticipantSide } from "@/lib/constants/battle";
import {
  useAddBattleParticipant, useAttack, useBattle, useBonusAction, useCastSpell, useCompleteBattle, useMoraleCheck, useNextTurn,
  useResetBattle, useRollbackBattleAction, useStartBattle, useUpdateBattleParticipant,
} from "@/lib/hooks/battles";
import { type QueueEntry, turnQueue, type Viewer } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

// … типи ResultFx і BattleSceneValue — як в Interfaces …

export const BattleSceneContext = createContext<BattleSceneValue | null>(null);

export function useBattleScene(): BattleSceneValue {
  const value = useContext(BattleSceneContext);

  if (!value) throw new Error("useBattleScene потребує BattleSceneProvider");

  return value;
}

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null) {
  const order = battle.initiativeOrder ?? [];

  const current = order[battle.currentTurnIndex] ?? null;

  const myParticipants = order.filter((p) => p.basicInfo.controlledBy === userId);

  const controls = (p: BattleParticipant) =>
    p.basicInfo.controlledBy === userId ||
    (isDM && (p.basicInfo.id === dmControlledId || p.basicInfo.controlledBy === "dm" || p.basicInfo.side === ParticipantSide.ENEMY));

  const isMyTurn = !!current && !!userId && controls(current);

  const dmHero = isDM && dmControlledId ? order.find((p) => p.basicInfo.id === dmControlledId) ?? null : null;

  const hero = (isMyTurn ? current : null) ?? dmHero ?? myParticipants.find(isUp) ?? myParticipants[0] ?? null;

  return { current, isMyTurn, myParticipants, hero };
}

function canSeeEnemyHpOf(hero: BattleParticipant | null): boolean {
  return (hero?.battleData.resolvedAbilities ?? []).some(
    (a) => /enemy hp|detect/i.test(a.name) || a.effects.some((e) => e.kind === "flag" && e.flag === "seeEnemyHp"),
  );
}

export function useBattleSceneValue(campaignId: string, battleId: string, userId: string | null) {
  const queryClient = useQueryClient();

  const toast = useBattleToast();

  const [dmControlledId, setDmControlledId] = useState<string | null>(null);

  const [selectedId, select] = useState<string | null>(null);

  const [result, showResult] = useState<ResultFx | null>(null);

  const onTurnStarted = useCallback((message: string) => {
    toast.show(message);
    document.title = "⚔ Твій хід";
    navigator.vibrate?.(200);
  }, [toast]);

  const { connectionState } = usePusherBattleSync(campaignId, battleId, userId, onTurnStarted);

  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pauseRefetchWhenPusherConnected: connectionState === "connected" });

  const onConflict = useCallback(() => toast.show("Стан бою змінився, повторіть дію"), [toast]);

  const o = { onConflict };

  const actions = {
    nextTurn: useNextTurn(campaignId, battleId, o),
    attack: useAttack(campaignId, battleId, o),
    moraleCheck: useMoraleCheck(campaignId, battleId, o),
    bonusAction: useBonusAction(campaignId, battleId, o),
    castSpell: useCastSpell(campaignId, battleId, o),
    start: useStartBattle(campaignId, battleId, o),
    reset: useResetBattle(campaignId, battleId, o),
    complete: useCompleteBattle(campaignId, battleId, o),
    rollback: useRollbackBattleAction(campaignId, battleId, o),
    addParticipant: useAddBattleParticipant(campaignId, battleId, o),
    updateParticipant: useUpdateBattleParticipant(campaignId, battleId, o),
  };

  const anyPending = Object.values(actions).some((m) => m.isPending);

  const readBattle = useCallback(
    () => queryClient.getQueryData<BattleScene>(["battle", campaignId, battleId]),
    [queryClient, campaignId, battleId],
  );

  const value = useMemo<BattleSceneValue | null>(() => {
    if (!battle) return null;

    const isDM = battle.isDM === true;

    const turn = deriveTurn(battle, userId, isDM, dmControlledId);

    const viewer: Viewer = { userId, isDM, canSeeEnemyHp: canSeeEnemyHpOf(turn.hero) };

    const order = battle.initiativeOrder ?? [];

    return {
      campaignId, battleId, battle, userId, isDM, viewer, ...turn,
      queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound) as QueueEntry[],
      allies: order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY),
      enemies: order.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY),
      connection: connectionState,
      dmControlledId, setDmControlledId, selectedId, select, toast, result, showResult, readBattle,
      actions, anyPending,
    };
    // actions — нові об'єкти useMutation на кожному рендері; провайдер і так перемальовується разом із ними
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle, userId, dmControlledId, connectionState, selectedId, toast, result, readBattle, anyPending, ...Object.values(actions)]);

  return { value, loading: isLoading };
}
```

(Якщо лінт не пропускає spread у deps — прибрати `useMemo` і будувати `value` напряму: провайдер перемальовується на кожну зміну кешу/мутації, а `memo` на `ParticipantRow` з вузькими пропсами (Task 15) тримає рендер дешевим. Перевірити, чи `useBattle` уже повертає `isLoading` — так, див. `useBattles.ts:40`. `createClient` імпорт тут не потрібен — `userId` приходить із сервера; прибрати рядок, якщо лінт скаржиться.)

`document.title` повертається при наступному не-моєму ході: у `BattlePageClient` ефект `useEffect(() => { if (!value?.isMyTurn) document.title = value?.battle.name ?? "Бій"; }, [value?.isMyTurn, value?.battle.name])`.

Барел `lib/hooks/battle/index.ts`: додати `useBattleScene`, `useBattleSceneValue`, `BattleSceneContext`, `deriveTurn`, `useBattleToast`, `useHpChange`, типи `BattleSceneValue`, `ResultFx`, `BattleToastApi`.

- [ ] **Step 6: Провайдер, клієнт сторінки, серверна сторінка**

`components/battle/scene/BattleSceneProvider.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";

export function BattleSceneProvider({ value, children }: { value: BattleSceneValue; children: ReactNode }) {
  return <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;
}
```

`BattlePageClient.tsx` (тимчасово рендерить стару розмітку сторінки — Task 21 замінить на `BattleScreen`):

```tsx
"use client";

import { BattleSceneProvider } from "@/components/battle/scene/BattleSceneProvider";
import { ErrorState, LoadingState } from "@/components/common/states";
import { useBattleSceneValue } from "@/lib/hooks/battle";

import LegacyBattlePage from "./LegacyBattlePage";

export function BattlePageClient({ campaignId, battleId, userId }: { campaignId: string; battleId: string; userId: string | null }) {
  const { value, loading } = useBattleSceneValue(campaignId, battleId, userId);

  if (loading) return <LoadingState label="Завантаження бою…" />;

  if (!value) return <ErrorState title="Бій не знайдено" />;

  return (
    <BattleSceneProvider value={value}>
      <LegacyBattlePage />
    </BattleSceneProvider>
  );
}
```

(Перевірити точні пропси `LoadingState`/`ErrorState`: `sed -n 1,40p components/common/states/*.tsx`.) Поточний `page.tsx` перейменувати на `LegacyBattlePage.tsx` (`git mv`), прибрати з нього `use(params)` і `useBattleSceneLogic`: брати `campaignId`, `battleId`, `battle`, `isDM` тощо з `useBattleScene()`, а мутації — з `actions` (тимчасовий міст до Task 21). Новий `page.tsx`:

```tsx
import { BattlePageClient } from "./BattlePageClient";

import { createClient } from "@/lib/supabase/server";

export default async function BattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  return <BattlePageClient campaignId={id} battleId={battleId} userId={(data?.claims?.sub as string | undefined) ?? null} />;
}
```

(Звірити з тим, як інші server components беруть користувача: `grep -rn "getClaims\|getUser" app/campaigns --include=page.tsx | head` — використати той самий виклик.)

- [ ] **Step 7: Тести, типи, лінт**

Run: `pnpm test:run lib/hooks && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Ручна перевірка, що сторінка живе**

Run: `pnpm dev`, відкрити існуючий активний бій (локальна БД — бій, який лишив `simulate-battle`, URL у його виводі). Перша компіляція > 10 с — чекати. Хід переходить, атака проходить, у Network немає GET `/battles/<id>` після дії.

- [ ] **Step 9: Commit**

```bash
pnpm lint --fix lib/hooks components/battle/scene app/campaigns
git add -A lib/hooks components/battle/scene app/campaigns
git commit -m "feat(battle): BattleSceneProvider with server-side user, battle toast

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Хуки майстрів — `useAttackWizard`, `useSpellBook`, `usePlayerTurn`

**Files:**
- Create: `lib/hooks/battle/useAttackWizard.ts`, `lib/hooks/battle/useSpellBook.ts`, `lib/hooks/battle/usePlayerTurn.ts`; Modify: `lib/hooks/battle/index.ts`
- Test: `lib/hooks/battle/__tests__/useAttackWizard.test.tsx`, `lib/hooks/battle/__tests__/usePlayerTurn.test.tsx`

**Interfaces:**
- Consumes: `useBattleScene` (Task 12), `attackFlow`/`spellFlow`/`turnFlow` (Tasks 9–11), `view` (Tasks 7–8), `predictAttackNumbers` (`@/lib/utils/battle/attack`), `resolveAttackRoll` (`@/lib/utils/battle/common/attack-roll-helpers`), `computeDamageBreakdown` (`@/lib/utils/battle/damage`), `useSpells` (`@/lib/hooks/spells`).
- Produces:

```ts
export function rollDie(sides: number): number;   // crypto.getRandomValues
export function useAttackWizard(attacker: BattleParticipant | null, onDone?: () => void): {
  state: AttackFlowState;
  attack: BattleAttack | null;
  attacks: BattleAttack[];
  targets: BattleParticipant[];          // живі вороги (+ союзники, якщо friendlyFire)
  steps: DamageStep[][];                  // для підсумку, по влучених ударах, уже з прихованими кроками цілі
  estimate: number;                       // сума after останніх кроків
  unknownDefense: boolean;                // є влучені вороги з прихованим захистом
  previews: Record<string, { bonuses: { label: string; percent: number; flat: number; icon?: string | null }[]; estimate: number }>;
  open(): void; selectWeapon(a: BattleAttack): void; toggleTarget(id: string): void; confirmTargets(): void;
  setMode(m: AttackMode): void; roll(d20: number, second?: number): void; aiRoll(): void;
  damage(values: number[], reaction?: number): void; back(): void; submit(): void; close(): void;
};
export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void }): {
  state: SpellFlowState;
  spells: BookSpell[];                    // заклинання кастера з кешу useSpells
  byLevel: Record<number, BookSpell[]>;
  slots: { level: number; current: number; max: number }[];
  selected: BookSpell | null;
  targets: BattleParticipant[];
  open(level?: number, casterOverride?: BattleParticipant): void; setLevel(level: number): void; pick(spell: BookSpell): void; toTargets(): void;
  toggleTarget(id: string): void; confirmTargets(): void; setHit(v: number): void; setSave(id: string, v: number): void;
  setDamage(i: number, v: number): void; toSummary(): void; back(): void; submit(): void; close(): void;
};
export type BookSpell = { id: string; name: string; level: number; type: "target" | "aoe" | "no_target"; damageType: "damage" | "heal" | "all";
  diceCount?: number | null; diceType?: string | null; savingThrow?: { ability: string; onSuccess: "half" | "none"; dc?: number } | null;
  hitCheck?: { ability: string; dc: number } | null; description?: string | null; icon?: string | null; range?: string | null;
  duration?: string | null; concentration?: boolean; damageElement?: string | null; spellGroup?: { id: string; name: string } | null };
export function usePlayerTurn(participant: BattleParticipant): {
  phase: TurnFlowState["phase"];
  actionUsed: boolean;
  bonusAvailable: boolean;
  afterAction(): void;                    // викликати після успішної дії — може запустити відлік
  rollMorale(d10: number): Promise<void>;
  stay(): void;
  endTurn(): Promise<void>;               // з useConfirm, якщо дія не використана
};
```

- [ ] **Step 1: Тест `useAttackWizard` (падає)**

Рендер хука всередині `BattleSceneContext.Provider` з мінімальним фейковим `value` (лише поля, які хук читає) і моком `actions.attack.mutateAsync`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BattleSceneContext, type BattleSceneValue } from "../useBattleScene";
import { useAttackWizard } from "../useAttackWizard";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleScene } from "@/types/api";

function participant(id: string, side: ParticipantSide, hp = 20, ac = 12) {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, side, sourceType: "unit" as const },
    combatStats: { ...b.combatStats, currentHp: hp, maxHp: 20, armorClass: ac, status: "active" as const },
    battleData: { ...b.battleData, attacks: [{ id: "rapier", name: "Рапіра", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
  };
}

function setup() {
  const me = participant("me", ParticipantSide.ALLY);

  const gob = participant("gob", ParticipantSide.ENEMY);

  const battle = { initiativeOrder: [me, gob], battleLog: [], campaign: { friendlyFire: false } } as unknown as BattleScene;

  const after = { ...battle, initiativeOrder: [me, { ...gob, combatStats: { ...gob.combatStats, currentHp: 11 } }] } as BattleScene;

  const mutateAsync = vi.fn(async () => undefined);

  const showResult = vi.fn();

  const value = {
    battle, viewer: { userId: "u", isDM: false, canSeeEnemyHp: false },
    actions: { attack: { mutateAsync, isPending: false } },
    readBattle: () => after, showResult, toast: { show: vi.fn() },
  } as unknown as BattleSceneValue;

  const wrapper = ({ children }: { children: ReactNode }) => <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;

  return { me, wrapper, mutateAsync, showResult };
}

describe("useAttackWizard", () => {
  it("одна зброя: ціль → кидок (влучання за AC) → шкода → підсумок → відправка → результат", async () => {
    const { me, wrapper, mutateAsync, showResult } = setup();

    const onDone = vi.fn();

    const { result } = renderHook(() => useAttackWizard(me, onDone), { wrapper });

    act(() => result.current.open());
    expect(result.current.state.step).toBe("target");

    act(() => result.current.toggleTarget("gob"));
    act(() => result.current.confirmTargets());
    act(() => result.current.roll(14));
    expect(result.current.state.step).toBe("damage");

    act(() => result.current.damage([6]));
    expect(result.current.state.step).toBe("summary");
    expect(result.current.steps[0].some((s) => s.side === "target")).toBe(false);

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.step).toBe("result"));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetIds: ["gob"], attackRoll: 14, damageRolls: [6] }));
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 9, downed: false }));
    expect(onDone).toHaveBeenCalled();
  });

  it("промах — відправка одразу, результат «miss»", async () => {
    const { me, wrapper, mutateAsync, showResult } = setup();

    const { result } = renderHook(() => useAttackWizard(me), { wrapper });

    act(() => result.current.open());
    act(() => result.current.toggleTarget("gob"));
    act(() => result.current.confirmTargets());
    act(() => result.current.roll(2));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "miss" })));
  });

  it("помилка мутації — підсумок із текстом помилки, повторний сабміт можливий", async () => {
    const { me, wrapper, mutateAsync } = setup();

    mutateAsync.mockRejectedValueOnce(new Error("Стан бою змінився"));

    const { result } = renderHook(() => useAttackWizard(me), { wrapper });

    act(() => result.current.open());
    act(() => result.current.toggleTarget("gob"));
    act(() => result.current.confirmTargets());
    act(() => result.current.roll(14));
    act(() => result.current.damage([6]));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state).toMatchObject({ step: "summary", error: "Стан бою змінився" }));
  });
});
```

(Для «влучання за AC» у моку `predictAttackNumbers` дає 14 + бонус ≥ 12 → `hit`; 2 + бонус < 12 → `miss`. Якщо бонус мок-учасника інший, підібрати кидки так, щоб перший влучав, другий ні.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/hooks/battle/__tests__/useAttackWizard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: `useAttackWizard.ts`**

```ts
"use client";

import { useEffectEvent, useEffect, useMemo, useReducer } from "react";

import { useBattleScene } from "./useBattleScene";

import { predictAttackNumbers } from "@/lib/utils/battle/attack";
import { resolveAttackRoll } from "@/lib/utils/battle/common/attack-roll-helpers";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { attackFlow, type AttackMode, attackPayload, effectiveD20, initialAttackFlow, type RollOutcome } from "@/lib/utils/battle/flows";
import { canSeeExactStats, damageDiceSlots, formatKnownArmorClass, hiddenTargetSteps, knownArmorClass, weaponPreview } from "@/lib/utils/battle/view";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);

  crypto.getRandomValues(buf);

  return (buf[0] % sides) + 1;
}

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function useAttackWizard(attacker: BattleParticipant | null, onDone?: () => void) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(attackFlow, initialAttackFlow);

  const order = scene.battle.initiativeOrder;

  const attacks = attacker?.battleData.attacks ?? [];

  const attack = attacks.find((a) => (a.id ?? a.name) === state.attackId) ?? null;

  const targets = order.filter(
    (p) => isUp(p) && p !== attacker && (p.basicInfo.side !== attacker?.basicInfo.side || scene.battle.campaign?.friendlyFire === true),
  );

  const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

  const steps = useMemo<DamageStep[][]>(() => {
    if (!attacker || !attack || state.step !== "summary") return [];

    return state.strikes
      .filter((s) => s.outcome === "hit" || s.outcome === "crit")
      .map((s) => {
        const target = byId(s.targetId);

        if (!target) return [];

        const full = computeDamageBreakdown({ attacker, target, attack, damageRolls: s.damage, allParticipants: order, isCritical: s.outcome === "crit" }).steps;

        return hiddenTargetSteps(full, s.targetId, scene.battle.battleLog ?? [], canSeeExactStats(target, scene.viewer));
      });
    // byId читає order, який уже в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, state.step, state.strikes, order, scene.battle.battleLog, scene.viewer]);

  const estimate = steps.reduce((sum, list) => sum + (list.at(-1)?.after ?? 0), 0);

  const previews = useMemo(
    () => (attacker ? Object.fromEntries(attacks.map((a) => [a.id ?? a.name, weaponPreview(attacker, a, order)])) : {}),
    [attacker, attacks, order],
  );

  const unknownDefense = state.strikes.some((s) => {
    const t = byId(s.targetId);

    return (s.outcome === "hit" || s.outcome === "crit") && !!t && !canSeeExactStats(t, scene.viewer);
  });

  const describe = (a: BattleAttack) => ({ attackId: a.id ?? a.name, maxTargets: Math.max(1, a.maxTargets ?? attacker?.combatStats.maxTargets ?? 1), diceSlots: attacker ? damageDiceSlots(attacker, a) : [6] });

  const outcomeOf = (d20: number, second?: number): RollOutcome => {
    const target = byId(state.strikes[state.index]?.targetId ?? "");

    if (!attacker || !attack || !target) return "miss";

    const { totalBonus, targetAC } = predictAttackNumbers(attacker, target, attack, order);

    const r = resolveAttackRoll(
      { attackRoll: d20, ...(state.mode === "advantage" && second !== undefined && { advantageRoll: second }), ...(state.mode === "disadvantage" && second !== undefined && { disadvantageRoll: second }) },
      targetAC,
      totalBonus,
    );

    return r.crit ? "crit" : r.critFail ? "critFail" : r.hit ? "hit" : "miss";
  };

  const send = useEffectEvent(async () => {
    if (!attacker) return;

    const before = new Map(order.map((p) => [p.basicInfo.id, p.combatStats.currentHp]));

    try {
      await scene.actions.attack.mutateAsync(attackPayload(state, attacker.basicInfo.id));

      const after = scene.readBattle()?.initiativeOrder ?? order;

      const results = state.strikes.map((s) => {
        const now = after.find((p) => p.basicInfo.id === s.targetId);

        const hit = s.outcome === "hit" || s.outcome === "crit";

        return {
          kind: (s.outcome === "crit" ? "crit" : hit ? "hit" : "miss") as "crit" | "hit" | "miss",
          targetId: s.targetId,
          damage: Math.max(0, (before.get(s.targetId) ?? 0) - (now?.combatStats.currentHp ?? 0)),
          downed: !!now && !isUp(now),
        };
      });

      dispatch({ type: "SUCCESS", results });

      const first = results[0];

      const strike = state.strikes[0];

      const target = byId(first.targetId);

      if (first.kind === "miss") {
        const log = scene.readBattle()?.battleLog ?? [];

        scene.showResult({ kind: "miss", targetName: target?.basicInfo.name ?? "", d20: effectiveD20(strike, state.mode), known: formatKnownArmorClass(knownArmorClass(log, first.targetId)) });
      } else {
        scene.showResult({ kind: first.kind, targetName: target?.basicInfo.name ?? "", damage: results.reduce((s, r) => s + r.damage, 0), downed: first.downed, d20: effectiveD20(strike, state.mode), weapon: attack?.name });
      }

      onDone?.();
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося виконати атаку" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  return {
    state, attack, attacks, targets, steps, estimate, unknownDefense, previews,
    open: () => {
      const first = attacks[0];

      if (first) dispatch({ type: "OPEN", weaponCount: attacks.length, ...describe(first) });
    },
    selectWeapon: (a: BattleAttack) => dispatch({ type: "SELECT_WEAPON", ...describe(a) }),
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
    setMode: (mode: AttackMode) => dispatch({ type: "SET_MODE", mode }),
    roll: (d20: number, second?: number) => dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) }),
    aiRoll: () => {
      const d20 = rollDie(20);

      const second = state.mode === "normal" ? undefined : rollDie(20);

      dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) });
    },
    damage: (values: number[], reaction?: number) => dispatch({ type: "DAMAGE", values, reactionDamage: reaction }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
```

(`useEffectEvent` — стабільний у React 19.2; якщо лінт плагін у репо його не знає — замінити на `useRef`-ref на `send`, який оновлюється в `useLayoutEffect`. `outcomeOf` і `send` читають актуальний `state` з рендера, де їх викликано.)

- [ ] **Step 4: Тест зелений**

Run: `pnpm test:run lib/hooks/battle/__tests__/useAttackWizard.test.tsx`
Expected: PASS.

- [ ] **Step 5: `useSpellBook.ts`**

```ts
"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { rollDie } from "./useAttackWizard";
import { useBattleScene } from "./useBattleScene";

import { useSpells } from "@/lib/hooks/spells";
import { getDiceSlots } from "@/lib/utils/battle/balance/dice";
import { initialSpellFlow, type SpellPick, spellFlow, spellPayload } from "@/lib/utils/battle/flows";
import { participantSpellAllowsMultipleTargets } from "@/lib/utils/battle/spell/participant-spell-target-mode";
import { slotLevels } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

// export type BookSpell = … (див. Interfaces)

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const { data = [] } = useSpells(scene.campaignId, { enabled: state.step !== "closed" && !!caster });

  const spells = useMemo(() => {
    const all = data as BookSpell[];

    if (options.allSpells) return all;

    const known = new Set(caster?.spellcasting.knownSpells ?? []);

    return all.filter((s) => known.has(s.id));
  }, [data, options.allSpells, caster]);

  const byLevel = useMemo(() => {
    const map: Record<number, BookSpell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    for (const s of spells) (map[s.level] ??= []).push(s);

    for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

    return map;
  }, [spells]);

  const selected = spells.find((s) => s.id === state.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const targets = order.filter((p) => isUp(p) || selected?.damageType === "heal");

  const pickOf = (s: BookSpell): SpellPick => ({
    spellId: s.id,
    level: s.level,
    targetMode: s.type === "no_target" ? "none" : s.type === "aoe" || (caster && participantSpellAllowsMultipleTargets(caster, s.id)) ? "multi" : "single",
    needsHit: !!s.hitCheck,
    needsSaves: !!s.savingThrow,
    diceSlots: s.diceCount && s.diceType ? getDiceSlots(`${s.diceCount}${s.diceType}`) : [],
  });

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      await scene.actions.castSpell.mutateAsync(spellPayload(state, caster.basicInfo.sourceType));
      dispatch({ type: "SUCCESS" });
      options.onDone?.();
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося застосувати заклинання" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  return {
    state, spells, byLevel, selected, targets, slots: caster ? slotLevels(caster) : [],
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who) });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => dispatch({ type: "PICK", pick: pickOf(s) }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
    setHit: (v: number) => dispatch({ type: "SET_HIT", value: v }),
    aiHit: () => dispatch({ type: "SET_HIT", value: rollDie(20) }),
    setSave: (id: string, v: number) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
```

(Перевірити сигнатуру `useSpells(campaignId, { enabled })` у `lib/hooks/spells` — так використовує поточний `useSpellDialog`. Поля `range`, `duration`, `concentration`, `damageElement` — є в `Spell`; якщо `GET /spells` їх не повертає — показувати лише наявні.)

- [ ] **Step 6: Тест `usePlayerTurn` (падає)**

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BattleSceneContext, type BattleSceneValue } from "../useBattleScene";
import { usePlayerTurn } from "../usePlayerTurn";

import { ConfirmContext } from "@/lib/hooks/common";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleScene } from "@/types/api";

function setup(morale = 0, confirmAnswer = true) {
  const b = createMockParticipant();

  const me = { ...b, combatStats: { ...b.combatStats, morale }, actionFlags: { ...b.actionFlags, hasUsedAction: false } };

  const used = { ...me, actionFlags: { ...me.actionFlags, hasUsedAction: true, hasUsedBonusAction: true } };

  const nextTurn = vi.fn(async () => undefined);

  const moraleCheck = vi.fn(async () => ({ moraleResult: { hasExtraTurn: true, shouldSkipTurn: false, moralePositive: true, message: "" } }));

  const showResult = vi.fn();

  const confirm = vi.fn(async () => confirmAnswer);

  const value = {
    battle: { initiativeOrder: [me], pendingMoraleCheck: null } as unknown as BattleScene,
    actions: { nextTurn: { mutateAsync: nextTurn, isPending: false }, moraleCheck: { mutateAsync: moraleCheck, isPending: false } },
    readBattle: () => ({ initiativeOrder: [used] }) as unknown as BattleScene,
    showResult, anyPending: false,
  } as unknown as BattleSceneValue;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirm}>
      <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>
    </ConfirmContext.Provider>
  );

  return { me, wrapper, nextTurn, moraleCheck, showResult, confirm };
}

describe("usePlayerTurn", () => {
  it("мораль ≠ 0 — фаза morale; результат «додатковий хід» → оверлей і дії", async () => {
    const { me, wrapper, moraleCheck, showResult } = setup(2);

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    expect(result.current.phase).toBe("morale");

    await act(async () => result.current.rollMorale(9));

    expect(moraleCheck).toHaveBeenCalledWith({ participantId: me.basicInfo.id, d10Roll: 9 });
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "morale-extra", d10: 9 }));
    expect(result.current.phase).toBe("acting");
  });

  it("після вичерпаної дії — відлік; «Залишитись» — назад до дій", () => {
    const { me, wrapper } = setup();

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    act(() => result.current.afterAction());
    expect(result.current.phase).toBe("countdown");

    act(() => result.current.stay());
    expect(result.current.phase).toBe("acting");
  });

  it("«Завершити хід» з невикористаною дією питає підтвердження; «ні» — хід триває", async () => {
    const { me, wrapper, nextTurn, confirm } = setup(0, false);

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    await act(async () => result.current.endTurn());

    expect(confirm).toHaveBeenCalled();
    expect(nextTurn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: `usePlayerTurn.ts`**

```ts
"use client";

import { useReducer } from "react";

import { useBattleScene } from "./useBattleScene";

import { useConfirm } from "@/lib/hooks/common";
import { initialTurnFlow, turnFlow } from "@/lib/utils/battle/flows";
import { needsMoraleCheck } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const MORALE_SKIP_MS = 4_000;

const exhausted = (p: BattleParticipant) => {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !bonusLeft;
};

export function usePlayerTurn(participant: BattleParticipant) {
  const scene = useBattleScene();

  const confirm = useConfirm();

  const [state, dispatch] = useReducer(turnFlow, initialTurnFlow, (s) =>
    turnFlow(s, { type: "BEGIN", needsMorale: needsMoraleCheck(participant, scene.battle.pendingMoraleCheck) }),
  );

  const id = participant.basicInfo.id;

  const fresh = () => scene.readBattle()?.initiativeOrder.find((p) => p.basicInfo.id === id) ?? participant;

  const endTurn = async () => {
    if (!participant.actionFlags.hasUsedAction) {
      const ok = await confirm({ title: "Завершити хід?", description: "Дію ще не використано.", confirmLabel: "Завершити" });

      if (!ok) return;
    }

    dispatch({ type: "END" });
    await scene.actions.nextTurn.mutateAsync({});
  };

  return {
    phase: state.phase,
    actionUsed: participant.actionFlags.hasUsedAction,
    bonusAvailable: !participant.actionFlags.hasUsedBonusAction,
    afterAction: () => {
      if (exhausted(fresh())) dispatch({ type: "EXHAUSTED" });
    },
    rollMorale: async (d10: number) => {
      const res = await scene.actions.moraleCheck.mutateAsync({ participantId: id, d10Roll: d10 });

      const r = res?.moraleResult;

      const result = r?.hasExtraTurn ? "extra" : r?.shouldSkipTurn ? "skip" : "none";

      dispatch({ type: "MORALE_RESULT", result });

      const base = { name: participant.basicInfo.name, d10, morale: participant.combatStats.morale };

      if (result === "extra") scene.showResult({ kind: "morale-extra", ...base });
      else if (result === "skip") {
        scene.showResult({ kind: "morale-skip", ...base });
        setTimeout(() => void scene.actions.nextTurn.mutateAsync({}), MORALE_SKIP_MS);
      }
      else scene.toast.show(`${participant.basicInfo.name} · мораль: без змін (d10 = ${d10})`);
    },
    stay: () => dispatch({ type: "STAY" }),
    endTurn,
  };
}
```

(Поля `ConfirmOptions` — звірити з `lib/hooks/common/confirm-context.ts`: `title`, `description?`, `confirmLabel?`, `cancelLabel?`. Відлік викликає `endTurn` через `TurnCountdown.onElapsed` — підтвердження не з'являється, бо дія вже використана. Паніка переводить хід сама через 4 с — синхронно з оверлеєм `morale-skip`.)

- [ ] **Step 8: Тести зелені**

Run: `pnpm test:run lib/hooks/battle`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm lint --fix lib/hooks/battle
git add lib/hooks/battle
git commit -m "feat(battle): attack wizard, spellbook and player turn hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Фаза F — UI

Загальне для задач 14–21: компоненти читають сцену через `useBattleScene()` з `@/lib/hooks/battle`; `@/lib/api/*` не імпортуються; кожен файл — один компонент; без коментарів, що переказують код. Після кожної задачі — `pnpm lint --fix components/battle app/campaigns && pnpm exec tsc --noEmit`.

### Task 14: Тема, шрифти, примітиви HUD

**Files:**
- Create: `components/battle/hud/theme.ts`, `components/battle/hud/fonts.ts`, `components/battle/hud/battle-hud.css`
- Create: `components/battle/hud/Portrait.tsx`, `EffectChip.tsx`, `HealthBar.tsx`, `SlotGrid.tsx`, `index.ts`
- Test: `components/battle/hud/__tests__/hud-primitives.test.tsx`

**Interfaces:**
- Consumes: `view` (Tasks 7–8).
- Produces: `SIDE_COLOR`; `hudFontClassName: string`; `<Portrait participant size? current? me? extra? />`; `<EffectChip effect />`; `<EffectLine effects max? />`; `<HealthBar participant exact />`; `<SlotGrid participant />`; CSS-класи `battle-hud`, `hud-sc`, `metal-<tier>`, keyframes `hud-*`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EffectLine, HealthBar, SlotGrid } from "@/components/battle/hud";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect } from "@/types/battle";

const fx = (name: string, type: ActiveEffect["type"], duration = 2): ActiveEffect =>
  ({ id: name, name, type, duration, appliedAt: { round: 1, timestamp: new Date() }, effects: [] }) as ActiveEffect;

describe("примітиви HUD", () => {
  it("ефекти: два показано, решта — +N; раунди поруч з назвою", () => {
    render(<EffectLine effects={[fx("Отрута", "debuff"), fx("Щит віри", "buff", 1), fx("Лють", "buff", 3)]} />);

    expect(screen.getByText("Отрута")).toBeTruthy();
    expect(screen.getByText("Щит віри")).toBeTruthy();
    expect(screen.queryByText("Лють")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("HP ворога без точних чисел — стан словом, без «/»", () => {
    const b = createMockParticipant();

    const enemy = { ...b, basicInfo: { ...b.basicInfo, side: ParticipantSide.ENEMY }, combatStats: { ...b.combatStats, currentHp: 9, maxHp: 40 } };

    const { container } = render(<HealthBar participant={enemy} exact={false} />);

    expect(screen.getByText("при смерті")).toBeTruthy();
    expect(container.textContent).not.toContain("/");
  });

  it("слоти: п'ять кіл римськими, порожнє коло — без кристалів", () => {
    const b = createMockParticipant();

    render(<SlotGrid participant={{ ...b, spellcasting: { ...b.spellcasting, spellSlots: { "1": { max: 3, current: 2 } } } }} />);

    for (const r of ["I", "II", "III", "IV", "V"]) expect(screen.getByText(r)).toBeTruthy();
    expect(screen.getByLabelText("I коло: 2 з 3")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/hud`
Expected: FAIL — module not found.

- [ ] **Step 3: Тема і шрифти**

`theme.ts`:

```ts
import type { SpellTier } from "@/lib/utils/battle/view";

export const SIDE_COLOR = { ally: "#6f8fb0", enemy: "#9c2a1d" } as const;

export const metalClass = (tier: SpellTier) => `metal-${tier}`;
```

`fonts.ts`:

```ts
import { Alegreya_SC, Alegreya_Sans, EB_Garamond } from "next/font/google";

const sc = Alegreya_SC({ subsets: ["latin", "cyrillic"], weight: ["500", "700", "800"], variable: "--font-hud-sc", display: "swap" });

const sans = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-hud-sans", display: "swap" });

const book = EB_Garamond({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-hud-book", display: "swap" });

export const hudFontClassName = `${sc.variable} ${sans.variable} ${book.variable}`;
```

`battle-hud.css` (глобальний, імпортується в `BattlePageClient`):

```css
.battle-hud {
  --ally: #6f8fb0;
  --enemy: #9c2a1d;
  --bone: #e6dccb;
  --ink: #efe5d2;
  --muted: #8f8473;
  --gold: #c9b37a;
  position: relative;
  color: var(--bone);
  background: #0b0908 url("/screen-bg/battle-bg.jpg") center 70% / cover;
  font-family: var(--font-hud-sans), system-ui, sans-serif;
  font-variant-numeric: tabular-nums lining-nums;
}

.battle-hud::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(8, 6, 5, 0.94) 0, rgba(8, 6, 5, 0.6) 30%, rgba(8, 6, 5, 0.72) 60%, rgba(8, 6, 5, 0.97) 80%);
}

.battle-hud > * { position: relative; }

.hud-sc { font-family: var(--font-hud-sc), serif; letter-spacing: 0.04em; }

.hud-book { font-family: var(--font-hud-book), serif; }

.metal-iron { --m1: #5d5f63; --m2: #8a8d92; --mt: #eeeeee; }
.metal-bronze { --m1: #6e3f1c; --m2: #b07842; --mt: #fbe3c6; }
.metal-silver { --m1: #6d7177; --m2: #c9ced6; --mt: #1d2026; }
.metal-gold { --m1: #8a6414; --m2: #e6c25a; --mt: #2a1d05; }
.metal-mithril { --m1: #2f5a74; --m2: #8fd0e8; --mt: #06202c; }
.metal-platinum { --m1: #9aa0ab; --m2: #ffffff; --mt: #2b2f3a; }

.metal-fill { background: linear-gradient(135deg, var(--m1), var(--m2) 55%, var(--m1)); color: var(--mt); }
.metal-platinum.metal-fill {
  background: linear-gradient(120deg, #9aa0ab, #fff 35%, #d9e6ff 50%, #fff 62%, #9aa0ab);
  background-size: 200% 100%;
  animation: hud-glint 3.5s linear infinite;
}

@keyframes hud-glint { to { background-position: -200% 0; } }
@keyframes hud-shake { 0%, 100% { transform: none; } 25% { transform: translateX(-6px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-3px); } }
@keyframes hud-float { 0% { opacity: 0; transform: translateY(10px) scale(0.8); } 15% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-34px); } }
@keyframes hud-flash-red { 30% { box-shadow: 0 0 0 2px #ff6a4d, 0 0 24px 8px rgba(255, 80, 50, 0.8); filter: brightness(1.6); } }
@keyframes hud-flash-green { 30% { box-shadow: 0 0 0 2px #8fd07a, 0 0 24px 8px rgba(120, 220, 100, 0.6); filter: brightness(1.3); } }
@keyframes hud-pulse { 50% { opacity: 0.4; } }
@keyframes hud-vignette { 25% { box-shadow: inset 0 0 80px 20px rgba(200, 30, 20, 0.75); } }
@keyframes hud-spin { to { transform: rotate(360deg); } }
@keyframes hud-dropin { from { opacity: 0; transform: translateY(-60px) rotate(-200deg) scale(0.6); } }
@keyframes hud-rise { from { opacity: 0; transform: translateY(16px) scale(0.94); letter-spacing: 0.3em; } }
@keyframes hud-fade { from { opacity: 0; } }
@keyframes hud-pop { from { opacity: 0; transform: scale(2); } }
@keyframes hud-slash { from { transform: rotate(-20deg) scaleX(0); } }
@keyframes hud-whoosh { from { transform: translateX(-160px); opacity: 0; } 60% { opacity: 1; } to { transform: translateX(120px); opacity: 0; } }
@keyframes hud-shake-title { 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
@keyframes hud-countdown { from { width: 100%; } to { width: 0; } }

@media (prefers-reduced-motion: reduce) {
  .battle-hud *, .battle-hud *::before, .battle-hud *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Примітиви**

`Portrait.tsx`:

```tsx
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

export function Portrait({ participant, size = 40, current, me, extra, className }: {
  participant: BattleParticipant;
  size?: number;
  current?: boolean;
  me?: boolean;
  extra?: boolean;
  className?: string;
}) {
  const { avatar, name, side } = participant.basicInfo;

  const down = participant.combatStats.status !== "active" || participant.combatStats.currentHp <= 0;

  const ring = side === "ally" ? "var(--ally)" : "var(--enemy)";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#241d16] text-xs font-bold", down && "grayscale brightness-50", className)}
      style={{
        width: size,
        height: size,
        boxShadow: current
          ? `0 0 0 2px var(--bone), 0 0 0 4px ${ring}`
          : me
            ? `0 0 0 2px ${ring}, 0 0 0 3px #000, 0 0 0 5px var(--gold)`
            : extra
              ? `0 0 0 2px var(--gold), 0 0 0 3px #000`
              : `0 0 0 2px ${ring}, 0 0 0 3px #000`,
      }}
    >
      {avatar ? <Image src={avatar} alt={name} fill sizes={`${size}px`} className="object-cover" /> : name.slice(0, 2)}
      {extra && <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] leading-none text-black">+</span>}
    </span>
  );
}
```

(Перевірити, що домен аватарок Supabase є в `images.remotePatterns` у `next.config.*` — так використовують інші сторінки; інакше додати `unoptimized` як у старому `BonusActionPickerDialog`.)

`EffectChip.tsx`:

```tsx
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ActiveEffect } from "@/types/battle";

const tone = (e: ActiveEffect) => (e.type === "buff" ? "text-[#cdb87e]" : "text-[#d0705c]");

export function EffectChip({ effect }: { effect: ActiveEffect }) {
  const icon = effect.icon ?? effect.source?.icon;

  return (
    <span className={cn("flex h-5 items-center gap-1.5 whitespace-nowrap text-[13px] leading-5", tone(effect))}>
      <span className="flex size-5 items-center justify-center border border-current bg-black/40">
        {icon ? <Image src={icon} alt="" width={14} height={14} className="size-3.5 object-contain" /> : <Sparkles className="size-3.5" />}
      </span>
      <span className="text-[#d9cfbd]">{effect.name}</span>
      <span className="opacity-70">{effect.duration}</span>
    </span>
  );
}

export function EffectLine({ effects, max = 2 }: { effects: ActiveEffect[]; max?: number }) {
  const shown = effects.slice(0, max);

  return (
    <div className="mt-1.5 flex h-5 items-center gap-3 overflow-hidden">
      {shown.map((e) => <EffectChip key={e.id} effect={e} />)}
      {effects.length > max && <span className="text-[13px] text-[var(--muted)]">+{effects.length - max}</span>}
    </div>
  );
}
```

`HealthBar.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { HEALTH_LABEL, healthSegments, healthState } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export function HealthBar({ participant, exact, className }: { participant: BattleParticipant; exact: boolean; className?: string }) {
  const { currentHp, maxHp } = participant.combatStats;

  if (exact) {
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;

    const low = ratio <= 0.25;

    return (
      <div className={cn("mt-1.5 h-1 bg-white/10", className)}>
        <i className={cn("block h-full transition-[width] duration-500", participant.basicInfo.side === "ally" ? (low ? "bg-[#c0392b]" : "bg-[#5f8a5a]") : "bg-[var(--enemy)]")} style={{ width: `${ratio * 100}%` }} />
      </div>
    );
  }

  const state = healthState(participant);

  const filled = healthSegments(state);

  return (
    <div className={cn("mt-1.5", className)}>
      <span className="sr-only">{HEALTH_LABEL[state]}</span>
      <div aria-hidden className="grid h-1 grid-cols-4 gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={cn("block", i < filled ? (state === "unhurt" ? "bg-[var(--enemy)]/60" : "bg-[#c0392b]") : "bg-white/10", state === "dying" && i < filled && "animate-[hud-pulse_1.4s_infinite]")} />
        ))}
      </div>
    </div>
  );
}

export function HealthLabel({ participant }: { participant: BattleParticipant }) {
  const state = healthState(participant);

  return <span className={cn("ml-2 text-[13px] italic", state === "unhurt" ? "text-[var(--muted)]" : "text-[#c98a7c]")}>{HEALTH_LABEL[state]}</span>;
}
```

(Тест шукає текст «при смерті» — `sr-only` його містить; візуальний підпис стану рендерить `HealthLabel` поруч з ім'ям.)

`SlotGrid.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { ROMAN, slotLevels, spellTier } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

import { metalClass } from "./theme";

export function SlotGrid({ participant }: { participant: BattleParticipant }) {
  return (
    <div className="mt-3 grid h-10 grid-cols-5 border border-white/15">
      {slotLevels(participant).map(({ level, max, current }) => (
        <div key={level} aria-label={`${ROMAN[level]} коло: ${current} з ${max}`} className={cn("flex flex-col items-center justify-center gap-1 border-l border-white/15 first:border-l-0", metalClass(spellTier(level)))}>
          <span className={cn("hud-sc text-xs leading-3", max === 0 ? "text-white/25" : "text-[var(--m2)]")}>{ROMAN[level]}</span>
          <span className="flex h-2 gap-1">
            {Array.from({ length: max }, (_, i) => (
              <i key={i} className={cn("block size-[7px] rotate-45", i < current ? "metal-fill" : "shadow-[inset_0_0_0_1px_#5a5246]")} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
```

`index.ts`:

```ts
export { EffectChip, EffectLine } from "./EffectChip";
export { hudFontClassName } from "./fonts";
export { HealthBar, HealthLabel } from "./HealthBar";
export { Portrait } from "./Portrait";
export { SlotGrid } from "./SlotGrid";
export { metalClass, SIDE_COLOR } from "./theme";
```

(`next/font` у Vitest не працює — тест імпортує з барела, тож замокати: на початку тесту `vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));`.)

- [ ] **Step 5: Тести зелені**

Run: `pnpm test:run components/battle/hud`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix components/battle/hud
git add components/battle/hud
git commit -m "feat(battle-ui): HUD theme, fonts and primitives

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Поле бою — трек, остання дія, рядок, деталі, журнал

**Files:**
- Create: `components/battle/scene/InitiativeTrack.tsx`, `LastActionTicker.tsx`, `ParticipantRow.tsx`, `ParticipantList.tsx`, `ParticipantDetails.tsx`, `BattleLog.tsx`
- Test: `components/battle/scene/__tests__/field.test.tsx`

**Interfaces:**
- Consumes: `useBattleScene`, `useHpChange` (Task 12), HUD (Task 14), `view`.
- Produces: `<InitiativeTrack />`, `<LastActionTicker onOpenLog />`, `<ParticipantRow participant exact acText current onSelect />` (`memo`), `<ParticipantList side />`, `<ParticipantDetails participant />`, `<BattleLog />`.

- [ ] **Step 1: Тест, що падає** — з фейковою сценою (той самий прийом, що в Task 13):

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { BattleLog } from "@/components/battle/scene/BattleLog";
import { InitiativeTrack } from "@/components/battle/scene/InitiativeTrack";
import { ParticipantList } from "@/components/battle/scene/ParticipantList";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { turnQueue } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const p = (id: string, name: string, side: ParticipantSide, hp = 20, extra = false) => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name, side, controlledBy: side === "ally" ? "u" : "dm" },
    combatStats: { ...b.combatStats, currentHp: hp, maxHp: 40, armorClass: 15, status: "active" as const },
    actionFlags: { ...b.actionFlags, hasExtraTurn: extra },
  };
};

function scene(isDM = false) {
  const hero = p("me", "Фрейда", ParticipantSide.ALLY, 34, true);

  const gob = p("gob", "Гоблін", ParticipantSide.ENEMY, 9);

  const log = [
    { actionIndex: 1, round: 1, actorName: "Годрік", actionType: "attack", targets: [{ participantId: "gob", participantName: "Гоблін" }], resultText: "Годрік завдав 6", actionDetails: { totalAttackValue: 15, isHit: true, targetAC: 15, damageBreakdown: "секрет" } },
  ] as unknown as BattleAction[];

  const battle = { initiativeOrder: [gob, hero], currentTurnIndex: 0, currentRound: 3, battleLog: log } as unknown as BattleScene;

  return {
    battle, isDM, viewer: { userId: "u", isDM, canSeeEnemyHp: false }, hero, myParticipants: [hero],
    queue: turnQueue([gob, hero], 0, 3), allies: [hero], enemies: [gob], select: vi.fn(), selectedId: null,
  } as unknown as BattleSceneValue;
}

const wrap = (value: BattleSceneValue) => ({ children }: { children: ReactNode }) => <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;

describe("поле бою", () => {
  it("гравець бачить ворога станом і відомим AC, союзника — числами", () => {
    render(<><ParticipantList side="enemy" /><ParticipantList side="ally" /></>, { wrapper: wrap(scene()) });

    expect(screen.getAllByText("при смерті").length).toBeGreaterThan(0);
    expect(screen.getByText("≤ 15")).toBeTruthy();
    expect(screen.getByText("34 / 40")).toBeTruthy();
    expect(screen.queryByText("9 / 40")).toBeNull();
  });

  it("DM бачить HP ворога числами", () => {
    render(<ParticipantList side="enemy" />, { wrapper: wrap(scene(true)) });

    expect(screen.getByText("9 / 40")).toBeTruthy();
  });

  it("трек: межа наступного раунду і додатковий хід «+»", () => {
    render(<InitiativeTrack />, { wrapper: wrap(scene()) });

    expect(screen.getByText("IV")).toBeTruthy();
    expect(screen.getAllByText("+").length).toBe(1);
  });

  it("журнал гравця не показує розбивку DM", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    expect(screen.getByText("Годрік завдав 6")).toBeTruthy();
    expect(screen.queryByText(/секрет/)).toBeNull();
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/scene/__tests__/field.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Компоненти**

`InitiativeTrack.tsx`:

```tsx
"use client";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import { ROMAN } from "@/lib/utils/battle/view";

const roman = (n: number) => (n <= 5 ? ROMAN[n] : n <= 10 ? `${["V", "VI", "VII", "VIII", "IX", "X"][n - 5]}` : String(n));

export function InitiativeTrack() {
  const { queue, myParticipants, select } = useBattleScene();

  const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

  return (
    <div className="flex h-[72px] items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {queue.map((e, i) =>
        e.kind === "round" ? (
          <span key={`r${e.round}`} className="relative mx-0.5 h-12 w-px shrink-0 bg-white/30">
            <span className="hud-sc absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full text-[11px] text-[var(--muted)]">{roman(e.round)}</span>
          </span>
        ) : (
          <button key={`${e.participant.basicInfo.id}-${i}`} type="button" onClick={() => select(e.participant.basicInfo.id)} className="shrink-0">
            <Portrait participant={e.participant} size={e.current ? 52 : 36} current={e.current} me={!e.current && mine.has(e.participant.basicInfo.id)} extra={e.kind === "extra"} />
          </button>
        ),
      )}
    </div>
  );
}
```

`LastActionTicker.tsx`:

```tsx
"use client";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import { lastAction } from "@/lib/utils/battle/view";

export function LastActionTicker({ onOpenLog }: { onOpenLog?: () => void }) {
  const { battle } = useBattleScene();

  const last = lastAction(battle.battleLog ?? []);

  if (!last) return null;

  const order = battle.initiativeOrder;

  const actor = order.find((p) => p.basicInfo.id === last.actorId);

  const target = order.find((p) => p.basicInfo.id === last.targets?.[0]?.participantId);

  const change = last.hpChanges?.[0]?.change ?? 0;

  return (
    <button type="button" onClick={onOpenLog} className="mx-4 flex h-10 w-[calc(100%-2rem)] items-center gap-2 border-y border-white/10 text-left text-sm text-[#d9cfbd]">
      {actor && <Portrait participant={actor} size={24} />}
      <span className="truncate">{last.actorName}</span>
      {target && <><span className="text-[var(--muted)]">→</span><Portrait participant={target} size={24} /><span className="truncate">{target.basicInfo.name}</span></>}
      {change !== 0 && <b className={change > 0 ? "text-[#e9a08f]" : "text-[#8fd07a]"}>{change > 0 ? `−${change}` : `+${-change}`}</b>}
      {!target && change === 0 && <span className="truncate text-[var(--muted)]">{last.resultText}</span>}
      {onOpenLog && <span className="ml-auto shrink-0 text-[13px] text-[var(--muted)]">журнал ›</span>}
    </button>
  );
}
```

(Перевірити поле `hpChanges` у `BattleAction` і знак `change`: у старому `triggerGlobalDamageFromBattle` `change < 0` означає лікування.)

`ParticipantRow.tsx`:

```tsx
"use client";

import { memo } from "react";
import { Shield } from "lucide-react";

import { EffectLine, HealthBar, HealthLabel, Portrait } from "@/components/battle/hud";
import { useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

export const ParticipantRow = memo(function ParticipantRow({ participant, exact, acText, current, onSelect }: {
  participant: BattleParticipant;
  exact: boolean;
  acText: string;
  current: boolean;
  onSelect: (id: string) => void;
}) {
  const { currentHp, maxHp, status } = participant.combatStats;

  const change = useHpChange(currentHp);

  const down = status !== "active" || currentHp <= 0;

  return (
    <button
      key={change?.id}
      type="button"
      onClick={() => onSelect(participant.basicInfo.id)}
      className={cn("relative flex h-[76px] w-full items-center gap-3 border-b border-white/[.08] text-left", change && change.delta < 0 && "animate-[hud-shake_.35s]", down && "opacity-40")}
    >
      {change && (
        <span className={cn("hud-sc pointer-events-none absolute left-6 top-2 text-[26px] font-extrabold opacity-0 [text-shadow:0_2px_6px_#000] animate-[hud-float_1.1s_ease-out]", change.delta < 0 ? "text-[#ff6a4d]" : "text-[#8fd07a]")}>
          {change.delta < 0 ? `−${-change.delta}` : `+${change.delta}`}
        </span>
      )}
      <Portrait participant={participant} size={48} current={current} className={cn(change && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]"))} />
      <div className="min-w-0 flex-1">
        <div className={cn("hud-sc flex h-5 items-center whitespace-nowrap text-base font-bold text-[var(--ink)]", down && "line-through")}>
          <span className="truncate">{participant.basicInfo.name}</span>
          {exact ? <span className={cn("ml-auto pl-2 font-sans text-sm font-medium tracking-normal", currentHp / Math.max(1, maxHp) <= 0.25 ? "text-[#e04a35]" : "text-[#d6cbb7]")}>{currentHp} / {maxHp}</span> : <HealthLabel participant={participant} />}
        </div>
        <HealthBar participant={participant} exact={exact} />
        <EffectLine effects={participant.battleData.activeEffects} />
      </div>
      <span className="mt-3.5 flex w-16 shrink-0 items-center justify-end gap-1.5 self-start text-sm text-[#b8ab95]">
        {acText}
        <Shield className="size-4 text-[var(--muted)]" />
      </span>
    </button>
  );
});
```

`ParticipantList.tsx`:

```tsx
"use client";

import { ParticipantRow } from "./ParticipantRow";

import { useBattleScene } from "@/lib/hooks/battle";
import { canSeeExactStats, effectiveArmorClass, formatKnownArmorClass, knownArmorClass } from "@/lib/utils/battle/view";

export function ParticipantList({ side }: { side: "ally" | "enemy" }) {
  const { allies, enemies, battle, viewer, current, select } = useBattleScene();

  const list = side === "ally" ? allies : enemies;

  const order = battle.initiativeOrder;

  return (
    <div className="px-4">
      {list.map((p) => {
        const exact = canSeeExactStats(p, viewer);

        const acText = exact ? String(effectiveArmorClass(p, order)) : formatKnownArmorClass(knownArmorClass(battle.battleLog ?? [], p.basicInfo.id));

        return <ParticipantRow key={p.basicInfo.id} participant={p} exact={exact} acText={acText} current={current?.basicInfo.id === p.basicInfo.id} onSelect={select} />;
      })}
    </div>
  );
}
```

`ParticipantDetails.tsx`:

```tsx
"use client";

import Image from "next/image";

import { HealthBar, HealthLabel, Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { canSeeExactStats, effectiveArmorClass, formatKnownArmorClass, knownArmorClass, observedTraits } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-4">
    <h4 className="hud-sc flex h-5 items-center text-[13px] tracking-[.08em] text-[var(--muted)]">{title}</h4>
    {children}
  </section>
);

export function ParticipantDetails({ participant }: { participant: BattleParticipant }) {
  const { battle, viewer } = useBattleScene();

  const exact = canSeeExactStats(participant, viewer);

  const log = battle.battleLog ?? [];

  const known = knownArmorClass(log, participant.basicInfo.id);

  const traits = exact ? [] : observedTraits(log, participant.basicInfo.id);

  return (
    <div className="text-[var(--bone)]">
      <div className="flex items-center gap-4">
        <Portrait participant={participant} size={64} />
        <div>
          <div className="hud-sc text-[22px] font-bold leading-7">{participant.basicInfo.name}</div>
          {exact ? <div className="text-sm text-[#d6cbb7]">{participant.combatStats.currentHp} / {participant.combatStats.maxHp}</div> : <HealthLabel participant={participant} />}
        </div>
      </div>
      <HealthBar participant={participant} exact={exact} className="mt-3" />
      <Section title="Броня">
        <div className="flex min-h-10 items-center justify-between border-b border-white/[.08]">
          <span>{exact ? "AC" : "AC між"}</span>
          <span className="font-medium text-[var(--ink)]">{exact ? effectiveArmorClass(participant, battle.initiativeOrder) : formatKnownArmorClass(known)}</span>
        </div>
        {!exact && known.evidence.map((e, i) => (
          <div key={i} className="flex min-h-8 items-center text-[13px] text-[var(--muted)]">
            {e.hit ? "влучання" : "промах"} {e.total} · {e.actorName}, раунд {e.round}
          </div>
        ))}
      </Section>
      <Section title="Ефекти">
        {participant.battleData.activeEffects.length === 0 && <div className="py-2 text-sm text-[var(--muted)]">немає</div>}
        {participant.battleData.activeEffects.map((e) => {
          const icon = e.icon ?? e.source?.icon;

          return (
            <div key={e.id} className="flex gap-3 border-b border-white/[.08] py-2.5">
              <span className={cn("flex size-9 shrink-0 items-center justify-center border", e.type === "buff" ? "border-[#cdb87e]" : "border-[#d0705c]")}>
                {icon && <Image src={icon} alt="" width={24} height={24} className="size-6 object-contain" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[15px] font-medium text-[var(--ink)]"><span>{e.name}</span><span className="text-[13px] font-normal text-[var(--muted)]">{e.duration} р.</span></div>
                {e.description && <p className="mt-0.5 text-[13px] leading-[18px] text-[#a89c88]">{e.description}</p>}
                {e.source && <p className="text-[13px] leading-[18px] text-[#a89c88]">Від: {e.source.abilityName ? `${e.source.abilityName} (${e.source.name})` : e.source.name}</p>}
              </div>
            </div>
          );
        })}
      </Section>
      {traits.length > 0 && (
        <Section title="Помічено в бою">
          {traits.map((t) => (
            <div key={t.label} className="flex min-h-10 items-center justify-between border-b border-white/[.08]">
              <span>{t.label}</span>
              <span className="font-medium text-[var(--ink)]">{t.kind === "immunity" ? "імунітет" : `${t.value}%`}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
```

`BattleLog.tsx`:

```tsx
"use client";

import { useBattleScene } from "@/lib/hooks/battle";
import { sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer } = useBattleScene();

  const entries = [...(battle.battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer));

  let round: number | null = null;

  return (
    <div className="text-sm leading-5 text-[#cfc5b2]">
      {entries.map((e) => {
        const header = e.round !== round;

        round = e.round;

        return (
          <div key={e.actionIndex} className="border-b border-white/[.06] py-2.5">
            {header && <div className="text-xs text-[var(--muted)]">Раунд {e.round}</div>}
            {e.resultText}
          </div>
        );
      })}
    </div>
  );
}
```

(Тест «журнал гравця не показує розбивку» перевіряє, що `damageBreakdown` ніде не рендериться — `BattleLog` показує лише `resultText`.)

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run components/battle/scene/__tests__/field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/battle/scene
git add components/battle/scene
git commit -m "feat(battle-ui): initiative track, ticker, participant rows, details, log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Мій герой, дії, відлік, з'єднання, тост, шапка

**Files:**
- Create: `components/battle/scene/MyHeroPanel.tsx`, `ActionGrid.tsx`, `TurnCountdown.tsx`, `ConnectionBanner.tsx`, `BattleToast.tsx`, `BattleTopBar.tsx`
- Test: `components/battle/scene/__tests__/hero.test.tsx`

**Interfaces:**
- Produces: `<MyHeroPanel hero compact? />`; `<ActionGrid turn onAttack onMagic onBonus onMorale />` (`turn: ReturnType<typeof usePlayerTurn>`); `<TurnCountdown seconds onElapsed onStay />`; `<ConnectionBanner />`; `<BattleToast />`; `<BattleTopBar />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TurnCountdown } from "@/components/battle/scene/TurnCountdown";

describe("TurnCountdown", () => {
  it("рахує секунди і викликає onElapsed; «Залишитись» скасовує", () => {
    vi.useFakeTimers();

    const onElapsed = vi.fn();

    const onStay = vi.fn();

    const { unmount } = render(<TurnCountdown seconds={5} onElapsed={onElapsed} onStay={onStay} />);

    expect(screen.getByText("5")).toBeTruthy();

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Залишитись" }));
    expect(onStay).toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(5_000));
    unmount();

    const second = vi.fn();

    render(<TurnCountdown seconds={2} onElapsed={second} onStay={() => {}} />);
    act(() => vi.advanceTimersByTime(2_100));
    expect(second).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/scene/__tests__/hero.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Компоненти**

`TurnCountdown.tsx`:

```tsx
"use client";

import { useEffect, useEffectEvent, useState } from "react";

export function TurnCountdown({ seconds, onElapsed, onStay }: { seconds: number; onElapsed: () => void; onStay: () => void }) {
  const [left, setLeft] = useState(seconds);

  const elapse = useEffectEvent(onElapsed);

  useEffect(() => {
    const started = Date.now();

    const id = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1_000);

      setLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(id);
        elapse();
      }
    }, 250);

    return () => clearInterval(id);
  }, [seconds]);

  return (
    <div className="relative mt-2 flex h-[52px] items-center gap-3 overflow-hidden border border-[var(--enemy)] bg-[var(--enemy)]/20 px-3.5">
      <span className="flex-1 text-[15px] text-[var(--ink)]">Хід завершиться через <b>{left}</b></span>
      <button type="button" onClick={onStay} className="hud-sc h-9 border border-white/40 px-3.5 text-[15px] font-bold text-[var(--ink)]">Залишитись</button>
      <i className="absolute bottom-0 left-0 h-[3px] bg-[#c0392b]" style={{ animation: `hud-countdown ${seconds}s linear forwards` }} />
    </div>
  );
}
```

(З фейковими таймерами `Date.now()` теж мокається Vitest — `vi.useFakeTimers()` за замовчуванням підміняє `Date`.)

`MyHeroPanel.tsx`:

```tsx
"use client";

import { Heart, Shield } from "lucide-react";

import { EffectLine, HealthBar, Portrait, SlotGrid } from "@/components/battle/hud";
import { useBattleScene, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { abilityCharges, effectiveArmorClass, turnsUntil } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export function MyHeroPanel({ hero, compact = false }: { hero: BattleParticipant; compact?: boolean }) {
  const { battle, queue, isMyTurn } = useBattleScene();

  const change = useHpChange(hero.combatStats.currentHp);

  const until = turnsUntil(queue, [hero.basicInfo.id]);

  const charges = abilityCharges(hero);

  const morale = hero.combatStats.morale;

  return (
    <div key={change?.id} className={cn("relative", change && change.delta < 0 && "animate-[hud-shake_.35s]")}>
      {change && change.delta < 0 && <div className="pointer-events-none fixed inset-0 z-40 animate-[hud-vignette_1s]" />}
      <div className="flex items-center gap-3">
        <Portrait participant={hero} size={compact ? 48 : 64} me />
        <div className="min-w-0 flex-1">
          <div className="hud-sc flex h-6 items-center justify-between text-[19px] font-bold text-[var(--ink)]">
            <span className="truncate">{hero.basicInfo.name}</span>
            <span className="font-sans text-sm font-normal italic tracking-normal text-[#b8ab95]">
              {compact ? `${hero.combatStats.currentHp} / ${hero.combatStats.maxHp} · AC ${effectiveArmorClass(hero, battle.initiativeOrder)}` : isMyTurn ? "твій хід" : until !== null ? `хід через ${until}` : ""}
            </span>
          </div>
          <HealthBar participant={hero} exact className="h-1.5" />
          {!compact && (
            <div className="mt-1.5 flex h-6 items-center gap-4 text-[15px] text-[#d6cbb7]">
              <span className="flex items-center gap-1.5"><Heart className="size-4 text-[var(--enemy)]" />{hero.combatStats.currentHp} / {hero.combatStats.maxHp}</span>
              <span className="flex items-center gap-1.5"><Shield className="size-4 text-[#b8ab95]" />{effectiveArmorClass(hero, battle.initiativeOrder)}</span>
            </div>
          )}
        </div>
      </div>
      {!compact && <SlotGrid participant={hero} />}
      {!compact && (morale !== 0 || charges.length > 0) && (
        <div className="mt-2.5 flex h-6 items-center gap-4 text-sm text-[#d6cbb7]">
          {morale !== 0 && <span>Мораль <span className={morale > 0 ? "text-[#9fc48a]" : "text-[#d0705c]"}>{morale > 0 ? `+${morale}` : morale}</span></span>}
          {charges.map((c) => <span key={c.key}>{c.name} {c.left}/{c.limit}</span>)}
        </div>
      )}
      {!compact && <EffectLine effects={hero.battleData.activeEffects} />}
    </div>
  );
}
```

`ActionGrid.tsx` (дії й підписи згруповані в об'єкти, щоб не плодити пропси):

```tsx
"use client";

import { BookOpen, Hourglass, Sparkles, Swords } from "lucide-react";

import type { usePlayerTurn } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Turn = ReturnType<typeof usePlayerTurn>;

const Tile = ({ icon: Icon, label, sub, used, primary, onClick }: { icon: typeof Swords; label: string; sub: string; used?: boolean; primary?: boolean; onClick?: () => void }) => (
  <button type="button" disabled={used} onClick={onClick} className={cn("flex h-16 items-center gap-3 border px-3.5 text-left text-[var(--ink)] disabled:opacity-40", primary ? "border-[var(--enemy)] bg-[var(--enemy)]/25" : "border-white/25 bg-black/55")}>
    <Icon className={cn("size-7 shrink-0", primary ? "text-[var(--bone)]" : "text-[var(--gold)]")} />
    <span><span className="hud-sc block text-[17px] leading-5">{label}</span><span className="block text-xs leading-4 text-[#9a8e7b]">{sub}</span></span>
  </button>
);

export function ActionGrid({ turn, pending, labels, available, actions }: {
  turn: Turn;
  pending: boolean;
  labels: { attack: string; magic: string; bonus: string };
  available: { magic: boolean; bonus: boolean };
  actions: { attack(): void; magic(): void; bonus(): void };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 pt-3">
        <Tile icon={Swords} label="Атака" sub={turn.actionUsed ? "використано" : labels.attack} used={turn.actionUsed || pending} primary onClick={actions.attack} />
        <Tile icon={BookOpen} label="Магія" sub={turn.actionUsed ? "дію використано" : labels.magic} used={turn.actionUsed || !available.magic || pending} onClick={actions.magic} />
        <Tile icon={Sparkles} label="Бонус" sub={labels.bonus} used={!turn.bonusAvailable || !available.bonus || pending} onClick={actions.bonus} />
        <Tile icon={Hourglass} label="Мораль" sub="перевірено" used />
      </div>
      {turn.phase !== "countdown" && (
        <button type="button" disabled={pending} onClick={() => void turn.endTurn()} className="hud-sc mt-2 flex h-11 w-full items-center justify-center border border-white/15 text-[15px] tracking-[.08em] text-[#b8ab95] disabled:opacity-50">
          Завершити хід
        </button>
      )}
    </>
  );
}
```

`ConnectionBanner.tsx`:

```tsx
"use client";

import { useBattleScene } from "@/lib/hooks/battle";

export function ConnectionBanner() {
  const { connection } = useBattleScene();

  if (connection !== "disconnected" && connection !== "unavailable") return null;

  return (
    <div className="flex h-9 items-center justify-center gap-2 bg-[#5a3a12] text-[13px] text-[#f3d9a4]">
      <i className="size-2 rounded-full bg-[#f0b44c] animate-[hud-pulse_1.2s_infinite]" />
      Немає зв&apos;язку — стан може бути застарілим
    </div>
  );
}
```

`BattleToast.tsx`:

```tsx
"use client";

import { useBattleScene } from "@/lib/hooks/battle";

export function BattleToast() {
  const { toast } = useBattleScene();

  if (!toast.message) return null;

  return (
    <button type="button" onClick={toast.dismiss} role="status" className="fixed inset-x-4 top-14 z-50 mx-auto flex min-h-11 max-w-md items-center gap-2.5 border border-white/25 bg-[#15110e]/95 px-3.5 text-left text-sm text-[#d9cfbd] animate-[hud-fade_.2s]">
      {toast.message}
    </button>
  );
}
```

`BattleTopBar.tsx` (кнопки DM фіксованого розміру, «Скинути бій» через `useConfirm`, «Наступний хід» не змінює ширину під час запиту):

```tsx
"use client";

import { Loader2 } from "lucide-react";

import { useBattleScene } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

export function BattleTopBar({ onComplete }: { onComplete?: () => void }) {
  const { battle, isDM, isMyTurn, connection, actions } = useBattleScene();

  const confirm = useConfirm();

  const reset = async () => {
    if (await confirm({ title: "Скинути бій?", description: "Бій повернеться до підготовки, журнал буде очищено.", confirmLabel: "Скинути" })) {
      await actions.reset.mutateAsync({});
    }
  };

  const nextPending = actions.nextTurn.isPending;

  return (
    <header className="flex h-12 items-center gap-3 px-4">
      <span className="hud-sc truncate text-[15px] tracking-[.08em]">{battle.name}</span>
      {isMyTurn && battle.status === "active" && <span className="hud-sc hidden h-8 items-center border-y border-[var(--enemy)] bg-[var(--enemy)]/20 px-4 text-[15px] tracking-[.12em] lg:flex">Твій хід</span>}
      <span className="hud-sc ml-auto flex items-center gap-2 text-sm text-[#b8ab95]">
        Раунд {battle.currentRound}
        <i className={cn("size-1.5 rounded-full", connection === "connected" ? "bg-[#9fb98a]" : "bg-[#f0b44c] animate-[hud-pulse_1.2s_infinite]")} />
      </span>
      {isDM && battle.status === "active" && (
        <span className="hidden gap-2 lg:flex">
          {onComplete && <button type="button" onClick={onComplete} className="hud-sc h-8 w-32 border border-emerald-500/50 text-sm text-emerald-400">Завершити</button>}
          <button type="button" onClick={() => void reset()} className="hud-sc h-8 w-28 border border-red-500/50 text-sm text-red-400">Скинути</button>
          <button type="button" disabled={nextPending} onClick={() => void actions.nextTurn.mutateAsync({})} className="hud-sc flex h-8 w-36 items-center justify-center bg-[var(--enemy)] text-sm text-white disabled:opacity-70">
            {nextPending ? <Loader2 className="size-4 animate-spin" /> : "Наступний хід"}
          </button>
        </span>
      )}
    </header>
  );
}
```

`onComplete` відкриває існуючий діалог результату (Авто / Перемога / Поразка) — перенести `ResponsiveDialog` завершення зі старого `BattleHeader.tsx` у `components/battle/scene/CompleteBattleDialog.tsx` (`{ open, onOpenChange }`, кнопки викликають `actions.complete.mutateAsync({ result })`).

- [ ] **Step 4: Тест зелений**

Run: `pnpm test:run components/battle/scene/__tests__/hero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/battle/scene
git add components/battle/scene
git commit -m "feat(battle-ui): hero panel, action grid, countdown, top bar, toast

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: `DiceInput` і `AttackWizard`

**Files:**
- Create: `components/battle/wizards/DiceInput.tsx`, `components/battle/wizards/AttackWizard.tsx`
- Test: `components/battle/wizards/__tests__/attack-wizard.test.tsx`

**Interfaces:**
- Consumes: `useAttackWizard` (Task 13; додати в нього `previews: Record<string, ReturnType<typeof weaponPreview>>` — `useMemo` по `attacks` через `weaponPreview(attacker, a, order)`), HUD, `ResponsiveDialog`.
- Produces: `<DiceGrid sides value onPick />`, `<DamageDice slots values onChange />`, `<AiRollButton onClick />`; `<AttackWizard wizard attacker />`.

- [ ] **Step 1: Тест, що падає** — інтеграційний, з реальним `useAttackWizard` і фейковою сценою з Task 13 (винести фабрику фейкової сцени в `lib/hooks/battle/__tests__/fake-scene.tsx` і використати тут і там):

```tsx
// @vitest-environment happy-dom
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { useAttackWizard } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

function Harness({ attacker }: { attacker: Parameters<typeof useAttackWizard>[0] }) {
  const wizard = useAttackWizard(attacker);

  useEffect(() => wizard.open(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AttackWizard wizard={wizard} />;
}

describe("AttackWizard", () => {
  it("ціль → сітка d20 → шкода → підсумок «Атакувати» → мутація", async () => {
    const { wrapper, me, mutateAsync } = fakeScene();

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d8)"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));

    expect(screen.getByText("Захист і опори цілі")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Атакувати/ }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ attackRoll: 14, damageRolls: [6] })));
  });

  it("AI ROLL ставить кидок і переходить далі", async () => {
    const { wrapper, me } = fakeScene();

    render(<Harness attacker={me} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
    fireEvent.click(screen.getByRole("button", { name: /AI ROLL/ }));

    await waitFor(() => expect(screen.queryByText("Кидок атаки · d20")).toBeNull());
  });
});
```

`fake-scene.tsx` — експортує `fakeScene(over?)` → `{ wrapper, me, gob, mutateAsync, showResult, value }` з даними з Task 13 Step 1 (герой «Фрейда», ворог «Гоблін» з AC 12, `actions.attack/castSpell/bonusAction/nextTurn/moraleCheck` — `vi.fn` з `isPending: false`), обгорнуте в `ConfirmProvider` (`components/ui/confirm-dialog`) і `BattleSceneContext.Provider`. Тест Task 13 перевести на цю фабрику.

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/wizards`
Expected: FAIL.

- [ ] **Step 3: `DiceInput.tsx`**

```tsx
"use client";

import { Dices } from "lucide-react";

import { cn } from "@/lib/utils";

export function DiceGrid({ sides, value, onPick }: { sides: number; value?: number; onPick: (v: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-1.5">
      {Array.from({ length: sides }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          className={cn(
            "flex h-12 items-center justify-center border text-lg font-medium",
            n === value ? "border-[#c0392b] bg-[var(--enemy)] font-bold text-white" : "border-white/15 bg-black/25 text-[var(--bone)]",
            n !== value && n === sides && sides === 20 && "text-[#e8c77a]",
            n !== value && n === 1 && "text-[#c98a7c]",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function DamageDice({ slots, values, onChange }: { slots: number[]; values: (number | undefined)[]; onChange: (i: number, v: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {slots.map((sides, i) => (
        <label key={i} className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          d{sides}
          <input
            aria-label={`Кубик ${i + 1} (d${sides})`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={values[i] ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);

              if (n >= 1 && n <= sides) onChange(i, n);
            }}
            className="h-12 border border-white/20 bg-black/30 text-center text-lg text-[var(--ink)]"
          />
        </label>
      ))}
    </div>
  );
}

export function AiRollButton({ onClick, label = "AI ROLL" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="hud-sc flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap border border-white/25 text-[15px] font-bold tracking-[.04em] text-[var(--bone)]">
      <Dices className="size-5" />
      {label}
    </button>
  );
}
```

- [ ] **Step 4: `AttackWizard.tsx`**

Один `ResponsiveDialog` (`open={!["closed","result","submitting"].includes(step) || step === "submitting"}` — під час відправки лишається відкритим зі спінером; закривається на `result`, далі показує `ResultOverlay`). Кроки (у шапці смуга з п'яти: Зброя · Ціль · Кидок · Шкода · Підсумок; поточний — червоний, пройдені — сірі):

```tsx
"use client";

import { useState } from "react";
import { Loader2, Swords } from "lucide-react";

import { AiRollButton, DamageDice, DiceGrid } from "./DiceInput";

import { HealthLabel, Portrait } from "@/components/battle/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { rollDie, type useAttackWizard } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { AttackMode } from "@/lib/utils/battle/flows";

type Wizard = ReturnType<typeof useAttackWizard>;

const STEPS = ["Зброя", "Ціль", "Кидок", "Шкода", "Підсумок"] as const;

const STEP_INDEX = { weapon: 0, target: 1, roll: 2, damage: 3, summary: 4, submitting: 4 } as const;

const MODES: [AttackMode, string][] = [["normal", "Звичайний"], ["advantage", "Перевага"], ["disadvantage", "Перешкода"]];

const btn = "hud-sc flex h-[52px] items-center justify-center gap-2.5 border text-base font-bold tracking-[.04em]";

export function AttackWizard({ wizard }: { wizard: Wizard }) {
  const { state, attack, attacks, targets, steps, estimate } = wizard;

  const [draft, setDraft] = useState<(number | undefined)[]>([]);

  const [second, setSecond] = useState<number | undefined>();

  const open = state.step !== "closed" && state.step !== "result";

  const current = STEP_INDEX[state.step as keyof typeof STEP_INDEX] ?? 0;

  const strike = state.strikes[state.index];

  const target = targets.find((t) => t.basicInfo.id === strike?.targetId) ?? null;

  const header = (
    <div className={cn("mb-3 grid h-8 gap-1", state.weaponCount > 1 ? "grid-cols-5" : "grid-cols-4")}>
      {STEPS.slice(state.weaponCount > 1 ? 0 : 1).map((label, i) => {
        const idx = i + (state.weaponCount > 1 ? 0 : 1);

        return (
          <div key={label} className={cn("flex flex-col justify-end gap-1.5 text-xs after:h-[3px] after:content-['']", idx < current ? "text-[#a89c88] after:bg-[var(--muted)]" : idx === current ? "font-bold text-[var(--ink)] after:bg-[var(--enemy)]" : "text-[#6b604f] after:bg-white/10")}>
            {label}
          </div>
        );
      })}
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && wizard.close()} title={attack ? `${attack.name}${target ? ` → ${target.basicInfo.name}` : ""}` : "Атака"} className="battle-hud border-white/25 bg-[#15110e] text-[var(--bone)]">
      {header}
      {state.step === "weapon" && (
        <div className="space-y-2">
          {attacks.map((a) => (
            <button key={a.id ?? a.name} type="button" onClick={() => wizard.selectWeapon(a)} className={cn("flex h-[76px] w-full items-center gap-3 border px-3 text-left", (a.id ?? a.name) === state.attackId ? "border-[var(--enemy)] bg-[var(--enemy)]/15" : "border-white/15")}>
              <Swords className="size-7 text-[var(--gold)]" />
              <span className="min-w-0 flex-1">
                <span className="hud-sc block text-[17px] font-bold">{a.name}</span>
                <span className="block text-[13px] text-[#a89c88]">{a.type === "melee" ? "ближній" : "дальній"} · +{a.attackBonus} до влучання</span>
                <span className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-[#cdb87e]">
                  {wizard.previews[a.id ?? a.name]?.bonuses.map((b) => <span key={b.label}>{b.label} {b.percent ? `${b.percent > 0 ? "+" : ""}${b.percent}%` : `${b.flat > 0 ? "+" : ""}${b.flat}`}</span>)}
                </span>
              </span>
              <span className="w-[72px] text-right text-[15px]">{a.damageDice}<small className="block text-xs text-[var(--muted)]">≈ {wizard.previews[a.id ?? a.name]?.estimate}</small></span>
            </button>
          ))}
        </div>
      )}
      {state.step === "target" && (
        <>
          <div className="space-y-2">
            {targets.map((t) => (
              <button key={t.basicInfo.id} type="button" onClick={() => wizard.toggleTarget(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", state.targetIds.includes(t.basicInfo.id) ? "border-[var(--enemy)] bg-[var(--enemy)]/15" : "border-white/15")}>
                <Portrait participant={t} size={36} />
                <span className="hud-sc flex-1 font-bold">{t.basicInfo.name}</span>
                <HealthLabel participant={t} />
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={wizard.close} className={cn(btn, "border-white/25")}>Скасувати</button>
            <button type="button" disabled={state.targetIds.length === 0} onClick={wizard.confirmTargets} className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc] disabled:opacity-50")}>Далі · кидок</button>
          </div>
        </>
      )}
      {state.step === "roll" && target && (
        <>
          <div className="hud-sc text-xl font-bold">Кидок атаки · d20</div>
          {state.strikes.length > 1 && <div className="mt-1 text-sm text-[var(--muted)]">Удар {state.index + 1} з {state.strikes.length} · {target.basicInfo.name}</div>}
          <div className="mt-3 grid h-10 grid-cols-3 border border-white/20">
            {MODES.map(([m, label]) => (
              <button key={m} type="button" onClick={() => wizard.setMode(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", state.mode === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-[#a89c88]")}>{label}</button>
            ))}
          </div>
          {state.mode !== "normal" && <div className="mt-2 text-xs text-[var(--muted)]">Спершу перший кубик, потім другий</div>}
          <DiceGrid
            sides={20}
            value={second}
            onPick={(v) => {
              if (state.mode !== "normal" && second === undefined) setSecond(v);
              else {
                wizard.roll(second ?? v, second === undefined ? undefined : v);
                setSecond(undefined);
              }
            }}
          />
          <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
            <AiRollButton onClick={wizard.aiRoll} />
            <button type="button" onClick={wizard.back} className={cn(btn, "border-white/25")}>Назад</button>
          </div>
        </>
      )}
      {state.step === "damage" && (
        <>
          <div className="hud-sc text-xl font-bold">Шкода{strike?.outcome === "crit" ? " · критичне" : ""}</div>
          <DamageDice slots={state.diceSlots} values={draft} onChange={(i, v) => setDraft((d) => { const n = [...d]; n[i] = v; return n; })} />
          <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
            <AiRollButton onClick={() => setDraft(state.diceSlots.map((sides) => rollDie(sides)))} />
            <button
              type="button"
              disabled={state.diceSlots.some((_, i) => draft[i] === undefined)}
              onClick={() => {
                wizard.damage(draft as number[]);
                setDraft([]);
              }}
              className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc] disabled:opacity-50")}
            >
              Далі · підсумок
            </button>
          </div>
        </>
      )}
      {(state.step === "summary" || state.step === "submitting") && (
        <>
          {steps.map((list, k) => (
            <div key={k} className="mt-1">
              {list.map((s, i) => (
                <div key={i} className={cn("flex min-h-9 items-center justify-between border-b border-white/[.06] text-sm", s.side === "attacker" && s.kind === "percent" && s.value > 0 && "text-[#cdb87e]", s.side === "target" && "text-[#d0705c]")}>
                  <span>{s.label}</span>
                  <span>{s.kind === "percent" ? `${s.value > 0 ? "+" : ""}${s.value}%` : s.kind === "multiplier" ? `×${s.value}` : s.kind === "immunity" ? "імунітет" : s.kind === "flat" ? `${s.value > 0 ? "+" : ""}${s.value}` : s.value} → {s.after}</span>
                </div>
              ))}
            </div>
          ))}
          {wizard.unknownDefense && <div className="flex min-h-9 items-center justify-between text-sm italic text-[var(--muted)]"><span>Захист і опори цілі</span><span>невідомо</span></div>}
          {steps.length > 0 && <div className="hud-sc flex h-12 items-center justify-between text-lg font-bold"><span>Орієнтовно</span><span className="text-[26px]">{estimate}</span></div>}
          {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{state.error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={state.step === "submitting"} onClick={wizard.back} className={cn(btn, "border-white/25")}>← Назад</button>
            <button type="button" disabled={state.step === "submitting"} onClick={wizard.submit} className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc]")}>
              {state.step === "submitting" ? <Loader2 className="size-5 animate-spin" /> : <><Swords className="size-5" />Атакувати</>}
            </button>
          </div>
        </>
      )}
    </ResponsiveDialog>
  );
}
```

(Рядок «Захист і опори цілі — невідомо» показувати лише коли ціль — ворог без точних даних: `steps` уже без прихованих кроків; додати проп `unknownDefense: boolean` з хука — `useAttackWizard` повертає `unknownDefense = hit targets some(t => !canSeeExactStats(t, viewer))`.)

- [ ] **Step 5: Тести зелені**

Run: `pnpm test:run components/battle/wizards lib/hooks/battle`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix components/battle/wizards lib/hooks/battle
git add components/battle/wizards lib/hooks/battle
git commit -m "feat(battle-ui): one-sheet attack wizard with d20 grid and AI ROLL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: `SpellBook`

**Files:**
- Create: `components/battle/wizards/SpellBook.tsx`
- Test: `components/battle/wizards/__tests__/spell-book.test.tsx`

**Interfaces:**
- Consumes: `useSpellBook` (Task 13), `DiceGrid`/`DamageDice`/`AiRollButton` (Task 17), `metalClass`/`spellTier`.
- Produces: `<SpellBook book caster />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/lib/hooks/spells", () => ({
  useSpells: () => ({
    data: [
      { id: "ray", name: "Палаючий промінь", level: 2, type: "target", damageType: "damage", diceCount: 2, diceType: "d6", hitCheck: { ability: "int", dc: 12 } },
      { id: "bolt", name: "Крижаний спис", level: 1, type: "target", damageType: "damage", diceCount: 3, diceType: "d8" },
    ],
  }),
}));

import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useSpellBook } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

function Harness({ caster }: { caster: Parameters<typeof useSpellBook>[0] }) {
  const book = useSpellBook(caster, {});

  useEffect(() => book.open(2), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

describe("SpellBook", () => {
  it("стрічки кіл зі слотами; сторінка кола; спел → цілі → кидки → підсумок → застосувати", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray", "bolt"], slots: { "1": { max: 3, current: 3 }, "2": { max: 3, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /II коло, слотів 1/ })).toBeTruthy();
    expect(screen.getByText("Палаючий промінь")).toBeTruthy();
    expect(screen.queryByText("Крижаний спис")).toBeNull();

    fireEvent.click(screen.getByText("Палаючий промінь"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.click(screen.getByRole("button", { name: "15" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", targetIds: ["gob"], hitRoll: 15, damageRolls: [4, 5] })));
  });

  it("гортання на I коло показує його заклинання", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "bolt"], slots: { "1": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /^I коло/ }));

    expect(screen.getByText("Крижаний спис")).toBeTruthy();
  });
});
```

(`fakeScene` приймає `{ knownSpells, slots }` і повертає `caster` (= `me` з цими полями) і `castSpell` (= `actions.castSpell.mutateAsync`).)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/wizards/__tests__/spell-book.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `SpellBook.tsx`**

Розмітка — макети G/H (телефон: одна сторінка, що перемикається за кроком) і Q (≥ 1024 px: розворот — ліва сторінка список, права — спел/цілі/кидки/підсумок). Стрічки — `button` з `aria-label={`${ROMAN[l]} коло, слотів ${current}`}` і класами `metalClass(spellTier(l)) metal-fill`, кругла `opacity-55 grayscale` якщо `current === 0 && l > 0`; поточна — ширша.

```tsx
"use client";

import Image from "next/image";
import { Loader2, Sparkles, Swords } from "lucide-react";

import { AiRollButton, DamageDice, DiceGrid } from "./DiceInput";

import { metalClass, Portrait } from "@/components/battle/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { rollsComplete } from "@/lib/utils/battle/flows";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";

type Book = ReturnType<typeof useSpellBook>;

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

const CIRCLE = ["Замовляння", "Перше коло", "Друге коло", "Третє коло", "Четверте коло", "П'яте коло"];

const METAL = ["залізне", "бронзове", "срібне", "золоте", "міфрилове", "платинове"];

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

export function SpellBook({ book }: { book: Book }) {
  const { state, byLevel, slots, selected, targets } = book;

  const wide = useMediaQuery("(min-width: 1024px)");

  const open = state.step !== "closed" && state.step !== "result";

  const slotOf = (l: number) => (l === 0 ? Infinity : slots.find((s) => s.level === l)?.current ?? 0);

  const ribbons = (
    <div className="absolute right-1.5 top-6 z-10 flex flex-col gap-1.5">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          aria-label={`${ROMAN[l]} коло, слотів ${l === 0 ? "∞" : slotOf(l)}`}
          onClick={() => book.setLevel(l)}
          className={cn("hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]", metalClass(spellTier(l)), "metal-fill", state.level === l ? "-ml-2 w-10" : "w-8", l > 0 && slotOf(l) === 0 && "opacity-55 grayscale")}
        >
          {ROMAN[l]}
          <span className="font-sans text-[11px] opacity-85">{l === 0 ? "∞" : slotOf(l)}</span>
        </button>
      ))}
    </div>
  );

  const listPage = (
    <div className="px-5 pb-12 pt-4">
      <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
      <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
        {CIRCLE[state.level]}
        <span className="font-sans text-[13px] font-normal italic tracking-normal text-[#6d7177]">{METAL[state.level]} коло</span>
      </div>
      <div className="my-1 h-px bg-[#2a2018]/35" />
      {(byLevel[state.level] ?? []).length === 0 && <p className="py-6 text-center italic text-[#7a6650]">На цьому колі заклинань немає</p>}
      {(byLevel[state.level] ?? []).map((s) => (
        <button key={s.id} type="button" onClick={() => book.pick(s)} className={cn("flex h-[72px] w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", state.pick?.spellId === s.id && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
          <span className="flex size-10 shrink-0 items-center justify-center border border-[#2a2018] bg-[#2a2018]/5">
            {s.icon ? <Image src={s.icon} alt="" width={26} height={26} className="size-[26px] object-contain" /> : <Sparkles className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="hud-sc block truncate text-[17px] font-bold">{s.name}</span>
            <span className="block truncate text-sm italic text-[#6b5a45]">{[s.savingThrow && `рятівний кидок ${s.savingThrow.ability}`, s.hitCheck && "атака заклинанням", s.range].filter(Boolean).join(" · ")}</span>
          </span>
          {s.diceCount && s.diceType && <span className="w-11 text-right text-[15px] text-[#7a2a1f]">{s.diceCount}{s.diceType}</span>}
        </button>
      ))}
    </div>
  );

  const detailPage = selected && (
    <div className="relative flex h-full flex-col px-5 pb-5 pt-6">
      {state.step === "spell" && (
        <>
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center border border-[#2a2018] bg-[#7a2a1f]/10 text-[#7a2a1f]">
              {selected.icon ? <Image src={selected.icon} alt="" width={44} height={44} /> : <Sparkles className="size-10" />}
            </span>
            <div>
              <div className="hud-sc text-[26px] font-bold leading-[30px]">{selected.name}</div>
              <div className="text-sm italic text-[#7a6650]">{selected.spellGroup?.name ?? "Без школи"} · {CIRCLE[selected.level].toLowerCase()}{selected.concentration ? " · концентрація" : ""}</div>
            </div>
          </div>
          {selected.description && <p className="mt-4 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px] first-letter:text-[#7a2a1f]">{selected.description}</p>}
          <div className="mt-4 grid grid-cols-2 border-t border-[#2a2018]/25">
            {[["Шкода", selected.diceCount && selected.diceType ? `${selected.diceCount}${selected.diceType} ${selected.damageElement ?? ""}` : "—"], ["Дальність", selected.range ?? "—"], ["Влучання", selected.hitCheck ? "атака заклинанням" : selected.savingThrow ? `рятівний ${selected.savingThrow.ability}` : "автоматично"], ["Тривалість", selected.duration ?? "миттєво"]].map(([a, b]) => (
              <div key={a} className="flex h-12 flex-col justify-center border-b border-[#2a2018]/15 odd:border-r odd:pr-3 even:pl-3">
                <span className="text-xs italic text-[#7a6650]">{a}</span>
                <span className="text-base">{b}</span>
              </div>
            ))}
          </div>
          <button type="button" disabled={selected.level > 0 && slotOf(selected.level) === 0} onClick={book.toTargets} className={cn(seal, "mt-auto")}>
            <Swords className="size-5" />{selected.type === "no_target" ? "Далі" : "Обрати цілі"}
          </button>
        </>
      )}
      {state.step === "targets" && (
        <>
          <div className="hud-sc text-xl font-bold">Цілі · {selected.name}</div>
          <div className="mt-3 space-y-2">
            {targets.map((t) => (
              <button key={t.basicInfo.id} type="button" onClick={() => book.toggleTarget(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", state.targetIds.includes(t.basicInfo.id) ? "border-[#7a2a1f] bg-[#7a2a1f]/10" : "border-[#2a2018]/20")}>
                <Portrait participant={t} size={32} />
                <span className="hud-sc font-bold">{t.basicInfo.name}</span>
              </button>
            ))}
          </div>
          <button type="button" disabled={state.targetIds.length === 0} onClick={book.confirmTargets} className={cn(seal, "mt-auto")}>Далі · кидки</button>
        </>
      )}
      {state.step === "rolls" && state.pick && (
        <>
          {state.pick.needsHit && (
            <>
              <div className="hud-sc text-lg font-bold">Влучання · d20</div>
              <DiceGrid sides={20} value={state.hitRoll} onPick={book.setHit} />
            </>
          )}
          {state.pick.needsSaves && state.targetIds.map((id) => {
            const t = targets.find((x) => x.basicInfo.id === id);

            return (
              <label key={id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                Рятівний кидок · {t?.basicInfo.name}
                <input aria-label={`Рятівний кидок ${t?.basicInfo.name}`} inputMode="numeric" className="h-10 w-16 border border-[#2a2018]/30 bg-transparent text-center" value={state.saves[id] ?? ""} onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= 20) book.setSave(id, n); }} />
              </label>
            );
          })}
          {state.pick.diceSlots.length > 0 && (
            <>
              <div className="hud-sc mt-4 text-lg font-bold">Шкода</div>
              <DamageDice slots={state.pick.diceSlots} values={state.damage} onChange={book.setDamage} />
            </>
          )}
          <div className="mt-auto grid grid-cols-[1.25fr_1fr] gap-2 pt-3">
            <AiRollButton onClick={() => { if (state.pick?.needsHit && !state.hitRoll) book.aiHit(); book.aiDamage(); }} />
            <button type="button" disabled={!rollsComplete(state)} onClick={book.toSummary} className={seal}>Далі · підсумок</button>
          </div>
        </>
      )}
      {(state.step === "summary" || state.step === "submitting") && (
        <>
          <div className="hud-sc text-xl font-bold">{selected.name}</div>
          <div className="mt-2 text-[15px]">
            {state.targetIds.length > 0 && <p>Цілі: {state.targetIds.map((id) => targets.find((t) => t.basicInfo.id === id)?.basicInfo.name).join(", ")}</p>}
            {state.hitRoll && <p>Влучання: d20 = {state.hitRoll}</p>}
            {state.damage.length > 0 && <p>Кубики шкоди: {state.damage.join(" + ")} = {state.damage.reduce<number>((a, b) => a + (b ?? 0), 0)}</p>}
            <p className="mt-2 text-sm italic text-[#7a6650]">Остаточну шкоду порахує бій з урахуванням захисту цілей.</p>
            {selected.level > 0 && <p className="text-sm italic text-[#7a6650]">Витратить слот {ROMAN[selected.level]} кола.</p>}
          </div>
          {state.error && <p className="mt-2 text-sm text-[#9c2a1d]">{state.error}</p>}
          <button type="button" disabled={state.step === "submitting"} onClick={book.submit} className={cn(seal, "mt-auto")}>
            {state.step === "submitting" ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" />Застосувати</>}
          </button>
        </>
      )}
    </div>
  );

  const showDetail = state.step !== "book";

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && book.close()} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className="max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]">
      <div className="relative pr-11">
        {ribbons}
        <div className={cn("hud-book relative min-h-[70dvh] bg-[#e9dec5] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]", wide && "grid grid-cols-2")}>
          {(wide || !showDetail) && listPage}
          {(wide || showDetail) && (detailPage ?? (wide && <div className="flex items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>))}
        </div>
      </div>
      {showDetail && !wide && <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-[#e6dccb]">← Назад</button>}
    </ResponsiveDialog>
  );
}
```

(Підписи кроків у тесті: «Обрати цілі», «Далі · кидки», «15» у сітці, «Кубик N (d6)», «Далі · підсумок», «Застосувати» — уже в розмітці.)

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run components/battle/wizards`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/battle/wizards
git add components/battle/wizards lib/hooks/battle/__tests__/fake-scene.tsx
git commit -m "feat(battle-ui): spellbook with metal circles, list and spell pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: `BonusActionPicker` з вибором цілі

**Files:**
- Create: `components/battle/wizards/BonusActionPicker.tsx`
- Test: `components/battle/wizards/__tests__/bonus-picker.test.tsx`

**Interfaces:**
- Consumes: `bonusTargetSide` (Task 8), `useBattleScene`.
- Produces: `<BonusActionPicker participant open onOpenChange onDone />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { BonusActionPicker } from "@/components/battle/wizards/BonusActionPicker";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { ResolvedAbility } from "@/types/abilities";

const heal = { key: "heal", name: "Лікувальний дотик", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d8", target: "eventTarget" }], source: { type: "skill", id: "s", name: "S" } } as ResolvedAbility;

const wind = { key: "wind", name: "Друге дихання", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d10" }], source: { type: "skill", id: "s2", name: "S2" } } as ResolvedAbility;

describe("BonusActionPicker", () => {
  it("уміння без цілі — одразу відправка", async () => {
    const { wrapper, me, bonusAction } = fakeScene({ abilities: [wind] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Друге дихання/ }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "wind" }));
  });

  it("лікування на ціль — список союзників, потім відправка з targetParticipantId", async () => {
    const { wrapper, me, ally, bonusAction } = fakeScene({ abilities: [heal] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Лікувальний дотик/ }));
    expect(screen.queryByRole("button", { name: /Гоблін/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(ally.basicInfo.name) }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "heal", targetParticipantId: ally.basicInfo.id }));
  });
});
```

(`fakeScene({ abilities })` кладе вміння в `me.battleData.resolvedAbilities`, додає союзника `ally` («Годрік») і повертає `bonusAction` = `actions.bonusAction.mutateAsync`.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/wizards/__tests__/bonus-picker.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Zap } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleScene } from "@/lib/hooks/battle";
import { describeEffect } from "@/lib/utils/abilities";
import { withinLimits } from "@/lib/utils/abilities/engine/usage";
import { bonusTargetSide } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function BonusActionPicker({ participant, open, onOpenChange, onDone }: { participant: BattleParticipant; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { allies, enemies, actions } = useBattleScene();

  const [aiming, setAiming] = useState<ResolvedAbility | null>(null);

  const abilities = (participant.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === "bonusAction" && withinLimits(participant, a));

  const fire = async (a: ResolvedAbility, targetId?: string) => {
    await actions.bonusAction.mutateAsync({ participantId: participant.basicInfo.id, abilityKey: a.key, ...(targetId && { targetParticipantId: targetId }) });
    setAiming(null);
    onOpenChange(false);
    onDone();
  };

  const side = aiming ? bonusTargetSide(aiming) : null;

  const candidates = (side === "enemy" ? enemies : allies).filter(isUp);

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) setAiming(null); onOpenChange(o); }} title={aiming ? `${aiming.name} · ціль` : "Бонусна дія"} className="battle-hud border-white/25 bg-[#15110e] text-[var(--bone)]">
      <div className="space-y-2">
        {!aiming && abilities.map((a) => (
          <button key={a.key} type="button" disabled={actions.bonusAction.isPending} onClick={() => (bonusTargetSide(a) ? setAiming(a) : void fire(a))} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left">
            {a.source.icon ? <Image src={a.source.icon} alt="" width={40} height={40} className="size-10 rounded object-cover" /> : <Zap className="size-10 p-2 text-[var(--gold)]" />}
            <span className="min-w-0">
              <span className="hud-sc block font-bold">{a.name}</span>
              <span className="line-clamp-2 block text-xs text-[#a89c88]">{a.description ?? a.effects.map(describeEffect).join(", ")}</span>
            </span>
          </button>
        ))}
        {aiming && candidates.map((t) => (
          <button key={t.basicInfo.id} type="button" disabled={actions.bonusAction.isPending} onClick={() => void fire(aiming, t.basicInfo.id)} className="flex h-14 w-full items-center gap-3 border border-white/15 px-3 text-left">
            <Portrait participant={t} size={36} />
            <span className="hud-sc font-bold">{t.basicInfo.name}</span>
            <span className="ml-auto text-sm text-[#d6cbb7]">{t.combatStats.currentHp} / {t.combatStats.maxHp}</span>
          </button>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
```

(Для ворожих цілей HP числами не показувати — `side === "enemy"` → `HealthLabel` замість чисел. `withinLimits` — існуюча функція з `engine/usage`, сигнатура `(participant, ability)`.)

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run components/battle/wizards`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/battle/wizards
git add components/battle/wizards lib/hooks/battle/__tests__/fake-scene.tsx
git commit -m "feat(battle-ui): bonus action picker asks for a target when the ability aims

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: `ResultOverlay`

**Files:**
- Create: `components/battle/fx/ResultOverlay.tsx`
- Test: `components/battle/fx/__tests__/result-overlay.test.tsx`

**Interfaces:**
- Consumes: `scene.result`, `scene.showResult` (Task 12).
- Produces: `<ResultOverlay />` — повноекранний оверлей за `scene.result`; `DamageFx` уже вбудовано в `ParticipantRow`/`MyHeroPanel` (Tasks 15–16).

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { ResultOverlay } from "@/components/battle/fx/ResultOverlay";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("ResultOverlay", () => {
  it.each([
    [{ kind: "hit", targetName: "Циклоп", damage: 10, downed: true, d20: 14 }, "Влучання", "−10"],
    [{ kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20 }, "Критичне влучання", "−24"],
    [{ kind: "miss", targetName: "Гоблін", d20: 13, known: "≥ 14" }, "Промах", "тепер відомо: AC ≥ 14"],
    [{ kind: "morale-extra", name: "Фрейда", d10: 9, morale: 2 }, "Бойовий дух", "додатковий хід"],
    [{ kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 }, "Паніка", "втрачає хід"],
  ] as const)("%o", (fx, title, detail) => {
    const { wrapper } = fakeScene({ result: fx });

    render(<ResultOverlay />, { wrapper });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(new RegExp(detail))).toBeTruthy();
  });

  it("закривається кнопкою; паніка — сама через 4 с", () => {
    vi.useFakeTimers();

    const { wrapper, showResult } = fakeScene({ result: { kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 } });

    render(<ResultOverlay />, { wrapper });
    act(() => vi.advanceTimersByTime(4_100));
    expect(showResult).toHaveBeenCalledWith(null);

    vi.useRealTimers();

    const second = fakeScene({ result: { kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14 } });

    render(<ResultOverlay />, { wrapper: second.wrapper });
    fireEvent.click(screen.getAllByRole("button", { name: /Деталі шкоди|Далі|До бою/ })[0]);
    expect(second.showResult).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/fx`
Expected: FAIL.

- [ ] **Step 3: Реалізація** — анімації з макетів K–N + «Влучання» (`hit-overlay.html`), кубик без відскоку (`cubic-bezier(.16,1,.3,1)`):

```tsx
"use client";

import { useEffect } from "react";

import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const MORALE_SKIP_MS = 4_000;

const die = "hud-sc flex items-center justify-center font-extrabold [clip-path:polygon(50%_0,100%_38%,82%_100%,18%_100%,0_38%)] animate-[hud-dropin_.7s_cubic-bezier(.16,1,.3,1)_both]";

const cta = "hud-sc mt-8 flex h-[52px] w-full max-w-xs items-center justify-center text-[17px] font-bold tracking-[.06em]";

export function ResultOverlay() {
  const { result, showResult } = useBattleScene();

  useEffect(() => {
    if (result?.kind !== "morale-skip") return;

    const id = setTimeout(() => showResult(null), MORALE_SKIP_MS);

    return () => clearTimeout(id);
  }, [result, showResult]);

  if (!result) return null;

  const close = () => showResult(null);

  const shell = "fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-8 text-center";

  if (result.kind === "morale-extra") {
    return (
      <div className={cn(shell, "bg-[radial-gradient(circle_at_50%_42%,rgba(232,199,122,.35)_0,rgba(10,8,6,.92)_55%)]")}>
        <div className="absolute left-1/2 top-[42%] size-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(rgba(232,199,122,.16)_0_6deg,transparent_6deg_20deg)] [mask:radial-gradient(circle,#000_20%,transparent_65%)] animate-[hud-spin_8s_linear_infinite]" />
        <div className={cn(die, "relative mb-5 size-[88px] bg-[#e8c77a] text-[40px] text-[#2a1d05]")}>{result.d10}</div>
        <div className="hud-sc relative text-[40px] font-extrabold leading-[44px] tracking-[.08em] text-[#f3dc9a] [text-shadow:0_0_24px_rgba(232,199,122,.6)] animate-[hud-rise_.7s_.25s_both]">Бойовий дух</div>
        <div className="relative mt-3 text-base animate-[hud-fade_.5s_.6s_both]">{result.name} отримує додатковий хід наприкінці раунду</div>
        <div className="relative mt-1.5 text-sm text-[#a89c88]">d10 = {result.d10} · мораль {result.morale > 0 ? `+${result.morale}` : result.morale}</div>
        <button type="button" onClick={close} className={cn(cta, "relative border border-[#e6c25a] bg-[#8a6414] text-[#fff3d1]")}>До бою</button>
      </div>
    );
  }

  if (result.kind === "morale-skip") {
    return (
      <div className={cn(shell, "bg-[rgba(6,6,8,.9)] backdrop-grayscale")} onClick={close}>
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 390 812" preserveAspectRatio="none" aria-hidden>
          <path d="M210 0 L190 120 L225 190 L180 300 L205 360 L170 470" fill="none" stroke="rgba(200,200,210,.35)" strokeWidth="2" className="[stroke-dasharray:400] [stroke-dashoffset:400] animate-[hud-crack_.35s_.45s_forwards]" />
        </svg>
        <div className={cn(die, "mb-5 size-[88px] bg-[#3a3a40] text-[40px] text-[#c9c9cf]")}>{result.d10}</div>
        <div className="hud-sc text-[40px] font-extrabold tracking-[.14em] text-[#b9b9c0] animate-[hud-shake-title_.5s_.45s_both]">Паніка</div>
        <div className="mt-3 text-base">{result.name} втрачає хід</div>
        <div className="mt-1.5 text-sm text-[#a89c88]">d10 = {result.d10} · мораль {result.morale}</div>
        <div className="mt-8 h-[3px] w-full max-w-xs bg-[#333]"><i className="block h-full bg-[var(--enemy)]" style={{ animation: `hud-countdown ${MORALE_SKIP_MS}ms 0s linear forwards` }} /></div>
      </div>
    );
  }

  if (result.kind === "miss") {
    return (
      <div className={cn(shell, "bg-[rgba(8,8,10,.86)]")}>
        <div className="relative mb-6 h-10 w-56" aria-hidden>
          {[180, 220, 150].map((w, i) => <i key={i} className="absolute left-0 h-0.5 rounded bg-gradient-to-r from-transparent to-[#9a9aa2] animate-[hud-whoosh_.45s_ease-out_both]" style={{ top: 8 + i * 12, width: w, animationDelay: `${i * 60}ms` }} />)}
        </div>
        <div className="hud-sc text-[40px] font-extrabold tracking-[.2em] text-[#8f8f96]">Промах</div>
        <div className="mt-3 text-base">повз {result.targetName}</div>
        <div className="mt-1.5 text-sm text-[#a89c88]">ваш результат {result.d20} · тепер відомо: AC {result.known}</div>
        <button type="button" onClick={close} className={cn(cta, "border border-[#555] text-[#c9c9cf]")}>Далі</button>
      </div>
    );
  }

  const crit = result.kind === "crit";

  return (
    <div className={cn(shell, crit ? "bg-[radial-gradient(circle_at_50%_40%,rgba(192,57,43,.45),rgba(8,6,5,.94)_60%)]" : "bg-[radial-gradient(circle_at_50%_42%,rgba(156,42,29,.32),rgba(8,6,5,.93)_58%)]")}>
      <div className={cn("absolute left-[-10%] right-[-10%] top-[40%] animate-[hud-slash_.3s_ease-out_both]", crit ? "h-1.5 rotate-[-24deg] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_24px_#ff9a6a]" : "h-[3px] rotate-[-18deg] bg-gradient-to-r from-transparent via-[#e6dccb] to-transparent opacity-80")} />
      <div className={cn("hud-sc relative font-extrabold tracking-[.12em] animate-[hud-rise_.5s_.35s_both]", crit ? "text-[34px] leading-10 text-[#ffd9a8]" : "text-[34px] text-[var(--ink)]")}>{crit ? "Критичне влучання" : "Влучання"}</div>
      <div className={cn("hud-sc relative mt-4 font-extrabold animate-[hud-pop_.45s_.65s_cubic-bezier(.16,1,.3,1)_both]", crit ? "text-[64px] text-[#ff6a4d] [text-shadow:0_0_30px_rgba(255,90,60,.7)]" : "text-[52px] text-[#e9705a]")}>−{result.damage}</div>
      <div className="relative mt-3 text-[15px] text-[#d9cfbd]">{result.targetName}{result.downed ? " · повалений" : ""}</div>
      <div className="relative mt-1.5 text-sm text-[#a89c88]">d20 = {result.d20}{result.weapon ? ` · ${result.weapon}` : ""}</div>
      <button type="button" onClick={close} className={cn(cta, "relative border border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc]")}>Деталі шкоди</button>
    </div>
  );
}
```

(Додати `@keyframes hud-crack { to { stroke-dashoffset: 0; } }` у `battle-hud.css`. «Деталі шкоди» закриває оверлей; розбивку бачать у журналі/деталях учасника — окремого екрана розбивки після удару не робимо, щоб не дублювати J.)

- [ ] **Step 4: Тести зелені**

Run: `pnpm test:run components/battle/fx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/battle/fx components/battle/hud
git add components/battle/fx components/battle/hud lib/hooks/battle
git commit -m "feat(battle-ui): result overlays for hit, crit, miss and morale

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Розкладки, `BattleScreen`, DM, підключення сторінки

**Files:**
- Create: `components/battle/scene/MyTurnControls.tsx`, `MobileBattleLayout.tsx`, `DesktopBattleLayout.tsx`, `BattleScreen.tsx`, `DmPanel.tsx`, `CompleteBattleDialog.tsx`
- Modify: `app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx` (рендер `BattleScreen` замість `LegacyBattlePage`), `components/battle/views/BattlePreparationView.tsx` (без змін пропсів — передати з контексту)
- Delete: `app/campaigns/[id]/battles/[battleId]/LegacyBattlePage.tsx`
- Test: `components/battle/scene/__tests__/screen.test.tsx`

**Interfaces:**
- Consumes: усе з Tasks 12–20; `DmQuickActionsPanel`, `AddParticipantDialog`, `ChangeHpDialog`, `DmCasterPickerDialog`, `useBattlePageDialogs` (лишаються).
- Produces: `<BattleScreen />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

const media = vi.hoisted(() => ({ wide: false }));

vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => media.wide }));

import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("BattleScreen", () => {
  it("телефон, не мій хід: вкладки, «ходить», мій герой, без кнопок дій", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(screen.getByRole("tab", { name: /Вороги/ })).toBeTruthy();
    expect(screen.getByText(/ходить/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Атака/ })).toBeNull();
  });

  it("телефон, мій хід: банер і дії", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: true });

    render(<BattleScreen />, { wrapper });

    expect(screen.getByText("Твій хід")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Атака/ })).toBeTruthy();
  });

  it("десктоп: союзники і вороги поруч, журнал праворуч", () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Союзники ·/)).toBeTruthy();
    expect(screen.getByText(/Вороги ·/)).toBeTruthy();
    expect(screen.getByText("Журнал")).toBeTruthy();
  });
});
```

(`fakeScene({ isMyTurn })` задає `isMyTurn`, `hero`, `current`, `queue`, `allies`, `enemies`, `battle.status: "active"`, `toast`, `result: null`.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/battle/scene/__tests__/screen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `MyTurnControls.tsx`**

Ключ ставить батько: `key={`${hero.basicInfo.id}-${battle.currentRound}-${hero.battleData.extraTurnActive ? "x" : "n"}`}` — стан ходу скидається ремаунтом.

```tsx
"use client";

import { useState } from "react";

import { ActionGrid } from "./ActionGrid";
import { TurnCountdown } from "./TurnCountdown";

import { AiRollButton, DiceGrid } from "@/components/battle/wizards/DiceInput";
import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { BonusActionPicker } from "@/components/battle/wizards/BonusActionPicker";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { rollDie, useAttackWizard, useBattleScene, usePlayerTurn, useSpellBook } from "@/lib/hooks/battle";
import { COUNTDOWN_SECONDS } from "@/lib/utils/battle/flows";
import type { BattleParticipant } from "@/types/battle";

export function MyTurnControls({ hero }: { hero: BattleParticipant }) {
  const { anyPending, isDM } = useBattleScene();

  const turn = usePlayerTurn(hero);

  const attack = useAttackWizard(hero, turn.afterAction);

  const book = useSpellBook(hero, { allSpells: isDM, onDone: turn.afterAction });

  const [bonusOpen, setBonusOpen] = useState(false);

  const bonusAbilities = (hero.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === "bonusAction");

  const hasMagic = Object.values(hero.spellcasting?.spellSlots ?? {}).some((s) => s.current > 0) || (hero.spellcasting?.knownSpells.length ?? 0) > 0;

  return (
    <>
      {turn.phase === "morale" && (
        <div className="pt-3">
          <div className="hud-sc text-lg font-bold">Перевірка моралі · d10</div>
          <DiceGrid sides={10} onPick={(v) => void turn.rollMorale(v)} />
          <div className="mt-2"><AiRollButton onClick={() => void turn.rollMorale(rollDie(10))} /></div>
        </div>
      )}
      {(turn.phase === "acting" || turn.phase === "countdown") && (
        <ActionGrid
          turn={turn}
          pending={anyPending}
          labels={{ attack: hero.battleData.attacks.map((a) => a.name).join(" · ") || "без зброї", magic: hasMagic ? "книга заклинань" : "немає", bonus: bonusAbilities[0]?.name ?? "немає" }}
          available={{ magic: hasMagic, bonus: bonusAbilities.length > 0 }}
          actions={{ attack: attack.open, magic: () => book.open(), bonus: () => setBonusOpen(true) }}
        />
      )}
      {turn.phase === "countdown" && <TurnCountdown seconds={COUNTDOWN_SECONDS} onElapsed={() => void turn.endTurn()} onStay={turn.stay} />}
      <AttackWizard wizard={attack} />
      <SpellBook book={book} />
      <BonusActionPicker participant={hero} open={bonusOpen} onOpenChange={setBonusOpen} onDone={turn.afterAction} />
    </>
  );
}
```

- [ ] **Step 4: Розкладки**

`MobileBattleLayout.tsx`:

```tsx
"use client";

import { useState } from "react";

import { BattleLog } from "./BattleLog";
import { BattleTopBar } from "./BattleTopBar";
import { ConnectionBanner } from "./ConnectionBanner";
import { InitiativeTrack } from "./InitiativeTrack";
import { LastActionTicker } from "./LastActionTicker";
import { MyHeroPanel } from "./MyHeroPanel";
import { MyTurnControls } from "./MyTurnControls";
import { ParticipantDetails } from "./ParticipantDetails";
import { ParticipantList } from "./ParticipantList";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

export function MobileBattleLayout() {
  const { battle, current, hero, isMyTurn, allies, enemies, selectedId, select } = useBattleScene();

  const [tab, setTab] = useState<"ally" | "enemy">("enemy");

  const [logOpen, setLogOpen] = useState(false);

  const selected = battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;

  const tabBtn = (side: "ally" | "enemy", label: string, n: number) => (
    <button role="tab" aria-selected={tab === side} type="button" onClick={() => setTab(side)} className={cn("hud-sc flex flex-1 items-center justify-center gap-2 text-[15px] tracking-[.08em]", tab === side ? "text-[var(--ink)] shadow-[inset_0_-2px_0_var(--enemy)]" : "text-[var(--muted)]")}>
      {label} {n}
    </button>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ConnectionBanner />
      <BattleTopBar />
      <InitiativeTrack />
      <LastActionTicker onOpenLog={() => setLogOpen(true)} />
      {isMyTurn ? (
        <div className="hud-sc mx-4 mt-2 flex h-10 items-center justify-center gap-3 border-y border-[var(--enemy)] bg-[var(--enemy)]/20 text-[17px] tracking-[.12em] text-[var(--ink)]">Твій хід</div>
      ) : (
        <div className="flex h-8 items-center gap-2 px-4 text-[15px] italic text-[#b8ab95]">ходить <b className="hud-sc not-italic text-[var(--ink)]">{current?.basicInfo.name}</b></div>
      )}
      <div role="tablist" className="mx-4 flex h-11 border-b border-white/[.18]">
        {tabBtn("ally", "Союзники", allies.length)}
        {tabBtn("enemy", "Вороги", enemies.length)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ParticipantList side={tab} />
      </div>
      {hero && (
        <div className="border-t border-white/[.22] bg-black/70 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <MyHeroPanel hero={hero} compact={isMyTurn} />
          {isMyTurn && <MyTurnControls key={`${hero.basicInfo.id}-${battle.currentRound}-${hero.battleData.extraTurnActive ? "x" : "n"}`} hero={hero} />}
        </div>
      )}
      <ResponsiveDialog open={!!selected} onOpenChange={(o) => !o && select(null)} title="Учасник" className="battle-hud border-white/25 bg-[#15110e] text-[var(--bone)]">
        {selected && <ParticipantDetails participant={selected} />}
      </ResponsiveDialog>
      <ResponsiveDialog open={logOpen} onOpenChange={setLogOpen} title="Журнал" className="battle-hud border-white/25 bg-[#15110e] text-[var(--bone)]">
        <BattleLog />
      </ResponsiveDialog>
    </div>
  );
}
```

`DesktopBattleLayout.tsx`:

```tsx
"use client";

import { BattleLog } from "./BattleLog";
import { BattleTopBar } from "./BattleTopBar";
import { ConnectionBanner } from "./ConnectionBanner";
import { DmPanel } from "./DmPanel";
import { InitiativeTrack } from "./InitiativeTrack";
import { LastActionTicker } from "./LastActionTicker";
import { MyHeroPanel } from "./MyHeroPanel";
import { MyTurnControls } from "./MyTurnControls";
import { ParticipantDetails } from "./ParticipantDetails";
import { ParticipantList } from "./ParticipantList";

import { useBattleScene } from "@/lib/hooks/battle";

const H3 = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <h3 className="hud-sc flex h-8 items-center gap-2 border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">
    <i className="size-2 rounded-full" style={{ background: color }} />
    {children}
  </h3>
);

export function DesktopBattleLayout({ onComplete }: { onComplete: () => void }) {
  const { battle, hero, isMyTurn, isDM, allies, enemies, selectedId, select } = useBattleScene();

  const selected = battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ConnectionBanner />
      <BattleTopBar onComplete={onComplete} />
      <div className="flex h-20 items-center border-y border-white/[.08]">
        <div className="min-w-0 flex-1"><InitiativeTrack /></div>
        <div className="w-[420px] shrink-0"><LastActionTicker /></div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="flex flex-col gap-3 overflow-y-auto border-r border-white/10 p-5">
          {hero && <MyHeroPanel hero={hero} />}
          {isMyTurn && hero && <MyTurnControls key={`${hero.basicInfo.id}-${battle.currentRound}-${hero.battleData.extraTurnActive ? "x" : "n"}`} hero={hero} />}
          {!isMyTurn && !isDM && <div className="flex h-11 items-center justify-center border border-dashed border-white/[.18] text-sm italic text-[var(--muted)]">Дії стануть доступні у твій хід</div>}
          {isDM && <DmPanel />}
        </aside>
        <main className="grid min-h-0 grid-cols-2 gap-6 overflow-y-auto px-6 py-4">
          <div className="min-w-0"><H3 color="var(--ally)">Союзники · {allies.length}</H3><ParticipantList side="ally" /></div>
          <div className="min-w-0"><H3 color="var(--enemy)">Вороги · {enemies.length}</H3><ParticipantList side="enemy" /></div>
        </main>
        <aside className="flex min-h-0 flex-col overflow-y-auto border-l border-white/10 px-5 py-4">
          <h3 className="hud-sc flex h-8 items-center justify-between border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">
            {selected ? "Учасник" : "Журнал"}
            {selected && <button type="button" onClick={() => select(null)} className="font-sans text-[13px] font-normal tracking-normal text-[var(--muted)]">← журнал</button>}
          </h3>
          {selected ? <div className="pt-3"><ParticipantDetails participant={selected} /></div> : <BattleLog />}
        </aside>
      </div>
    </div>
  );
}
```

(`ParticipantList` має приймати `className` для відступу: на десктопі `px-0`. Тест «десктоп» шукає «Журнал» — є.)

`DmPanel.tsx` — обгортка над існуючими DM-компонентами з контекстом:

```tsx
"use client";

import { useState } from "react";

import { AddParticipantDialog } from "@/components/battle/dialogs/AddParticipantDialog";
import { ChangeHpDialog } from "@/components/battle/dialogs/ChangeHpDialog";
import { DmCasterPickerDialog } from "@/components/battle/dialogs/DmCasterPickerDialog";
import { DmQuickActionsPanel } from "@/components/battle/panels";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useBattlePageDialogs, useBattleScene, useSpellBook } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

export function DmPanel() {
  const { battle, campaignId, dmControlledId, setDmControlledId, actions } = useBattleScene();

  const dialogs = useBattlePageDialogs();

  const [pickCaster, setPickCaster] = useState(false);

  const [caster, setCaster] = useState<BattleParticipant | null>(null);

  const book = useSpellBook(caster, { allSpells: true });

  return (
    <>
      <DmQuickActionsPanel
        battle={battle}
        isDM
        onOpenLog={dialogs.openLog}
        onAddParticipant={dialogs.openAddParticipant}
        onIncreaseHp={dialogs.openHpDialog}
        onRemoveFromBattle={(p) => void actions.updateParticipant.mutateAsync({ participantId: p.basicInfo.id, data: { removeFromBattle: true } })}
        onCompleteBattle={(result) => void actions.complete.mutateAsync({ result })}
        onTakeControl={(p) => setDmControlledId(p?.basicInfo.id ?? null)}
        dmControlledParticipantId={dmControlledId}
        logPanelOpen={dialogs.logPanelOpen}
        setLogPanelOpen={dialogs.setLogPanelOpen}
        onRollback={(actionIndex) => void actions.rollback.mutateAsync({ actionIndex })}
        onOpenCastSpell={() => setPickCaster(true)}
      />
      <AddParticipantDialog open={dialogs.addParticipantDialogOpen} onOpenChange={dialogs.setAddParticipantDialogOpen} campaignId={campaignId} isPending={actions.addParticipant.isPending}
        onAdd={(data) => void actions.addParticipant.mutateAsync(data).then(() => dialogs.setAddParticipantDialogOpen(false))} />
      <ChangeHpDialog open={dialogs.hpDialogParticipant !== null} onOpenChange={(o) => !o && dialogs.closeHpDialog()} participant={dialogs.hpDialogParticipant} isPending={actions.updateParticipant.isPending}
        onConfirm={(participantId, newHp) => { void actions.updateParticipant.mutateAsync({ participantId, data: { currentHp: newHp } }); dialogs.closeHpDialog(); }} />
      <DmCasterPickerDialog open={pickCaster} onOpenChange={setPickCaster} participants={battle.initiativeOrder}
        onSelectCaster={(p) => { setCaster(p); setPickCaster(false); book.open(undefined, p); }} />
      <SpellBook book={book} />
    </>
  );
}
```

(Кастер змінюється в тому самому кліку, тож `open` отримує його аргументом. Звірити тип `rollback` у `DmQuickActionsPanel.onRollback` — `actionIndex: number`.)

`CompleteBattleDialog.tsx` — перенести діалог «Завершити бій?» зі старого `BattleHeader.tsx` (кнопки Скасувати / Поразка / Авто / Перемога → `actions.complete.mutateAsync({ result })`, потім `onOpenChange(false)`).

`BattleScreen.tsx`:

```tsx
"use client";

import { useState } from "react";

import { BattleToast } from "./BattleToast";
import { CompleteBattleDialog } from "./CompleteBattleDialog";
import { DesktopBattleLayout } from "./DesktopBattleLayout";
import { MobileBattleLayout } from "./MobileBattleLayout";

import { ResultOverlay } from "@/components/battle/fx/ResultOverlay";
import { hudFontClassName } from "@/components/battle/hud";
import { BattlePreparationView } from "@/components/battle/views/BattlePreparationView";
import { useBattleScene } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

export function BattleScreen() {
  const { battle, isDM, actions } = useBattleScene();

  const wide = useMediaQuery("(min-width: 1024px)", true);

  const [completeOpen, setCompleteOpen] = useState(false);

  if (battle.status === "prepared") {
    const count = (side: string) => battle.participants.filter((p) => p.side === side).reduce((s, p) => s + (p.quantity ?? 1), 0);

    return (
      <div className={cn("battle-hud h-dvh", hudFontClassName)}>
        <BattlePreparationView battle={battle} alliesCount={count("ally")} enemiesCount={count("enemy")} isDM={isDM} onStartBattle={() => void actions.start.mutateAsync({})} isStarting={actions.start.isPending} />
      </div>
    );
  }

  return (
    <div className={cn("battle-hud", hudFontClassName)}>
      {wide ? <DesktopBattleLayout onComplete={() => setCompleteOpen(true)} /> : <MobileBattleLayout />}
      <ResultOverlay />
      <BattleToast />
      <CompleteBattleDialog open={completeOpen} onOpenChange={setCompleteOpen} />
    </div>
  );
}
```

`BattlePageClient.tsx` — імпорт `@/components/battle/hud/battle-hud.css`, рендер `<BattleScreen />` замість `LegacyBattlePage`; стани завантаження/помилки — `LoadingState`/`ErrorState` з `components/common/states` усередині `battle-hud`-обгортки (перенесена знахідка «екрани завантаження з власною розміткою»). Видалити `LegacyBattlePage.tsx` і `BattlePageLoadingState.tsx`, `loading.tsx` перевести на `LoadingState`.

- [ ] **Step 5: Тести зелені, типи, лінт**

Run: `pnpm test:run components/battle && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A components/battle app/campaigns
git commit -m "feat(battle-ui): mobile and desktop battle layouts wired to the scene

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Фаза G — прибирання і перевірка

### Task 22: Видалити старий бойовий UI, роут розбивки, оновити документацію

**Files:**
- Delete (`git rm`): `components/battle/views/{PlayerTurnView,PlayerTurnViewDialogs,PlayerTurnHud,TurnStartScreen,BattleFieldView}.tsx`, `components/battle/cards/ParticipantCard.tsx`, `components/battle/cards/participant-card/`, `components/battle/InitiativeTimeline.tsx`, `components/battle/ParticipantStats.tsx`, `components/battle/BattleHeader.tsx`, `components/battle/RollResultOverlay.tsx`, `components/battle/ActionButtonsPanel.tsx`, `components/battle/dialogs/{TargetSelectionDialog,AttackRollDialog,DamageRollDialog,DamageSummaryModal,DamageSummaryContent,SpellDialog,SpellResultModal,MoraleCheckDialog,BonusActionPickerDialog,CounterAttackResultDialog}.tsx`, `components/battle/dialogs/spell-dialog/`, `components/battle/overlays/`, `app/campaigns/[id]/battles/[battleId]/BattlePageDialogs/`, `lib/hooks/battle/{useAttackFlow,useAttackFlow-handlers,useBattleSceneLogic,useBattleSceneLogic-effects,useBattleSceneLogic-handlers,useMoraleOverlay,useDamageFlash,useDamageBreakdown}.ts`, `app/api/campaigns/[id]/battles/[battleId]/damage-breakdown/`, `app/api/campaigns/[id]/battles/[battleId]/attack-and-next-turn/` (клієнт уже шле `attack` з `endTurn`; перевірити `grep -rn "attack-and-next-turn" app lib scripts` — лише роут і його тест), відповідні `__tests__` видалених модулів.
- Modify: `lib/api/battles.ts` (прибрати `getDamageBreakdown`, `attackAndNextTurn`, `spellPreview`), `lib/api/battles-types.ts` (прибрати `DamageBreakdown*`, `SpellPreviewResponse`), бар-ели `components/battle/dialogs/index.ts`, `components/battle/panels/index.ts`, `lib/hooks/battle/index.ts`.
- Modify: `docs/ARCHITECTURE.md` (розділ про бій), `CLAUDE.md` («Battle data flow»).

- [ ] **Step 1: Знайти всіх споживачів перед видаленням**

Run: `for m in PlayerTurnView BattleFieldView ParticipantCard InitiativeTimeline ParticipantStats BattleHeader RollResultOverlay SpellDialog DamageRollDialog useAttackFlow useBattleSceneLogic useMoraleOverlay useDamageFlash useDamageBreakdown getDamageBreakdown spellPreview attackAndNextTurn CounterAttackResultDialog; do echo "== $m"; grep -rln "$m" app components lib scripts | grep -v __tests__; done`
Expected: кожен модуль імпортують лише інші модулі зі списку видалення. Якщо щось поза списком (наприклад, `ParticipantStats` у профілі персонажа або `InitiativeTimeline` на DM-сторінці) — не видаляти цей модуль, лише прибрати бойові імпорти.

- [ ] **Step 2: Видалити і прибрати барели**

```bash
git rm -r <файли зі списку, що пройшли Step 1>
```

Прибрати їх експорти з барелів і мертві функції з `lib/api/battles.ts` / `battles-types.ts`.

- [ ] **Step 3: Документація**

`CLAUDE.md`, розділ «Battle data flow» — замінити перші два пункти на:

```markdown
Page `app/campaigns/[id]/battles/[battleId]/page.tsx` (server: userId) → `BattlePageClient` → `useBattleSceneValue` + `BattleSceneProvider` (`lib/hooks/battle`) → `BattleScreen` (`components/battle/scene`: мобільна < 1024 px / десктопна розкладка) → мутації `lib/hooks/battles/useBattles.ts` через `useBattleAction` → `lib/api/battles.ts` → route `app/api/campaigns/[id]/battles/[battleId]/<action>/route.ts`.

- **Every battle route** is a Zod schema + `runBattleMutation` … (як було) … saves with an optimistic `version` lock and answers `{ delta, response? }` (`ClientBattleDelta`); Pusher gets `battle-delta` (or `{ refetch: true }` above 9 500 bytes) after the response (`after()`).
- **Client cache:** `applyBattleDelta` (`lib/utils/battle/client`) patches the cached `BattleScene`; an old version is ignored, a gap → one GET. `useBattleAction` sends `expectedVersion`; 409 → refetch + battle toast. Wizards (attack, spellbook, player turn) are reducers in `lib/utils/battle/flows`; what a player may see (health states, known AC, observed traits, turn queue) is `lib/utils/battle/view`.
```

Пункт про «Client compatibility … battle-updated …» видалити. У `docs/ARCHITECTURE.md` відповідний розділ (українською) оновити тими ж фактами.

- [ ] **Step 4: Повний прогін**

Run: `pnpm lint && pnpm test:run && pnpm build`
Expected: усе зелене. `pnpm build` — з локальними env; якщо падає на мережі до Supabase/Pusher, зафіксувати текст помилки й перевірити, чи це не з нашого коду.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(battle): remove the old battle UI, damage-breakdown route and legacy events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Перевірка: симуляція, браузер, egress

**Files:** — (лише перевірки; знахідки фіксуються окремими комітами з тестом, що спершу падає)

- [ ] **Step 1: Симуляція бою**

Перевірити `.env.local` (`DATABASE_URL`, `DIRECT_URL` — `localhost:54322`); за потреби `open -a Docker` → `pnpm db:local`.
Run: `pnpm simulate-battle`
Expected: `✅ Перевірок: 34, провалено: 0`. Записати URL бою з виводу.

- [ ] **Step 2: Телефон 390 px і < 640 px**

`pnpm dev`; завантажити Chrome-інструменти (`tabs_context_mcp`, `navigate`, `computer`, `javascript_tool`, `resize_window`). Перша компіляція сторінки бою > 10 с — чекати. Перевірити:
1. Пряме вікно найвужче (~606 px, < 640 = мобільна верстка): вкладки, «ходить», «мій герой» унизу, без горизонтального скролу (`document.documentElement.scrollWidth <= innerWidth`).
2. Iframe 390 px на тому ж origin (`javascript_tool`: вставити `<iframe src=location.href width=390 height=844>`): ті самі пункти, кнопки дій у нижній третині, «Твій хід» на ході гравця.
3. Хід гравця: атака (ціль → d20 → шкода → підсумок → «Влучання»), промах (оверлей «Промах», «тепер відомо: AC ≥ …»), книга (стрічки-метали, коло без слотів тьмяне, спел → цілі → кидки → застосувати), бонусна дія з ціллю, відлік «Залишитись», «Завершити хід» з невикористаною дією питає підтвердження.
4. Мораль: учасник з моралью ≠ 0 → сітка d10 → оверлей «Бойовий дух» / «Паніка» / тост; додатковий хід видно наприкінці раунду в треку з «+».
5. Анімації: шкода по ворогу (тряска, число, смуга), лікування (зелене), шкода по моєму герою (віньєтка).

Записати GIF ходу гравця (`gif_creator`, ім'я `mobile-battle-turn.gif`).

- [ ] **Step 3: Десктоп 1280 px, гравець і DM**

Вікно 1280×800: три колонки, клік по учаснику → деталі праворуч, «← журнал». DM: ліва колонка — `DmQuickActionsPanel`, HP і AC ворогів числами, «Скинути бій» питає підтвердження, кнопка «Наступний хід» не змінює ширину під час запиту, DM-заклинання через вибір кастера відкриває книгу.

- [ ] **Step 4: Egress — немає GET бою на звичайну дію**

Два вікна (DM і гравець). У вкладці гравця `read_network_requests` з фільтром `battles/` перед і після атаки DM: після дії немає `GET /api/campaigns/<id>/battles/<battleId>`; лише POST дії у вікні DM. Старт бою з 10+ учасниками — у гравця рівно один GET (refetch-сигнал).

- [ ] **Step 5: Подвійний тап**

У DevTools (`javascript_tool`) двічі поспіль викликати клік по «Атакувати» в підсумку (або двічі `fetch` next-turn з тією самою `expectedVersion`): другий запит — 409, у UI тост «Стан бою змінився, повторіть дію», дія не задвоїлась у журналі.

- [ ] **Step 6: iPhone (вручну, користувач)**

Записати в звіт пункт для користувача: на реальному iPhone відкрити шторку (деталі учасника) і викликати тост/підтвердження поверх — прокрутка фону не стрибає.

- [ ] **Step 7: Звіт**

Підсумок перевірок (що пройшло, що ні, скріни/GIF), знахідки — окремими комітами з тестом, що спершу падає.
