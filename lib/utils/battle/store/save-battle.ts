import { Prisma } from "@prisma/client";

import { diffParticipants } from "./diff-participants";
import { BattleConflictError } from "./errors";
import type { BattleDb } from "./load-battle";
import { buildSnapshotState } from "./snapshot-state";
import { joinParticipant, splitParticipant } from "./split-participant";
import type { BattleDelta, BattleMutationOutcome, LoadedBattle, StoredBattleEvent, StoredParticipant } from "./types";

import type { BattleParticipant } from "@/types/battle";

function toStored(participants: BattleParticipant[], pending: BattleParticipant[]): StoredParticipant[] {
  return [
    ...participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false })),
    ...pending.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: true })),
  ];
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export async function saveBattle(
  db: BattleDb,
  before: LoadedBattle,
  outcome: BattleMutationOutcome,
): Promise<BattleDelta> {
  const { scene } = before;

  const patch = outcome.scene ?? {};

  const beforeStored = toStored(before.participants, before.pending);

  const afterStored = toStored(outcome.participants, outcome.pending);

  const diff = diffParticipants(beforeStored, afterStored);

  const clearHistory = Boolean(outcome.history && "clear" in outcome.history);

  const firstSeq = clearHistory ? 1 : scene.eventSeq + 1;

  const events: StoredBattleEvent[] = outcome.events.map((e, i) => ({
    seq: firstSeq + i,
    type: e.type,
    round: e.round,
    actorId: e.actorId ?? null,
    targets: e.targets ?? [],
    details: e.details ?? {},
    hpChanges: e.hpChanges ?? [],
    resultText: e.resultText,
  }));

  const nextScene = { ...scene, ...patch };

  await db.$transaction(async (tx) => {
    const { count } = await tx.battleScene.updateMany({
      where: { id: scene.id, version: scene.version },
      data: {
        version: { increment: 1 },
        eventSeq: clearHistory ? events.length : scene.eventSeq + events.length,
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.round !== undefined && { currentRound: patch.round }),
        ...(patch.turnIndex !== undefined && { currentTurnIndex: patch.turnIndex }),
        ...(patch.pendingMoraleCheck !== undefined && { pendingMoraleCheck: jsonOrNull(patch.pendingMoraleCheck) }),
        ...(patch.startedAt !== undefined && { startedAt: patch.startedAt }),
        ...(patch.completedAt !== undefined && { completedAt: patch.completedAt }),
      },
    });

    if (count === 0) throw new BattleConflictError();

    if (diff.created.length > 0) {
      await tx.battleParticipant.createMany({
        data: diff.created.map((p) => ({
          ...p.columns,
          battleId: scene.id,
          snapshot: p.snapshot as Prisma.InputJsonValue,
          state: p.state as unknown as Prisma.InputJsonValue,
          snapshotHash: p.snapshotHash,
        })),
      });
    }

    if (diff.removed.length > 0) {
      await tx.battleParticipant.deleteMany({
        where: { battleId: scene.id, id: { in: diff.removed.map((p) => p.columns.id) } },
      });
    }

    for (const u of diff.updated) {
      const { id, ...columns } = u.next.columns;

      await tx.battleParticipant.update({
        where: { id },
        data: {
          ...(u.columnsChanged && columns),
          ...(u.stateChanged && { state: u.next.state as unknown as Prisma.InputJsonValue }),
          ...(u.snapshotChanged && {
            snapshot: u.next.snapshot as Prisma.InputJsonValue,
            snapshotHash: u.next.snapshotHash,
          }),
        },
      });
    }

    if (outcome.history && "cancelFromSeq" in outcome.history) {
      await tx.battleEvent.updateMany({
        where: { battleId: scene.id, seq: { gte: outcome.history.cancelFromSeq }, cancelledAt: null },
        data: { cancelledAt: new Date() },
      });
      await tx.battleSnapshot.deleteMany({
        where: { battleId: scene.id, seq: { gte: outcome.history.cancelFromSeq } },
      });
    }

    if (clearHistory) {
      await tx.battleEvent.deleteMany({ where: { battleId: scene.id } });
      await tx.battleSnapshot.deleteMany({ where: { battleId: scene.id } });
    }

    if (events.length > 0) {
      await tx.battleSnapshot.create({
        data: {
          battleId: scene.id,
          seq: firstSeq,
          state: buildSnapshotState(scene, beforeStored, diff) as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.battleEvent.createMany({
        data: events.map((e) => ({
          ...e,
          battleId: scene.id,
          targets: e.targets as Prisma.InputJsonValue,
          details: e.details as Prisma.InputJsonValue,
          hpChanges: e.hpChanges as Prisma.InputJsonValue,
        })),
      });
    }
  });

  return {
    battleId: scene.id,
    version: scene.version + 1,
    scene: {
      status: nextScene.status,
      round: nextScene.round,
      turnIndex: nextScene.turnIndex,
      pendingMoraleCheck: nextScene.pendingMoraleCheck,
    },
    upserted: [...diff.created, ...diff.updated.map((u) => u.next)].map((p) => joinParticipant(p, scene.id)),
    removed: diff.removed.map((p) => p.columns.id),
    events,
  };
}
