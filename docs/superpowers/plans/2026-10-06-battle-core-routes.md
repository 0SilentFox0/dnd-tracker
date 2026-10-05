# Ядро бою, частина B — перенесення роутів: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести всі battle-роути на `runBattleMutation` і нормалізоване сховище одним релізом, зберігши роботу нинішнього клієнта.

**Architecture:** Кожен роут — Zod-схема + `runBattleMutation` з `mutate`, винесеним у сусідній `*-mutation.ts` (чиста функція над движком, DB-читання через інжектовані залежності). Пайплайн отримує сумісний шар: відповідь і Pusher-події у формі старого `BattleScene` (`battle-updated`, `battle-started`, `battle-completed`, `turn-started`), а журнал передається приростом (`battleLogMode: "append"`), який клієнтський `mergeBattleCache` доклеює до кешу. Два движки ходу зливаються в один `advanceTurn`. Відкат — через `battle_snapshots`.

**Tech Stack:** Next.js 16 route handlers, Prisma 6, Zod, TanStack Query, Pusher, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-battle-storage-redesign-design.md` (§5–§8, §12 етап 3). Частина A: `docs/superpowers/plans/2026-10-06-battle-core-store-pipeline.md`.

## Global Constraints

- Схема БД не змінюється (legacy JSON-колонки лишаються, але після цього плану ніхто в них не пише; contract-міграція — окремо).
- Движок правил не змінюється. Виправлення правил (спека §10) — частина C. Поведінка, яку змінює цей план, обмежена: (1) обидва шляхи ходу застосовують і чистять `pendingMoraleCheck`; (2) `/attack` використовує `runAttackPhase` замість `executeAttack`; (3) відкат працює на будь-який крок. Інше — як було.
- Клієнт не переписується; дозволені лише зміни в `types/api.ts`, `lib/hooks/battles/useBattles-cache.ts`, `lib/hooks/battle/usePusherBattleSync.ts`.
- Pusher: подія `battle-updated` несе сумісний payload, якщо він ≤ 9 500 байт, інакше `{ type: "battle-updated", battleId }`; `battle-delta` більше не шлеться.
- Журнал: `actionIndex` у клієнті = `seq` події.
- Інтеграційні тести, що пишуть у БД, — лише проти localhost.
- Імпорти через `@/…`; `padding-line-between-statements`; мінімальні коментарі.

## Review Focus

1. **Відповідь мутації і Pusher-payload для іншого гравця не містять `isDM`/`userRole` того, хто діяв** → у інших клієнтів ці поля не перезаписуються (тест у Task 3).
2. **Light-payload `battle-updated` у клієнта, який щойно сам оновив кеш** → клієнт рефетчить (без 8-секундного пропуску) (тест у Task 9).
3. **Відповідь із меншою версією, ніж у кеші** (Pusher-ехо після відповіді наступної дії) → кеш не відкочується (тест у Task 9).
4. **Відкат на подію в середині багатоподійної дії** (наприклад, атака + перехід ходу) → відкат до знімка першої події цієї дії, скасування всіх подій від неї (тест у Task 7 і в інтеграційному тесті Task 10).
5. **Гравець, чий учасник впав від реакції під час власного ходу, тисне «Наступний хід»** → хід передається (доступ `currentController` не вимагає «живого» учасника) (тест у Task 3).

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `lib/utils/battle/store/event-mapping.ts` | Create | `battleActionToEvent`, `eventToBattleAction`, `systemEvent` |
| `lib/utils/battle/store/history.ts` | Create | `loadRecentEvents`, `loadSnapshotsFrom`, `restoreParticipantsAt` |
| `lib/utils/battle/store/load-battle.ts` | Modify | явний `select` + `meta` |
| `lib/utils/battle/store/save-battle.ts` | Modify | `history` (скасування/очищення журналу) |
| `lib/utils/battle/store/types.ts` | Modify | `BattleMeta`, `LoadedBattle.meta`, `BattleMutationOutcome.history` |
| `lib/utils/battle/pipeline/legacy-battle.ts` | Create | `toLegacyBattle`, `buildPusherMessages` |
| `lib/utils/battle/pipeline/compat-errors.ts` | Create | `toPipelineError` |
| `lib/utils/battle/pipeline/run-battle-mutation.ts` | Modify | `currentController`, `dryRun`, `respond`, `includeRecentEvents`, сумісні відповідь і події |
| `lib/utils/battle/pipeline/default-deps.ts` | Modify | `publish(messages[])`, `loadRecentEvents` |
| `lib/utils/battle/turn/*` | Create (git mv) | `advanceTurn` + перенесені `runAdvanceTurnLoop`, `applyPendingMoraleCheck`, `applyVictoryCompletion`, `PendingMoraleCheckPayload` |
| `app/api/campaigns/[id]/battles/[battleId]/**/route.ts` | Rewrite | тонкі роути |
| `app/api/campaigns/[id]/battles/[battleId]/**/*-mutation.ts` | Create | `mutate` кожного роуту |
| `app/api/__tests__/battles/*.test.ts` | Create | тести мутацій |
| `tests/integration/battle-flow.integration.test.ts` | Create | старт → атака → хід → відкат на локальній БД |
| `types/api.ts` | Modify | `version`, `battleLogMode`, `battleLogCancelledFrom`, `pendingMoraleCheck` |
| `lib/hooks/battles/useBattles-cache.ts` | Modify | append-журнал і захист від старих версій |
| `lib/hooks/battle/usePusherBattleSync.ts` | Modify | без 8-секундного пропуску |
| `lib/utils/battle/strip-battle-payload.ts`, `get-battle-with-access.ts`, `attack/attack-handler.ts`, `attack-and-next-turn/advance-turn-phase.ts` (+тест) | Delete | |

---

### Task 1: Відображення подій ↔ `BattleAction`

**Files:**
- Create: `lib/utils/battle/store/event-mapping.ts`, `lib/utils/battle/store/__tests__/event-mapping.test.ts`
- Modify: `lib/utils/battle/store/index.ts` (додати `export * from "./event-mapping";`)

**Interfaces:**
- Produces:
```ts
battleActionToEvent(action: BattleAction): NewBattleEvent
eventToBattleAction(e: StoredBattleEvent, battleId: string, meta?: { createdAt?: Date; cancelledAt?: Date | null }): BattleAction
systemEvent(round: number, resultText: string): NewBattleEvent
```
`details` події = `{ actorName, actorSide, actionDetails }`; `actionIndex` = `seq`; `id` = `` `${battleId}-${seq}` ``; `isCancelled` = `Boolean(cancelledAt)`.

- [ ] **Step 1: Тест**
```ts
import { describe, expect, it } from "vitest";

import { battleActionToEvent, eventToBattleAction, systemEvent } from "@/lib/utils/battle/store/event-mapping";
import type { BattleAction } from "@/types/battle";

const action: BattleAction = {
  id: "x",
  battleId: "b1",
  round: 2,
  actionIndex: 7,
  timestamp: new Date("2026-01-01"),
  actorId: "hero",
  actorName: "Арвен",
  actorSide: "ally",
  actionType: "attack",
  targets: [{ participantId: "gob", participantName: "Гоблін" }],
  actionDetails: { weaponName: "Меч", totalDamage: 6 },
  resultText: "Арвен влучає",
  hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 7, newHp: 1, change: 6 }],
  isCancelled: false,
};

describe("event mapping", () => {
  it("BattleAction → подія → BattleAction зберігає все, що бачить клієнт", () => {
    const event = battleActionToEvent(action);

    const back = eventToBattleAction({ ...event, seq: 12, actorId: event.actorId ?? null, targets: event.targets ?? [], details: event.details ?? {}, hpChanges: event.hpChanges ?? [] }, "b1", { createdAt: new Date("2026-01-01") });

    expect(back).toMatchObject({
      id: "b1-12",
      actionIndex: 12,
      round: 2,
      actorId: "hero",
      actorName: "Арвен",
      actorSide: "ally",
      actionType: "attack",
      targets: action.targets,
      actionDetails: action.actionDetails,
      resultText: "Арвен влучає",
      hpChanges: action.hpChanges,
      isCancelled: false,
    });
  });

  it("скасована подія — isCancelled", () => {
    const e = { ...battleActionToEvent(action), seq: 1, actorId: "hero", targets: [], details: {}, hpChanges: [] };

    expect(eventToBattleAction(e, "b1", { cancelledAt: new Date() }).isCancelled).toBe(true);
  });

  it("системна подія — від імені «Система»", () => {
    const e = systemEvent(3, "Тригери після зміни HP: …");

    const back = eventToBattleAction({ ...e, seq: 2, actorId: e.actorId ?? null, targets: [], details: e.details ?? {}, hpChanges: [] }, "b1");

    expect(back).toMatchObject({ actorId: "system", actorName: "Система", actionType: "ability", round: 3 });
  });
});
```
- [ ] **Step 2:** `pnpm test:run lib/utils/battle/store/__tests__/event-mapping.test.ts` → FAIL (модуль не знайдено).
- [ ] **Step 3: Реалізація**
```ts
import type { NewBattleEvent, StoredBattleEvent } from "./types";

import type { BattleAction } from "@/types/battle";

type EventDetails = {
  actorName?: string;
  actorSide?: BattleAction["actorSide"];
  actionDetails?: BattleAction["actionDetails"];
};

export function battleActionToEvent(action: BattleAction): NewBattleEvent {
  return {
    type: action.actionType,
    round: action.round,
    actorId: action.actorId,
    targets: action.targets,
    hpChanges: action.hpChanges,
    resultText: action.resultText,
    details: { actorName: action.actorName, actorSide: action.actorSide, actionDetails: action.actionDetails },
  };
}

export function systemEvent(round: number, resultText: string): NewBattleEvent {
  return {
    type: "ability",
    round,
    actorId: "system",
    resultText,
    details: { actorName: "Система", actorSide: "ally", actionDetails: {} },
  };
}

export function eventToBattleAction(
  e: StoredBattleEvent,
  battleId: string,
  meta: { createdAt?: Date; cancelledAt?: Date | null } = {},
): BattleAction {
  const d = (e.details ?? {}) as EventDetails;

  return {
    id: `${battleId}-${e.seq}`,
    battleId,
    round: e.round,
    actionIndex: e.seq,
    timestamp: meta.createdAt ?? new Date(),
    actorId: e.actorId ?? "system",
    actorName: d.actorName ?? "Система",
    actorSide: d.actorSide ?? "ally",
    actionType: e.type as BattleAction["actionType"],
    targets: e.targets as BattleAction["targets"],
    actionDetails: d.actionDetails ?? {},
    resultText: e.resultText,
    hpChanges: e.hpChanges as BattleAction["hpChanges"],
    isCancelled: Boolean(meta.cancelledAt),
  };
}
```
- [ ] **Step 4:** тест PASS; `pnpm lint lib/utils/battle/store && npx tsc --noEmit -p .` чисті.
- [ ] **Step 5:** `git commit -m "feat(battle-store): map battle actions to events and back"`

---

### Task 2: Сховище — `meta`, історія, відкат

**Files:**
- Modify: `lib/utils/battle/store/types.ts`, `load-battle.ts`, `save-battle.ts`
- Create: `lib/utils/battle/store/history.ts`, `lib/utils/battle/store/__tests__/history.test.ts`
- Modify: `tests/integration/battle-store.integration.test.ts`, `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts` (фікстура `loaded()` отримує `meta`)

**Interfaces:**
- Produces (`types.ts`):
```ts
export interface BattleMeta {
  name: string;
  description: string | null;
  setup: BattlePreparationParticipant[];
  friendlyFire: boolean;
  createdAt: Date;
}
// LoadedBattle отримує поле `meta: BattleMeta`
export type HistoryChange = { cancelFromSeq: number } | { clear: true };
// BattleMutationOutcome отримує `history?: HistoryChange`
```
- Produces (`history.ts`):
```ts
loadRecentEvents(db: BattleDb, battleId: string, limit?: number): Promise<BattleAction[]>   // не скасовані, за зростанням seq, останні `limit` (100)
loadSnapshotsFrom(db: BattleDb, battleId: string, seq: number): Promise<Array<{ seq: number; state: SnapshotState }>>   // найближчий знімок ≤ seq і всі наступні, за зростанням
restoreParticipantsAt(snapshots: Array<{ seq: number; state: SnapshotState }>, current: LoadedBattle): { participants: BattleParticipant[]; pending: BattleParticipant[] }
```
`restoreParticipantsAt`: колонки і `state` — з першого знімка; важкий `snapshot` учасника — з першого (за зростанням seq) знімка, що містить його в `changedSnapshots` або `removed`, інакше — з поточного стану.
- `saveBattle` з `history: { cancelFromSeq }` ставить `cancelledAt` подіям `seq ≥ cancelFromSeq` і видаляє знімки `seq ≥ cancelFromSeq`; з `history: { clear: true }` видаляє всі події і знімки бою та ставить `eventSeq = 0` (якщо в цьому ж збереженні немає нових подій).

- [ ] **Step 1: Юніт-тест `restoreParticipantsAt`** (`history.test.ts`)
```ts
import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { restoreParticipantsAt } from "@/lib/utils/battle/store/history";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store/types";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0,
  version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date() };

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", battleId: "b1" } });

const at = (i: number) => ({ orderIndex: i, isPending: false });

describe("restoreParticipantsAt", () => {
  it("повертає HP і бафф AC, змінені двома наступними діями", () => {
    const s0 = [splitParticipant(hero, at(0))];

    const hurt = { ...hero, combatStats: { ...hero.combatStats, currentHp: 5 } };

    const s1 = [splitParticipant(hurt, at(0))];

    const buffed = { ...hurt, combatStats: { ...hurt.combatStats, armorClass: 30 } };

    const s2 = [splitParticipant(buffed, at(0))];

    const snapshots = [
      { seq: 1, state: buildSnapshotState(scene, s0, diffParticipants(s0, s1)) },
      { seq: 2, state: buildSnapshotState({ ...scene, eventSeq: 1 }, s1, diffParticipants(s1, s2)) },
    ];

    const current: LoadedBattle = { scene: { ...scene, eventSeq: 2 }, meta, participants: [buffed], pending: [], isDM: true };

    const restored = restoreParticipantsAt(snapshots, current);

    expect(restored.participants).toEqual([hero]);
  });

  it("повертає учасника, видаленого пізніше, і прибирає доданого пізніше", () => {
    const goblin = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "gob", controlledBy: "dm" } });

    const wolf = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "wolf" } });

    const s0 = [splitParticipant(hero, at(0)), splitParticipant(goblin, at(1))];

    const s1 = [splitParticipant(hero, at(0)), splitParticipant(wolf, at(1))];

    const snapshots = [{ seq: 1, state: buildSnapshotState(scene, s0, diffParticipants(s0, s1)) }];

    const current: LoadedBattle = { scene, meta, participants: [hero, wolf], pending: [], isDM: true };

    expect(restoreParticipantsAt(snapshots, current).participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
  });
});
```
- [ ] **Step 2:** FAIL (модуль `history` не знайдено).
- [ ] **Step 3: Реалізація**

`types.ts` — додати `BattleMeta`, `HistoryChange`; `LoadedBattle` → `meta: BattleMeta`; `BattleMutationOutcome` → `history?: HistoryChange`. Імпорт `BattlePreparationParticipant` з `@/types/battle`.

`history.ts`:
```ts
import { eventToBattleAction } from "./event-mapping";
import type { BattleDb } from "./load-battle";
import type { SnapshotState } from "./snapshot-state";
import { joinParticipant, splitParticipant } from "./split-participant";
import type { LoadedBattle, ParticipantSnapshot, StoredBattleEvent } from "./types";

import type { BattleAction, BattleParticipant } from "@/types/battle";

export async function loadRecentEvents(db: BattleDb, battleId: string, limit = 100): Promise<BattleAction[]> {
  const rows = await db.battleEvent.findMany({
    where: { battleId, cancelledAt: null },
    orderBy: { seq: "desc" },
    take: limit,
  });

  return rows
    .reverse()
    .map((r) => eventToBattleAction(r as unknown as StoredBattleEvent, battleId, { createdAt: r.createdAt, cancelledAt: r.cancelledAt }));
}

export async function loadSnapshotsFrom(
  db: BattleDb,
  battleId: string,
  seq: number,
): Promise<Array<{ seq: number; state: SnapshotState }>> {
  const start = await db.battleSnapshot.findFirst({
    where: { battleId, seq: { lte: seq } },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });

  if (!start) return [];

  const rows = await db.battleSnapshot.findMany({
    where: { battleId, seq: { gte: start.seq } },
    orderBy: { seq: "asc" },
  });

  return rows.map((r) => ({ seq: r.seq, state: r.state as unknown as SnapshotState }));
}

export function restoreParticipantsAt(
  snapshots: Array<{ seq: number; state: SnapshotState }>,
  current: LoadedBattle,
): { participants: BattleParticipant[]; pending: BattleParticipant[] } {
  const [first] = snapshots;

  const currentHeavy = new Map<string, ParticipantSnapshot>();

  [...current.participants, ...current.pending].forEach((p, i) => {
    currentHeavy.set(p.basicInfo.id, splitParticipant(p, { orderIndex: i, isPending: false }).snapshot);
  });

  const heavyAt = (id: string): ParticipantSnapshot | undefined => {
    for (const { state } of snapshots) {
      const changed = state.changedSnapshots?.[id];

      if (changed) return changed;

      const removed = state.removed?.find((r) => r.columns.id === id);

      if (removed) return removed.snapshot;
    }

    return currentHeavy.get(id);
  };

  const restored = first.state.participants.flatMap(({ columns, state }) => {
    const snapshot = heavyAt(columns.id);

    if (!snapshot) return [];

    return [{ isPending: columns.isPending, orderIndex: columns.orderIndex, p: joinParticipant({ columns, state, snapshot, snapshotHash: "" }, current.scene.id) }];
  });

  const byOrder = (a: { orderIndex: number }, b: { orderIndex: number }) => a.orderIndex - b.orderIndex;

  return {
    participants: restored.filter((r) => !r.isPending).sort(byOrder).map((r) => r.p),
    pending: restored.filter((r) => r.isPending).sort(byOrder).map((r) => r.p),
  };
}
```

`load-battle.ts` — замінити `include` на явний `select` (legacy JSON-колонки `initiativeOrder`/`battleLog`/`pendingSummons` більше не читаються) і заповнити `meta`:
```ts
  const row = await db.battleScene.findFirst({
    where: { id: args.battleId, campaignId: args.campaignId },
    select: {
      id: true, campaignId: true, name: true, description: true, status: true,
      currentRound: true, currentTurnIndex: true, version: true, eventSeq: true,
      pendingMoraleCheck: true, startedAt: true, completedAt: true, createdAt: true,
      participants: true,
      battleParticipants: { orderBy: { orderIndex: "asc" } },
      campaign: { select: { friendlyFire: true, members: { where: { userId: args.userId }, select: { role: true } } } },
    },
  });
```
і в результат додати:
```ts
    meta: {
      name: row.name,
      description: row.description,
      setup: (row.participants ?? []) as unknown as BattlePreparationParticipant[],
      friendlyFire: row.campaign.friendlyFire ?? false,
      createdAt: row.createdAt,
    },
```

`save-battle.ts` — у транзакції, перед блоком `if (events.length > 0)`:
```ts
    if (outcome.history && "cancelFromSeq" in outcome.history) {
      await tx.battleEvent.updateMany({
        where: { battleId: scene.id, seq: { gte: outcome.history.cancelFromSeq }, cancelledAt: null },
        data: { cancelledAt: new Date() },
      });
      await tx.battleSnapshot.deleteMany({ where: { battleId: scene.id, seq: { gte: outcome.history.cancelFromSeq } } });
    }

    if (outcome.history && "clear" in outcome.history) {
      await tx.battleEvent.deleteMany({ where: { battleId: scene.id } });
      await tx.battleSnapshot.deleteMany({ where: { battleId: scene.id } });
    }
```
і в `updateMany.data` `eventSeq` рахувати як `outcome.history && "clear" in outcome.history ? events.length : scene.eventSeq + events.length` (при `clear` нові події нумеруються з 1: `firstSeq = clear ? 1 : scene.eventSeq + 1`).

`index.ts` — `export * from "./history";`.

У фікстурах `loaded()` (pipeline-тест) і в інтеграційному тесті додати `meta`, де `LoadedBattle` будується вручну.

- [ ] **Step 4: Інтеграційні тести історії** — дописати в `tests/integration/battle-store.integration.test.ts`:
```ts
  it("відкат: знімки з seq, скасування подій і повернення стану", async () => {
    const before = await mustLoad();

    const hurt = { ...before.participants[0], combatStats: { ...before.participants[0].combatStats, currentHp: 1 } };

    await saveBattle(prisma, before, { participants: [hurt, ...before.participants.slice(1)], pending: before.pending, events: [{ type: "attack", round: 1, resultText: "Удар" }] });

    const after = await mustLoad();

    const seq = after.scene.eventSeq;

    const snapshots = await loadSnapshotsFrom(prisma, ids.battle, seq);

    expect(snapshots[0].seq).toBe(seq);

    const restored = restoreParticipantsAt(snapshots, after);

    expect(restored.participants[0].combatStats.currentHp).toBe(before.participants[0].combatStats.currentHp);

    await saveBattle(prisma, after, { ...restored, events: [], history: { cancelFromSeq: seq } });

    const events = await loadRecentEvents(prisma, ids.battle);

    expect(events.map((e) => e.actionIndex)).not.toContain(seq);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle, seq: { gte: seq } } })).toBe(0);
  });

  it("clear: журнал і знімки порожні, eventSeq = 0", async () => {
    const before = await mustLoad();

    await saveBattle(prisma, before, { participants: [], pending: [], events: [], history: { clear: true } });

    const after = await mustLoad();

    expect(after.scene.eventSeq).toBe(0);
    expect(await prisma.battleEvent.count({ where: { battleId: ids.battle } })).toBe(0);
    expect(after.participants).toEqual([]);
  });
```
(імпорт `loadRecentEvents`, `loadSnapshotsFrom`, `restoreParticipantsAt` з `@/lib/utils/battle/store`; тест `clear` — останній у файлі.)

- [ ] **Step 5:** `pnpm test:run lib/utils/battle && pnpm test:integration tests/integration/battle-store.integration.test.ts && npx tsc --noEmit -p .` → усе PASS. Коміт: `feat(battle-store): battle meta, event history, snapshot-based rollback`.

---

### Task 3: Пайплайн — сумісна відповідь і події, нові режими

**Files:**
- Create: `lib/utils/battle/pipeline/legacy-battle.ts`, `lib/utils/battle/pipeline/compat-errors.ts`, `lib/utils/battle/pipeline/__tests__/legacy-battle.test.ts`
- Modify: `run-battle-mutation.ts`, `default-deps.ts`, `lib/utils/battle/store/errors.ts` (код `"action_rejected"`), обидва тест-файли пайплайну, `types/api.ts`
- Delete: `lib/utils/battle/pipeline/to-api-battle.ts`

**Interfaces:**
- `types/api.ts` → `BattleScene` додає: `version?: number; battleLogMode?: "append"; battleLogCancelledFrom?: number; pendingMoraleCheck?: unknown`.
- `legacy-battle.ts`:
```ts
export interface LegacyView { isDM?: boolean }   // без поля — payload для інших клієнтів
export function toLegacyBattle(
  loaded: Pick<LoadedBattle, "meta">,
  scene: BattleSceneState,
  participants: BattleParticipant[],
  pending: BattleParticipant[],
  log: { mode: "append" | "full"; entries: BattleAction[]; cancelledFrom?: number },
  view?: LegacyView,
): BattleScene
export interface PusherMessage { channel: string; event: string; payload: unknown }
export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  battlePayload: BattleScene;
}): PusherMessage[]
```
`toLegacyBattle`: `participants` (лобі) = `meta.setup`, якщо статус `prepared`, інакше `[]`; `battleLog = log.entries`; `battleLogMode = "append"` лише в режимі append; `campaign = { id: scene.campaignId, friendlyFire: meta.friendlyFire }`; `isDM`/`userRole` — лише якщо передано `view`.
`buildPusherMessages`: завжди `battle-updated` на `battleChannelName(id)` (payload ≤ 9 500 байт — `battlePayload`, інакше `{ type: "battle-updated", battleId }`); `battle-started`, якщо `before.status !== "active" && after.status === "active"`; `battle-completed`, якщо `after.status === "completed" && before.status !== "completed"`; `turn-started` на `userChannelName(active.basicInfo.controlledBy)` з `{ battleId, participantId, participantName }`, якщо бій активний, `(round, turnIndex)` змінились і `controlledBy !== "dm"`.
- `compat-errors.ts`: `toPipelineError(err: unknown): never` — `AttackPhaseError`/помилки зі `status`: 403 → `BattleAccessError(403)`, 404 → `BattleAccessError(404)`, інше → `BattleRuleError("action_rejected", message)`; решта — повторний `throw`.
- `run-battle-mutation.ts`:
  - `BattleMutationContext` += `meta: BattleMeta` (з `loaded.meta`).
  - `BattleAccess` += `"currentController"` (DM або контролер учасника на `turnIndex`, без перевірки статусу).
  - `RunBattleMutationOptions` += `dryRun?: (body: TBody) => boolean`, `respond?: "battle" | "wrapped" | "response"` (default `"battle"`), `includeRecentEvents?: number`.
  - `PipelineDeps.publish(messages: PusherMessage[]): void`; `PipelineDeps.loadRecentEvents(battleId: string, limit: number): Promise<BattleAction[]>`.
  - Події, повернуті `mutate`, у відповіді й Pusher-payload ідуть як `log.entries` у режимі `append` (через `eventToBattleAction` зі `seq` з дельти); `history.cancelFromSeq` → `log.cancelledFrom`.
  - `withVictory` формує подію через `battleActionToEvent(battleAction)`.
  - Тіла відповідей: `"battle"` → `{ ...legacy(view), ...result.response }`; `"wrapped"` → `{ battle: legacy(view), ...result.response }`; `"response"` → `result.response ?? {}`.
  - `dryRun` → без `saveBattle` і `publish`; legacy у режимі `full` з `includeRecentEvents` подіями (0 — порожній журнал).

- [ ] **Step 1: Тести**

`legacy-battle.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { buildPusherMessages, toLegacyBattle } from "@/lib/utils/battle/pipeline/legacy-battle";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 3,
  eventSeq: 4, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [{ id: "u1", type: "unit" as const, side: "enemy" as const }], friendlyFire: true, createdAt: new Date() };

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u-player" } });

const goblin = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "gob", controlledBy: "dm" } });

describe("toLegacyBattle", () => {
  it("payload для інших клієнтів не містить isDM/userRole", () => {
    const b = toLegacyBattle({ meta }, scene, [hero], [], { mode: "append", entries: [] });

    expect(b).not.toHaveProperty("isDM");
    expect(b).not.toHaveProperty("userRole");
    expect(b.battleLogMode).toBe("append");
    expect(b.campaign).toEqual({ id: "c1", friendlyFire: true });
  });

  it("для того, хто діяв, — з isDM/userRole; лобі видно лише в prepared", () => {
    const active = toLegacyBattle({ meta }, scene, [hero], [], { mode: "full", entries: [] }, { isDM: true });

    expect(active).toMatchObject({ isDM: true, userRole: "dm", participants: [] });
    expect(active.battleLogMode).toBeUndefined();

    const prepared = toLegacyBattle({ meta }, { ...scene, status: "prepared" }, [], [], { mode: "full", entries: [] }, { isDM: false });

    expect(prepared.participants).toEqual(meta.setup);
    expect(prepared.userRole).toBe("player");
  });
});

describe("buildPusherMessages", () => {
  const payload = toLegacyBattle({ meta }, scene, [hero, goblin], [], { mode: "append", entries: [] });

  it("зміна ходу на гравця — battle-updated + turn-started у його канал", () => {
    const messages = buildPusherMessages({ before: { ...scene, turnIndex: 1 }, after: scene, participants: [hero, goblin], battlePayload: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-updated", "turn-started"]);
    expect(messages[1]).toMatchObject({ channel: "private-user-u-player", payload: { battleId: "b1", participantId: "hero" } });
  });

  it("хід переходить до DM-учасника — без turn-started", () => {
    const messages = buildPusherMessages({ before: scene, after: { ...scene, turnIndex: 1 }, participants: [hero, goblin], battlePayload: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-updated"]);
  });

  it("старт і завершення бою", () => {
    expect(buildPusherMessages({ before: { ...scene, status: "prepared" }, after: scene, participants: [hero], battlePayload: payload }).map((m) => m.event)).toContain("battle-started");
    expect(buildPusherMessages({ before: scene, after: { ...scene, status: "completed" }, participants: [hero], battlePayload: payload }).map((m) => m.event)).toContain("battle-completed");
  });

  it("великий payload — light {type, battleId}", () => {
    const big = { ...payload, initiativeOrder: Array.from({ length: 60 }, () => hero) };

    const [updated] = buildPusherMessages({ before: scene, after: scene, participants: [hero], battlePayload: big });

    expect(updated.payload).toEqual({ type: "battle-updated", battleId: "b1" });
  });
});
```

У `run-battle-mutation.test.ts`:
- `deps()` додає `loadRecentEvents: vi.fn(async () => [])`; `loaded()` додає `meta`.
- Тест «успіх» перевіряє: `res.status === 200`, `json.initiativeOrder.length === 2`, `json.isDM === false`, `json.battleLogMode === "append"`, `d.publish` викликано з масивом, перший елемент `{ event: "battle-updated" }`, у payload немає `isDM`.
- Тест «завелика дельта» замінюється на «великий стан — light battle-updated»: `saveBattle` повертає дельту, `mutate` повертає 60 учасників → перше повідомлення має payload `{ type: "battle-updated", battleId: "b1" }`.
- Новий тест «currentController: контролер непритомного учасника може передати хід»:
```ts
  it("currentController: контролер непритомного учасника може передати хід", async () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, status: "unconscious" as const } };

    const res = await runBattleMutation(
      req(),
      { params, access: "currentController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ participants: [downed, goblin] })) }),
    );

    expect(res.status).toBe(200);
  });
```
- Новий тест «dryRun: нічого не зберігає і не публікує»:
```ts
  it("dryRun: нічого не зберігає і не публікує, повертає response", async () => {
    const d = deps();

    const res = await runBattleMutation(
      req({ preview: true }),
      {
        params,
        access: "member",
        schema: z.object({ preview: z.boolean() }),
        dryRun: (b) => b.preview,
        respond: "response",
        mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [], response: { preview: true } }),
      },
      d,
    );

    expect(await res.json()).toEqual({ preview: true });
    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
  });
```
- Новий тест «wrapped»: `respond: "wrapped"` → `json.battle.id === "b1"` і поля `response` на верхньому рівні.

`default-deps.test.ts` — `publish([{ channel: "private-battle-b1", event: "battle-updated", payload: {} }, { channel: "private-user-u1", event: "turn-started", payload: {} }])`: `after` отримує один колбек; він повертає проміс, що завершується після обох `trigger`; `trigger` викликано з `("private-battle-b1", "battle-updated", …)` і `("private-user-u1", "turn-started", …)`.

- [ ] **Step 2:** FAIL (модуля `legacy-battle` немає; старі тести пайплайну падають на нових очікуваннях).
- [ ] **Step 3: Реалізація** — `legacy-battle.ts`:
```ts
import { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

import { battleChannelName, userChannelName } from "@/lib/pusher-channels";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface LegacyView {
  isDM?: boolean;
}

export interface PusherMessage {
  channel: string;
  event: string;
  payload: unknown;
}

export function toLegacyBattle(
  loaded: Pick<LoadedBattle, "meta">,
  scene: BattleSceneState,
  participants: BattleParticipant[],
  pending: BattleParticipant[],
  log: { mode: "append" | "full"; entries: BattleAction[]; cancelledFrom?: number },
  view?: LegacyView,
): BattleScene {
  const { meta } = loaded;

  return {
    id: scene.id,
    campaignId: scene.campaignId,
    name: meta.name,
    description: meta.description ?? undefined,
    status: scene.status,
    participants: scene.status === "prepared" ? meta.setup : [],
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    initiativeOrder: participants,
    pendingSummons: pending,
    pendingMoraleCheck: scene.pendingMoraleCheck,
    battleLog: log.entries,
    ...(log.mode === "append" && { battleLogMode: "append" as const }),
    ...(log.cancelledFrom !== undefined && { battleLogCancelledFrom: log.cancelledFrom }),
    version: scene.version,
    createdAt: meta.createdAt.toISOString(),
    startedAt: scene.startedAt?.toISOString(),
    completedAt: scene.completedAt?.toISOString(),
    campaign: { id: scene.campaignId, friendlyFire: meta.friendlyFire },
    ...(view && { isDM: Boolean(view.isDM), userRole: view.isDM ? ("dm" as const) : ("player" as const) }),
  };
}

export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  battlePayload: BattleScene;
}): PusherMessage[] {
  const { before, after, participants, battlePayload } = args;

  const channel = battleChannelName(after.id);

  const fits = Buffer.byteLength(JSON.stringify(battlePayload), "utf8") <= PUSHER_DELTA_LIMIT_BYTES;

  const payload = fits ? battlePayload : { type: "battle-updated", battleId: after.id };

  const messages: PusherMessage[] = [{ channel, event: "battle-updated", payload }];

  if (before.status !== "active" && after.status === "active") {
    messages.push({ channel, event: "battle-started", payload });
  }

  if (after.status === "completed" && before.status !== "completed") {
    messages.push({ channel, event: "battle-completed", payload });
  }

  const turnMoved = before.round !== after.round || before.turnIndex !== after.turnIndex;

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
Константу `PUSHER_DELTA_LIMIT_BYTES` перенести з `run-battle-mutation.ts` у новий `lib/utils/battle/pipeline/limits.ts` (уникає циклу імпортів), у `run-battle-mutation.ts` — реекспорт.

`compat-errors.ts`:
```ts
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";

export function toPipelineError(err: unknown): never {
  const status = (err as { status?: unknown })?.status;

  if (err instanceof Error && typeof status === "number") {
    if (status === 403 || status === 404) throw new BattleAccessError(status, err.message);

    throw new BattleRuleError("action_rejected", err.message);
  }

  throw err;
}
```

`run-battle-mutation.ts` — зміни:
1. `assertAccess`: гілка `if (access === "currentController") { const current = ctx.participants[ctx.scene.turnIndex]; if (!current || current.basicInfo.controlledBy !== ctx.userId) throw new BattleRuleError("not_your_turn", "Зараз не ваш хід"); return; }` перед гілкою `turnController`.
2. `withVictory`: `events: [...result.events, battleActionToEvent({ ...battleAction, round })]`.
3. Після `mutate`:
```ts
    const result = withVictory(loaded.scene, await options.mutate(ctx, parsed.body));

    if (options.dryRun?.(parsed.body)) {
      const entries = options.includeRecentEvents ? await deps.loadRecentEvents(battleId, options.includeRecentEvents) : [];

      const battle = toLegacyBattle(loaded, loaded.scene, result.participants, result.pending, { mode: "full", entries }, { isDM: loaded.isDM });

      return respondWith(options.respond, battle, result.response);
    }

    const delta = await deps.saveBattle(loaded, result);

    const after = { ...loaded.scene, ...result.scene, version: delta.version, eventSeq: delta.events.at(-1)?.seq ?? loaded.scene.eventSeq };

    const entries = delta.events.map((e) => eventToBattleAction(e, battleId));

    const cancelledFrom = result.history && "cancelFromSeq" in result.history ? result.history.cancelFromSeq : undefined;

    const log = { mode: "append" as const, entries, cancelledFrom };

    const shared = toLegacyBattle(loaded, after, result.participants, result.pending, log);

    deps.publish(buildPusherMessages({ before: loaded.scene, after, participants: result.participants, battlePayload: shared }));

    return respondWith(options.respond, { ...shared, isDM: loaded.isDM, userRole: loaded.isDM ? "dm" : "player" }, result.response);
```
з хелпером:
```ts
function respondWith(mode: RunBattleMutationOptions<unknown>["respond"], battle: BattleScene, response?: Record<string, unknown>) {
  if (mode === "response") return NextResponse.json(response ?? {});

  if (mode === "wrapped") return NextResponse.json({ battle, ...response });

  return NextResponse.json({ ...battle, ...response });
}
```
4. `PipelineDeps` — `publish(messages: PusherMessage[]): void` і `loadRecentEvents(battleId, limit)`.

`default-deps.ts`:
```ts
  loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
  publish(messages) {
    after(() =>
      Promise.all(
        messages.map((m) =>
          safePusherTrigger(pusherServer, m.channel, m.event, m.payload, { action: "battle mutation" }),
        ),
      ),
    );
  },
```
`errors.ts` — `BattleRuleCode` += `"action_rejected"`. Видалити `to-api-battle.ts`.

- [ ] **Step 4:** `pnpm test:run lib/utils/battle && npx tsc --noEmit -p . && pnpm lint lib/utils/battle` → PASS/чисто.
- [ ] **Step 5:** коміт `feat(battle-pipeline): legacy-compatible responses and pusher events, dry runs, currentController access`.

---

### Task 4: Один движок переходу ходу

**Files:**
- Move (`git mv`): `app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-advance.ts` → `lib/utils/battle/turn/run-advance-turn-loop.ts`; `next-turn-apply-morale.ts` → `lib/utils/battle/turn/apply-pending-morale.ts`; `next-turn-helpers.ts` → `lib/utils/battle/turn/turn-helpers.ts`
- Create: `lib/utils/battle/turn/pending-morale.ts` (тип `PendingMoraleCheckPayload`, перенесений з `morale-check/route.ts`), `lib/utils/battle/turn/advance-turn.ts`, `lib/utils/battle/turn/index.ts`, `lib/utils/battle/turn/__tests__/advance-turn.test.ts`
- Delete: `lib/utils/battle/attack-and-next-turn/advance-turn-phase.ts` і `__tests__/advance-turn-phase.test.ts` (після Task 5, коли зникне останній споживач)

**Interfaces:**
```ts
export interface AdvanceTurnInput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: BattleSceneState;
}
export interface AdvanceTurnOutput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: ScenePatch;          // turnIndex, round, status, completedAt?, pendingMoraleCheck: null
  actions: BattleAction[];
}
export function advanceTurn(input: AdvanceTurnInput): AdvanceTurnOutput
```
Порядок: `applyPendingMoraleCheck` (якщо `scene.pendingMoraleCheck`) → `runAdvanceTurnLoop` → `applyVictoryCompletion`; `pendingMoraleCheck` завжди скидається в `null`.

- [ ] **Step 1: Тест**
```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });

describe("advanceTurn", () => {
  it("передає хід наступному живому учаснику", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [], scene });

    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
  });

  it("після останнього — новий раунд", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.round).toBe(2);
  });

  it("саммони з pending входять у бій у новому раунді", () => {
    const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" } });

    const out = advanceTurn({ participants: [hero, goblin], pending: [wolf], scene: { ...scene, turnIndex: 1 } });

    expect(out.participants.map((p) => p.basicInfo.id)).toContain("wolf");
    expect(out.pending).toEqual([]);
  });

  it("усі вороги впали — бій завершено", () => {
    const dead = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    const out = advanceTurn({ participants: [hero, dead], pending: [], scene });

    expect(out.scene.status).toBe("completed");
  });

  it("невикористаний pendingMoraleCheck застосовується і скидається", () => {
    const out = advanceTurn({
      participants: [hero, goblin],
      pending: [],
      scene: {
        ...scene,
        pendingMoraleCheck: {
          participantId: "hero",
          d10Roll: 1,
          moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, message: "Пропуск", moralePositive: false },
        },
      },
    });

    expect(out.scene.pendingMoraleCheck).toBeNull();
    expect(out.actions.some((a) => a.resultText.length > 0)).toBe(true);
  });
});
```
- [ ] **Step 2:** FAIL (модуль `@/lib/utils/battle/turn` не знайдено).
- [ ] **Step 3: Реалізація**
  - `git mv` трьох файлів; у них оновити імпорти (`@/…`) і імпорт `PendingMoraleCheckPayload` з `./pending-morale`. У `morale-check/route.ts` тимчасово імпортувати тип з нового місця (роут переписується в Task 6).
  - `advance-turn.ts`:
```ts
import { applyPendingMoraleCheck } from "./apply-pending-morale";
import type { PendingMoraleCheckPayload } from "./pending-morale";
import { runAdvanceTurnLoop } from "./run-advance-turn-loop";
import { applyVictoryCompletion } from "./turn-helpers";

import type { BattleSceneState, ScenePatch } from "@/lib/utils/battle/store";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AdvanceTurnInput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: BattleSceneState;
}

export interface AdvanceTurnOutput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: ScenePatch;
  actions: BattleAction[];
}

export function advanceTurn({ participants, pending, scene }: AdvanceTurnInput): AdvanceTurnOutput {
  let order = participants;

  const actions: BattleAction[] = [];

  if (scene.pendingMoraleCheck) {
    const morale = applyPendingMoraleCheck(order, scene.pendingMoraleCheck as PendingMoraleCheckPayload, scene.round, scene.id, scene.eventSeq);

    order = morale.updatedInitiativeOrder;

    if (morale.moraleLogEntry) actions.push(morale.moraleLogEntry);
  }

  const loop = runAdvanceTurnLoop({
    initiativeOrder: order,
    currentTurnIndex: scene.turnIndex,
    currentRound: scene.round,
    battleId: scene.id,
    currentBattleLogLength: scene.eventSeq + actions.length,
    pendingSummons: pending,
  });

  const newLogEntries = [...loop.newLogEntries];

  const victory = applyVictoryCompletion({
    updatedInitiativeOrder: loop.updatedInitiativeOrder,
    initiativeOrder: order,
    battleStatus: scene.status,
    battleId: scene.id,
    nextRound: loop.nextRound,
    currentBattleLogLength: scene.eventSeq + actions.length,
    newLogEntries,
    getStateBeforeForEntry: () => undefined,
  });

  return {
    participants: victory.updatedInitiativeOrder,
    pending: loop.clearedPendingSummons ? [] : pending,
    scene: {
      turnIndex: loop.nextTurnIndex,
      round: loop.nextRound,
      status: victory.finalStatus,
      ...(victory.completedAt && { completedAt: victory.completedAt }),
      pendingMoraleCheck: null,
    },
    actions: [...actions, ...newLogEntries],
  };
}
```
  Якщо сигнатура `applyVictoryCompletion`/`getStateBeforeForEntry` відрізняється від наведеної — підлаштувати виклик під фактичну (функція не змінюється) і записати Ruling.
  - `index.ts`: `export * from "./advance-turn"; export * from "./pending-morale";`.
- [ ] **Step 4:** `pnpm test:run lib/utils/battle && npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5:** коміт `refactor(battle-turn): single advanceTurn engine shared by next-turn and attack`.

---

### Task 5: Роути `start`, `next-turn`, `attack`, `attack-and-next-turn`

**Files:**
- Create: `R/start/start-mutation.ts`, `R/next-turn/next-turn-mutation.ts`, `R/attack/attack-mutation.ts`, `app/api/__tests__/battles/start-mutation.test.ts`, `next-turn-mutation.test.ts`, `attack-mutation.test.ts` (R = `app/api/campaigns/[id]/battles/[battleId]`)
- Rewrite: `R/start/route.ts`, `R/next-turn/route.ts`, `R/attack/route.ts`, `R/attack-and-next-turn/route.ts`
- Modify: `R/start/start-battle-handler.ts` → залишити лише `buildStartOrder(battleId, campaignId, setup): Promise<{ order: BattleParticipant[]; triggerLogEntries: BattleAction[] }>` (DB-читання, білдери, `distributePendingScopedArtifactBonuses`, `applyStartOfBattleAndSort`); прибрати запис у БД, Pusher і відповідь.
- Delete: `R/attack/attack-handler.ts`, `R/next-turn/advance-turn-handler.ts`, `R/attack-and-next-turn/attack-and-next-turn-schema.ts` (схема переїжджає в `attack-mutation.ts`), `lib/utils/battle/attack-and-next-turn/advance-turn-phase.ts` + його тест.

**Interfaces:**
```ts
// start-mutation.ts
export function createStartMutation(build = buildStartOrder): (ctx: BattleMutationContext) => Promise<MutationResult>
// next-turn-mutation.ts
export function nextTurnMutation(ctx: BattleMutationContext): MutationResult
// attack-mutation.ts
export const attackBodySchema: z.ZodType<AttackBody>   // attackAndNextTurnSchema + endTurn: z.boolean().default(false)
export function attackMutation(ctx: BattleMutationContext, body: AttackBody): MutationResult
```

- [ ] **Step 1: Тести мутацій**

`start-mutation.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

import { createStartMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "prepared", round: 1, turnIndex: 0, version: 0, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [{ id: "u1", type: "unit", side: "enemy" }], friendlyFire: false, createdAt: new Date() },
  participants: [],
  pending: [],
  userId: "dm",
  isDM: true,
} as unknown as BattleMutationContext;

describe("start mutation", () => {
  it("будує учасників із лобі, ставить active, раунд 1, хід 0", async () => {
    const hero = createMockParticipant();

    const build = vi.fn(async () => ({ order: [hero], triggerLogEntries: [] }));

    const out = await createStartMutation(build)(ctx);

    expect(build).toHaveBeenCalledWith("b1", "c1", ctx.meta.setup);
    expect(out.participants).toEqual([hero]);
    expect(out.scene).toMatchObject({ status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, completedAt: null });
    expect(out.scene?.startedAt).toBeInstanceOf(Date);
    expect(out.history).toEqual({ clear: true });
  });

  it("порожнє лобі — 422 invalid_target", async () => {
    await expect(createStartMutation(vi.fn())({ ...ctx, meta: { ...ctx.meta, setup: [] } } as never)).rejects.toMatchObject({ code: "invalid_target" });
  });
});
```

`next-turn-mutation.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  participants: [
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } }),
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } }),
  ],
  pending: [],
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

describe("next-turn mutation", () => {
  it("передає хід і повертає події переходу", () => {
    const out = nextTurnMutation(ctx);

    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
    expect(Array.isArray(out.events)).toBe(true);
  });
});
```

`attack-mutation.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const hero = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: "melee", attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
});

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  participants: [hero, goblin],
  pending: [],
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) =>
  attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 20, damageRolls: [8], ...over });

describe("attack mutation", () => {
  it("атака без endTurn — подія атаки, хід не змінюється", () => {
    const out = attackMutation(ctx, body());

    expect(out.events[0].type).toBe("attack");
    expect(out.scene?.turnIndex).toBeUndefined();
  });

  it("атака з endTurn — хід передається тим самим збереженням", () => {
    const out = attackMutation(ctx, body({ endTurn: true }));

    expect(out.scene).toMatchObject({ turnIndex: 1, pendingMoraleCheck: null });
  });

  it("чужий атакувальник — 403", () => {
    expect(() => attackMutation({ ...ctx, userId: "someone" } as never, body())).toThrow(BattleAccessError);
  });

  it("невідома ціль — 422 action_rejected або 404", () => {
    expect(() => attackMutation(ctx, body({ targetId: "nobody" }))).toThrow(Error);
  });

  it("помилки AttackPhaseError мапляться на помилки пайплайну", () => {
    try {
      attackMutation(ctx, body({ attackerId: "gob" }));
    } catch (e) {
      expect(e instanceof BattleAccessError || e instanceof BattleRuleError).toBe(true);
    }
  });
});
```

- [ ] **Step 2:** FAIL (модулів немає).
- [ ] **Step 3: Реалізація**

`start-mutation.ts`:
```ts
import { buildStartOrder } from "./start-battle-handler";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";

export function createStartMutation(build = buildStartOrder) {
  return async (ctx: BattleMutationContext): Promise<MutationResult> => {
    if (ctx.meta.setup.length === 0) {
      throw new BattleRuleError("invalid_target", "Немає учасників для бою");
    }

    const { order, triggerLogEntries } = await build(ctx.scene.id, ctx.scene.campaignId, ctx.meta.setup);

    return {
      participants: order,
      pending: [],
      scene: { status: "active", startedAt: new Date(), completedAt: null, round: 1, turnIndex: 0, pendingMoraleCheck: null },
      events: triggerLogEntries.map(battleActionToEvent),
      history: { clear: true },
    };
  };
}
```
`start/route.ts`:
```ts
import { createStartMutation } from "./start-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createStartMutation();

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, { params: await params, access: "dm", requireStatus: "prepared", mutate });
}
```
`next-turn-mutation.ts`:
```ts
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

export function nextTurnMutation(ctx: BattleMutationContext): MutationResult {
  const out = advanceTurn({ participants: ctx.participants, pending: ctx.pending, scene: ctx.scene });

  return { participants: out.participants, pending: out.pending, scene: out.scene, events: out.actions.map(battleActionToEvent) };
}
```
`next-turn/route.ts`: `runBattleMutation(req, { params: await params, access: "currentController", requireStatus: "active", rateLimitScope: "nextTurn", mutate: nextTurnMutation })`.

`attack-mutation.ts`:
```ts
import { z } from "zod";

import { runAttackPhase } from "@/lib/utils/battle/attack-and-next-turn/run-attack-phase";
import { toPipelineError } from "@/lib/utils/battle/pipeline/compat-errors";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, systemEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution/simple";

export const attackBodySchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().min(1).max(20).optional(),
    attackRoll: z.number().min(1).max(20).optional(),
    attackRolls: z.array(z.number().min(1).max(20)).optional(),
    advantageRoll: z.number().min(1).max(20).optional(),
    disadvantageRoll: z.number().min(1).max(20).optional(),
    damageRolls: z.array(z.number()).default([]),
    reactionDamage: z.number().min(0).optional(),
    endTurn: z.boolean().default(false),
  })
  .refine(
    (d) => d.d20Roll !== undefined || d.attackRoll !== undefined || (Array.isArray(d.attackRolls) && d.attackRolls.length > 0),
    { message: "d20Roll, attackRoll або attackRolls обов'язковий", path: ["d20Roll"] },
  )
  .refine((d) => d.targetId !== undefined || (d.targetIds !== undefined && d.targetIds.length > 0), {
    message: "Потрібно вказати хоча б одну ціль",
    path: ["targetIds"],
  });

export type AttackBody = z.infer<typeof attackBodySchema>;

export function attackMutation(ctx: BattleMutationContext, body: AttackBody): MutationResult {
  const { endTurn, ...data } = body;

  let phase: ReturnType<typeof runAttackPhase>;

  try {
    phase = runAttackPhase({
      battle: { initiativeOrder: ctx.participants, battleLog: [], currentRound: ctx.scene.round, currentTurnIndex: ctx.scene.turnIndex },
      data,
      battleId: ctx.scene.id,
      userId: ctx.userId,
      isDM: ctx.isDM,
    });
  } catch (e) {
    toPipelineError(e);
  }

  let order = phase.finalInitiativeOrder;

  const events = phase.allBattleActions.map(battleActionToEvent);

  const changedIds = new Set(
    phase.allBattleActions.flatMap((a) => a.hpChanges.filter((h) => h.oldHp !== h.newHp).map((h) => h.participantId)),
  );

  const messages: string[] = [];

  for (const id of changedIds) {
    const triggered = executeComplexTriggersForChangedParticipant(order, id, ctx.scene.round);

    order = triggered.updatedParticipants;
    messages.push(...triggered.messages);
  }

  if (messages.length > 0) {
    events.push(systemEvent(ctx.scene.round, `Тригери після зміни HP: ${messages.join("; ")}`));
  }

  if (!endTurn) return { participants: order, pending: ctx.pending, events };

  const advanced = advanceTurn({ participants: order, pending: ctx.pending, scene: ctx.scene });

  return {
    participants: advanced.participants,
    pending: advanced.pending,
    scene: advanced.scene,
    events: [...events, ...advanced.actions.map(battleActionToEvent)],
  };
}
```
`attack/route.ts`: `runBattleMutation(req, { params: await params, access: "member", requireStatus: "active", rateLimitScope: "attack", schema: attackBodySchema, mutate: attackMutation })`.
`attack-and-next-turn/route.ts` (сумісність для нинішнього клієнта): той самий виклик, але `mutate: (ctx, body) => attackMutation(ctx, { ...body, endTurn: true })`.

`start-battle-handler.ts`: залишити побудову; функцію перейменувати/вирізати в `buildStartOrder(battleId, campaignId, setup)`; видалити запис у БД, `preparePusherPayload`, `safePusherTrigger`, `NextResponse`.

Видалити `attack-handler.ts`, `advance-turn-handler.ts`, `attack-and-next-turn-schema.ts`, `advance-turn-phase.ts` і його тест; переконатися пошуком, що імпортів немає: `grep -rn "advance-turn-phase\|attack-handler\|advance-turn-handler\|attack-and-next-turn-schema" app lib components` → порожньо.

- [ ] **Step 4:** `pnpm test:run app/api/__tests__/battles lib/utils/battle && npx tsc --noEmit -p . && pnpm lint app/api lib/utils/battle` → PASS/чисто.
- [ ] **Step 5:** коміт `feat(battle-routes): start, next-turn and attack on the mutation pipeline`.

---

### Task 6: `spell`, `bonus-action`, `morale-check`

**Files:**
- Create: `R/spell/spell-mutation.ts`, `R/bonus-action/bonus-action-mutation.ts`, `R/morale-check/morale-check-mutation.ts`, `lib/utils/battle/spell/map-db-spell.ts` (перенести приватний `mapDbSpellToBattleSpell` з `cast-spell-handler.ts` без змін, зробити `export`), тести `app/api/__tests__/battles/{spell,bonus-action,morale-check}-mutation.test.ts`
- Rewrite: три `route.ts`
- Delete: `R/spell/cast-spell-handler.ts`

**Interfaces:**
```ts
export interface SpellMutationDeps {
  loadSpell(spellId: string): Promise<SpellRow | null>;                         // prisma.spell.findUnique({ where: { id } })
  summon: typeof appendSummonedUnitToInitiativeEnd;
}
export function createSpellMutation(deps?: SpellMutationDeps): (ctx, body: SpellBody) => Promise<MutationResult>
export function bonusActionMutation(ctx, body: { participantId: string; skillId: string; targetParticipantId?: string }): MutationResult
export function moraleCheckMutation(ctx, body: { participantId: string; d10Roll: number }): MutationResult
```
Правила перевірок (з нинішніх роутів, без змін):
- spell: кастер існує (404); `isDM || (current.id === caster.id && caster.controlledBy === userId)` (403); кастер `active` (422 `participant_dead`); не DM і спела немає в `knownSpells` (422 `action_rejected`); спел іншої кампанії (404); якщо не `preview`: бонусна дія (`castingTime` містить "bonus") → `hasUsedBonusAction` (422 `action_used`), інакше `hasUsedAction` (422 `action_used`). Далі `processSpell` → злиття `casterUpdated`/`targetsUpdated` у порядок → саммон (якщо `!preview && success && !actionDetails.hitCheckMiss && spell.summonUnitId`) → одна подія. `preview` → `response: { preview: true, battleAction }`, без змін учасників.
- bonus-action: учасник існує (404); `isDM || controlledBy === userId` (403); скіл у `battleData.activeSkills` (422 `action_rejected`); `hasUsedBonusAction` (422 `action_used`); `executeBonusActionSkill(participant, skill, order, round, targetParticipantId, skillUsageCounts)`; учасникові записати мутовану копію `skillUsageCounts`; подія `{ type: "ability", actorId, details: { actorName, actorSide, actionDetails: { skillId, skillName } }, resultText: messages.join(" | ") }`.
- morale-check: учасник існує (404); `isDM || controlledBy === userId` (403); `checkMorale(participant, d10Roll)` → `scene: { pendingMoraleCheck: { participantId, d10Roll, moraleResult } }`, `events: []`, `response: { moraleResult }`.

Роути:
- `spell`: `access: "member"`, `requireStatus: "active"`, `rateLimitScope: "spell"`, `schema: spellSchema` (з `cast-spell-schema.ts` без змін), `dryRun: (b) => b.preview === true`, `respond: "battle"`, `mutate: createSpellMutation()`. Для `preview` `respond` має бути `"response"` — оскільки `respond` статичний, у мутації для preview повертати `response: { preview: true, battleAction }`, а в роуті `respond: "battle"` дає `{ ...battle, preview, battleAction }` — клієнтський `spellPreview` читає `preview` і `battleAction`, тож сумісно.
- `bonus-action`: `access: "member"`, `requireStatus: "active"`, `rateLimitScope: "bonusAction"`, `respond: "wrapped"`.
- `morale-check`: `access: "member"`, `requireStatus: "active"`, `schema: moraleCheckSchema` (з `lib/schemas/battles.ts`), `respond: "wrapped"`.

- [ ] **Step 1: Тести** — для кожної мутації: (1) щасливий шлях з `createMockParticipant`-фікстурами (spell — через `loadSpell`/`summon` моки; спел-рядок мінімальний: `{ id: "s1", campaignId: "c1", name: "Вогняна стріла", level: 1, castingTime: "1 action", type: "target", damageType: "damage", damageElement: "fire", diceCount: 1, diceType: "d10", summonUnitId: null }` + інші поля, яких вимагає `mapDbSpellToBattleSpell`, з `null`); (2) кожна гілка перевірок з таблиці вище кидає очікуваний клас помилки і код; (3) spell `preview` не змінює учасників; (4) morale повертає `pendingMoraleCheck` і `response.moraleResult`; (5) bonus-action поза своїм ходом дозволено контролеру (поведінка як зараз).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація за таблицею; перенести логіку з `cast-spell-handler.ts`/старих роутів рядок у рядок, замінивши `NextResponse.json({error}, {status})` на `throw new BattleAccessError/BattleRuleError`, а запис у БД і Pusher — на повернення `MutationResult`.
- [ ] **Step 4:** тести PASS; `tsc`, `lint` чисті.
- [ ] **Step 5:** коміт `feat(battle-routes): spell, bonus action and morale check on the mutation pipeline`.

---

### Task 7: DM-роути — `add-participant`, `add-summon`, `participants/[participantId]`, `complete`, `reset`, `rollback`

**Files:**
- Create: `*-mutation.ts` у кожній теці і тести `app/api/__tests__/battles/{add-participant,add-summon,patch-participant,complete,reset,rollback}-mutation.test.ts`
- Rewrite: шість `route.ts`
- Delete: `R/participants/[participantId]/patch-participant-handler.ts` (логіка переїжджає в мутацію)

**Interfaces / поведінка:**
- `add-participant` (`access: "dm"`, `active`): deps `{ loadCharacter(id), loadUnit(id) }` (Prisma-запити з нинішнього роуту без змін; чужа кампанія → 404); білдери як зараз; вставка після `turnIndex`; `distributePendingScopedArtifactBonuses`; `calculateInitiative` → `abilities.initiative` і `baseInitiative`; подія «DM додав на поле: …».
- `add-summon` (`access: "dm"`, `active`): літерал учасника з нинішнього роуту без змін → `pending: [...ctx.pending, summoned]`; подія «Призовано істоту: … (з’явиться на початку наступного раунду)».
- `participants/[participantId]` PATCH (`access: "dm"`, `active`, `rateLimitScope: "participantPatch"`, `params` містить `participantId`): `removeFromBattle` → фільтр + перерахунок `turnIndex` за нинішньою формулою (`removedIndex <= cur ? max(0, cur - (removedIndex < cur ? 1 : 0)) : cur`, обрізка до `len - 1`, `0` для порожнього) + подія «DM видалив з бою: …»; `currentHp` → `min(currentHp, maxHp)`, `unconscious` при `<= 0` (якщо не `dead`), `executeComplexTriggersForChangedParticipant`, подія зміни HP з `hpChanges` і, за наявності, системна подія тригерів.
  `runBattleMutation` приймає `params: { id, battleId }`; `participantId` передати в мутацію замиканням: `mutate: (ctx, body) => patchParticipantMutation(ctx, participantId, body)`.
- `complete` (`access: "dm"`, `active`): `result ?? checkVictoryConditions(order).result ?? "victory"` → `completeBattle` → `scene: { status: "completed", completedAt: new Date() }`, подія з `battleAction`.
- `reset` (`access: "dm"`, будь-який статус): `participants: []`, `pending: []`, `scene: { status: "prepared", round: 1, turnIndex: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null }`, `events: []`, `history: { clear: true }`.
- `rollback` (`access: "dm"`, будь-який статус, schema `{ actionIndex: z.number().int().min(1) }`): deps `{ loadSnapshotsFrom(battleId, seq) }`; немає знімків → 422 `action_rejected` («Немає збереженого стану для відкату»); `restoreParticipantsAt` → учасники; `scene` = `{ ...snapshots[0].state.scene, completedAt: state.scene.status === "completed" ? undefined : null }`; `history: { cancelFromSeq: snapshots[0].seq }`; `events: []`.

- [ ] **Step 1: Тести** — для кожної мутації щасливий шлях і перевірки з опису; для `rollback`: (1) знімок на `seq` → відкат саме до нього; (2) запит `actionIndex` на другу подію багатоподійної дії (знімка з таким `seq` немає) → відкат до знімка першої події і `history.cancelFromSeq` = його `seq`; (3) немає знімків → 422. Для `patch-participant`: видалення поточного учасника, видалення останнього, зміна HP до 0 → `unconscious`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація; логіка — з нинішніх роутів/хендлера без змін, лише заміна відповідей помилок на `throw` і запису на `MutationResult`.
- [ ] **Step 4:** тести PASS; `tsc`, `lint` чисті.
- [ ] **Step 5:** коміт `feat(battle-routes): DM actions, reset and snapshot rollback on the mutation pipeline`.

---

### Task 8: Читання — `GET`/`PATCH`/`DELETE` бою, список, `damage-breakdown`

**Files:**
- Rewrite: `R/route.ts`, `R/damage-breakdown/route.ts`, `app/api/campaigns/[id]/battles/route.ts` (лише GET), `lib/utils/battle/battle-scene-list-select.ts`
- Modify: `app/api/__tests__/battles-api.test.ts`

**Поведінка:**
- `GET R`: `runBattleMutation(req, { params, access: "member", dryRun: () => true, includeRecentEvents: 100, mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }) })` → повний legacy-бій із журналом останніх 100 нескасованих подій, `isDM`, `userRole`, `version`.
- `PATCH R`: `requireDM`; `z.object({ name: z.string().min(1).optional(), description: z.string().nullable().optional(), participants: createBattleSchema.shape.participants.optional() }).strict()`; невалідне → 400; `prisma.battleScene.update({ where: { id: battleId }, data })` лише з цими полями, з перевіркою `campaignId`; відповідь — як `GET` (через той самий dry-run).
- `DELETE R`: без змін (каскад видаляє рядки бою).
- Список `GET`: `battleSceneListSelect` без `initiativeOrder`, `pendingSummons`, `pendingMoraleCheck` (UI списку використовує лише `participants` лобі); у відповіді `initiativeOrder: []`, `battleLog: []`.
- `damage-breakdown` POST: `runBattleMutation(req, { params, access: "member", schema: <нинішня схема>, dryRun: () => true, respond: "response", mutate: (ctx, body) => ({ participants: ctx.participants, pending: ctx.pending, events: [], response: <нинішнє обчислення над ctx.participants> }) })`.

- [ ] **Step 1: Тести** — у `battles-api.test.ts` замінити тести `GET [battleId]` на моки `@/lib/utils/battle/pipeline/default-deps` (`getUserId`, `loadBattle`, `loadRecentEvents`) і перевірити: 200 з `userRole`, `isDM`, `battleLog` з подій; 404 без бою; 403 не учасник. Новий тест `PATCH`: зайве поле (`status`) → 400; `name` → 200 і `prisma.battleScene.update` викликано лише з `{ name }`. Тест списку: `findMany` викликано з `select`, що не містить `initiativeOrder`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація.
- [ ] **Step 4:** PASS; `tsc`, `lint` чисті.
- [ ] **Step 5:** коміт `feat(battle-routes): battle reads and damage breakdown from normalized store`.

---

### Task 9: Клієнт — append-журнал, версії, рефетч

**Files:**
- Modify: `lib/hooks/battles/useBattles-cache.ts`, `lib/hooks/battle/usePusherBattleSync.ts`
- Create/Modify: `lib/hooks/battles/__tests__/useBattles-cache.test.ts`, `lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx`

**Поведінка `mergeBattleCache(qc, campaignId, battleId, data)`:**
- `prev` відсутній → `data` (з `battleLog` як є).
- `data.version` і `prev.version` задані й `data.version <= prev.version` → повернути `prev` (застаріле ехо не відкочує кеш).
- `data.battleLogMode === "append"` → `battleLog = [...prev.battleLog.filter(e => !cancelled(e) && !newIds.has(e.actionIndex)), ...data.battleLog]`, де `cancelled(e) = data.battleLogCancelledFrom !== undefined && e.actionIndex >= data.battleLogCancelledFrom`.
- Інакше — як зараз (`battleLog` з `data`).
- `isDM`/`campaign`/`userRole` — як зараз (з `prev`, якщо в `data` немає).

**`usePusherBattleSync`:** light-payload (`{ type, battleId }`) → завжди `invalidateQueries`; прибрати пропуск «кеш оновлено менше 8 с тому».

- [ ] **Step 1: Тести**
```ts
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { mergeBattleCache } from "@/lib/hooks/battles/useBattles-cache";
import type { BattleScene } from "@/types/api";

const key = ["battle", "c1", "b1"];

const entry = (actionIndex: number) => ({ actionIndex, resultText: `#${actionIndex}` }) as BattleScene["battleLog"][number];

function seeded(prev: Partial<BattleScene>) {
  const qc = new QueryClient();

  qc.setQueryData(key, { id: "b1", battleLog: [], ...prev });

  return qc;
}

describe("mergeBattleCache", () => {
  it("append доклеює нові записи до наявного журналу", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1), entry(2)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLogMode: "append", battleLog: [entry(3)] } as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3]);
  });

  it("старіша версія не відкочує кеш", () => {
    const qc = seeded({ version: 5, currentTurnIndex: 3 });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 4, currentTurnIndex: 1, battleLog: [] } as unknown as BattleScene);

    expect(merged.currentTurnIndex).toBe(3);
  });

  it("відкат прибирає скасовані записи", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1), entry(2), entry(3)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLogMode: "append", battleLogCancelledFrom: 2, battleLog: [] } as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([1]);
  });

  it("повна відповідь (GET) замінює журнал", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLog: [entry(7)] } as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([7]);
  });
});
```
У `usePusherBattleSync.test.tsx` додати: light-payload одразу після `setQueryData` → `invalidateQueries` викликано.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація за описом.
- [ ] **Step 4:** PASS; `tsc`, `lint` чисті.
- [ ] **Step 5:** коміт `fix(battle-client): append battle log, ignore stale versions, always refetch on light payload`.

---

### Task 10: Прибирання, інтеграційний флоу, документація

**Files:**
- Delete: `lib/utils/battle/strip-battle-payload.ts` (+ тести, якщо є), `lib/utils/battle/get-battle-with-access.ts`
- Create: `tests/integration/battle-flow.integration.test.ts`
- Modify: `CLAUDE.md` (розділ «Battle data flow»), `ARCHITECTURE.md` (згадки видалених файлів)

- [ ] **Step 1: Інтеграційний флоу** (лише localhost, той самий guard, що в `battle-store.integration.test.ts`): створити користувачів, кампанію, бій `active` і двох учасників через `saveBattle`; через `runBattleMutation` з deps `{ getUserId: async () => <id>, loadBattle/saveBattle/loadRecentEvents — реальні (prisma), rateLimit: allowed, publish: vi.fn() }` виконати: атаку з `endTurn: true` (`attackMutation`) → перевірити `currentTurnIndex` змінився і в журналі є подія атаки; `nextTurnMutation` → хід далі; `rollback` з `actionIndex` = `seq` події атаки → учасники і `turnIndex` як до атаки, подій ≥ seq у `loadRecentEvents` немає; `publish` отримував `battle-updated`.
- [ ] **Step 2:** видалити файли; `grep -rn "strip-battle-payload\|get-battle-with-access\|preparePusherPayload\|stripStateBeforeForClient\|slimInitiativeOrderForStorage" app lib components` → порожньо.
- [ ] **Step 3:** документація — у `CLAUDE.md` «Battle data flow» описати: роут → `runBattleMutation` → `*-mutation.ts` (движок) → `saveBattle` (рядки учасників, події, знімки, `version`) → сумісні Pusher-події; legacy JSON-колонки `BattleScene` не використовуються і будуть видалені contract-міграцією.
- [ ] **Step 4:** `pnpm test:run && pnpm test:integration tests/integration/battle-flow.integration.test.ts tests/integration/battle-store.integration.test.ts && pnpm lint && npx tsc --noEmit -p . && pnpm build` → усе зелене.
- [ ] **Step 5:** коміт `chore(battle): remove legacy battle payload helpers, add end-to-end flow test`.
- [ ] **Step 6: Ручна перевірка** — `pnpm dev` (локальна БД): створити бій, старт, атака, наступний хід, заклинання, відкат у двох вкладках (DM + гравець); переконатися, що друга вкладка оновлюється, журнал росте, відкат прибирає записи.

---

## Поза цим планом

- **Contract-міграція** (видалення `initiativeOrder`, `battleLog`, `pendingSummons` з `battle_scenes`) — після того, як реліз частини B стабільно попрацює.
- **Частина C** — правила движка (спека §10) і валідація кубиків через `validateDiceRolls` (потребує визначити формули й крит для кожного типу кидка).
- **Клієнт на дельтах** (`battle-delta`, `applyBattleDelta`, `attack/resolve`) — під-проєкт «мобільний бій».
- **Скрипти `seed-mock-battle*`** пишуть legacy JSON і після релізу створюватимуть бої без учасників — оновити окремо.

## Self-review (виконано)

- **Покриття етапу 3 спеки (§7, §8):** start, next-turn (злиття движків), attack (+`endTurn`), spell, bonus-action, morale-check, DM-роути, rollback через знімки, PATCH з whitelist, GET з подіями — Tasks 4–8. `attack/resolve` і дельта-клієнт свідомо винесені (клієнтська частина).
- **Сумісність клієнта:** форма відповіді (`battle` / `{battle}` / `{battle, moraleResult}`), назви подій Pusher, `actionIndex` для відкату — Tasks 3, 6, 8, 9.
- **Узгодженість імен:** `battleActionToEvent`, `eventToBattleAction`, `systemEvent`, `loadRecentEvents`, `loadSnapshotsFrom`, `restoreParticipantsAt`, `toLegacyBattle`, `buildPusherMessages`, `toPipelineError`, `advanceTurn`, `attackMutation`, `nextTurnMutation`, `createStartMutation` — однакові в усіх задачах.
- **Відомі місця для Ruling під час виконання:** фактичні сигнатури `applyVictoryCompletion`/`applyPendingMoraleCheck` (Task 4) і поля спел-рядка для `mapDbSpellToBattleSpell` (Task 6) — звірити з кодом і підлаштувати виклики, не змінюючи движок.
