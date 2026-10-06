import { Prisma } from "@prisma/client";

import { eventToBattleAction } from "./event-mapping";
import type { BattleDb } from "./load-battle";
import type { SnapshotState } from "./snapshot-state";
import { joinParticipant, splitParticipant } from "./split-participant";
import type { LoadedBattle, ParticipantSnapshot, StoredBattleEvent } from "./types";

import { BATTLE_LOG_RECENT_EVENTS } from "@/lib/constants/battle";
import { KNOWLEDGE_EVENT_TYPES } from "@/lib/utils/battle/view/knowledge";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const EVENT_SELECT = {
  seq: true,
  round: true,
  type: true,
  actorId: true,
  targets: true,
  details: true,
  hpChanges: true,
  resultText: true,
  createdAt: true,
  cancelledAt: true,
} as const satisfies Prisma.BattleEventSelect;

type EventRow = Prisma.BattleEventGetPayload<{ select: typeof EVENT_SELECT }>;

function toActions(rows: EventRow[], battleId: string): BattleAction[] {
  return rows.map((r) =>
    eventToBattleAction(r as unknown as StoredBattleEvent, battleId, { createdAt: r.createdAt, cancelledAt: r.cancelledAt }),
  );
}

export async function loadRecentEvents(db: BattleDb, battleId: string, limit = BATTLE_LOG_RECENT_EVENTS): Promise<BattleAction[]> {
  const rows = await db.battleEvent.findMany({
    where: { battleId, cancelledAt: null },
    orderBy: { seq: "desc" },
    take: limit,
    select: EVENT_SELECT,
  });

  return toActions(rows.reverse(), battleId);
}

export async function loadEventsBefore(
  db: BattleDb,
  battleId: string,
  page: { before: number; limit: number },
): Promise<{ events: BattleAction[]; hasMore: boolean }> {
  const rows = await db.battleEvent.findMany({
    where: { battleId, cancelledAt: null, seq: { lt: page.before } },
    orderBy: { seq: "desc" },
    take: page.limit + 1,
    select: EVENT_SELECT,
  });

  return { events: toActions(rows.slice(0, page.limit).reverse(), battleId), hasMore: rows.length > page.limit };
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

type KnowledgeEventRow = Pick<StoredBattleEvent, "seq" | "round" | "type" | "actorId" | "targets" | "details">;

// лише поля, які читають knownArmorClass / observedTraits — без повного details на кожен GET
export async function loadKnowledgeEvents(db: BattleDb, battleId: string): Promise<BattleAction[]> {
  const rows = await db.$queryRaw<KnowledgeEventRow[]>(Prisma.sql`
    SELECT seq, round, type, "actorId", targets,
      jsonb_strip_nulls(jsonb_build_object(
        'actorName', details->'actorName',
        'actionDetails', jsonb_build_object(
          'totalAttackValue', details->'actionDetails'->'totalAttackValue',
          'isHit', details->'actionDetails'->'isHit',
          'isCritical', details->'actionDetails'->'isCritical',
          'isCriticalFail', details->'actionDetails'->'isCriticalFail',
          'damageSteps', details->'actionDetails'->'damageSteps'
        )
      )) AS details
    FROM battle_events
    WHERE "battleId" = ${battleId} AND "cancelledAt" IS NULL AND type IN (${Prisma.join(KNOWLEDGE_EVENT_TYPES)})
    ORDER BY seq ASC
  `);

  return rows.map((r) => eventToBattleAction({ ...r, hpChanges: [], resultText: "" } as unknown as StoredBattleEvent, battleId));
}
