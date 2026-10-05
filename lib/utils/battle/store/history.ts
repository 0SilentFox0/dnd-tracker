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
