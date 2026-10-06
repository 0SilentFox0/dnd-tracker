import { Prisma } from "@prisma/client";

import type { ParticipantsDiff, ParticipantUpdate } from "./diff-participants";
import { diffParticipants } from "./diff-participants";
import { BattleConflictError } from "./errors";
import type { BattleDb } from "./load-battle";
import { buildSnapshotState } from "./snapshot-state";
import { joinParticipant, splitParticipant } from "./split-participant";
import type {
  BattleDelta,
  BattleMutationOutcome,
  BattleSceneState,
  LoadedBattle,
  ParticipantColumns,
  StoredBattleEvent,
  StoredParticipant,
} from "./types";

import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

type UpdatableColumn = Exclude<keyof ParticipantColumns, "id">;

const COLUMN_SQL_TYPES: Record<UpdatableColumn, "text" | "int" | "boolean"> = {
  sourceType: "text",
  sourceId: "text",
  side: "text",
  controlledBy: "text",
  orderIndex: "int",
  isPending: "boolean",
  extraTurnOf: "text",
  currentHp: "int",
  tempHp: "int",
  maxHp: "int",
  morale: "int",
  status: "text",
  initiative: "int",
  hasUsedAction: "boolean",
  hasUsedBonusAction: "boolean",
  hasUsedReaction: "boolean",
  hasExtraTurn: "boolean",
};

const UPDATABLE_COLUMNS = Object.keys(COLUMN_SQL_TYPES) as UpdatableColumn[];

const quoted = (name: string) => Prisma.raw(`"${name}"`);

// один UPDATE … FROM (VALUES …) без RETURNING: кількість запитів не росте з кількістю учасників
function updateParticipantsSql(battleId: string, updates: ParticipantUpdate[]): Prisma.Sql {
  const rows = updates.map(({ next, snapshotChanged }) => {
    const values = UPDATABLE_COLUMNS.map((c) => Prisma.sql`${next.columns[c]}::${Prisma.raw(COLUMN_SQL_TYPES[c])}`);

    return Prisma.sql`(${next.columns.id}, ${Prisma.join(values)}, ${JSON.stringify(next.state)}::jsonb, ${
      snapshotChanged ? JSON.stringify(next.snapshot) : null
    }::jsonb, ${snapshotChanged ? next.snapshotHash : null}::text)`;
  });

  const assignments = UPDATABLE_COLUMNS.map((c) => Prisma.sql`${quoted(c)} = v.${quoted(c)}`);

  return Prisma.sql`
    UPDATE battle_participants AS p SET
      ${Prisma.join(assignments)},
      state = v.state,
      snapshot = COALESCE(v.snapshot, p.snapshot),
      "snapshotHash" = COALESCE(v."snapshotHash", p."snapshotHash")
    FROM (VALUES ${Prisma.join(rows)}) AS v(id, ${Prisma.join(UPDATABLE_COLUMNS.map(quoted))}, state, snapshot, "snapshotHash")
    WHERE p.id = v.id AND p."battleId" = ${battleId}
  `;
}

function pruneSnapshotsSql(battleId: string): Prisma.Sql {
  return Prisma.sql`
    DELETE FROM battle_snapshots
    WHERE "battleId" = ${battleId} AND seq < (
      SELECT seq FROM battle_snapshots WHERE "battleId" = ${battleId}
      ORDER BY seq DESC OFFSET ${BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE - 1} LIMIT 1
    )
  `;
}

function toStored(participants: BattleParticipant[], pending: BattleParticipant[]): StoredParticipant[] {
  return [
    ...participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false })),
    ...pending.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: true })),
  ];
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export interface PreparedSave {
  beforeStored: StoredParticipant[];
  diff: ParticipantsDiff;
  events: StoredBattleEvent[];
  clearHistory: boolean;
  delta: BattleDelta;
}

export function prepareSave(before: LoadedBattle, outcome: BattleMutationOutcome): PreparedSave {
  const { scene } = before;

  const beforeStored = toStored(before.participants, before.pending);

  const diff = diffParticipants(beforeStored, toStored(outcome.participants, outcome.pending));

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

  const nextScene: BattleSceneState = { ...scene, ...outcome.scene };

  const delta: BattleDelta = {
    battleId: scene.id,
    version: scene.version + 1,
    scene: {
      status: nextScene.status,
      round: nextScene.round,
      turnIndex: nextScene.turnIndex,
      pendingMoraleCheck: nextScene.pendingMoraleCheck,
    },
    upserted: [...diff.created, ...diff.updated.map((u) => u.next)].map((p) => joinParticipant(p, scene.id)),
    fullIds: [...diff.created, ...diff.updated.filter((u) => u.snapshotChanged).map((u) => u.next)].map((p) => p.columns.id),
    removed: diff.removed.map((p) => p.columns.id),
    events,
  };

  return { beforeStored, diff, events, clearHistory, delta };
}

export async function saveBattle(
  db: BattleDb,
  before: LoadedBattle,
  outcome: BattleMutationOutcome,
): Promise<BattleDelta> {
  const { scene } = before;

  const patch = outcome.scene ?? {};

  const { beforeStored, diff, events, clearHistory, delta } = prepareSave(before, outcome);

  const completing = patch.status === "completed" && scene.status !== "completed";

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

    if (diff.updated.length > 0) await tx.$executeRaw(updateParticipantsSql(scene.id, diff.updated));

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
      await tx.battleSnapshot.createMany({
        data: [
          {
            battleId: scene.id,
            seq: events[0].seq,
            state: buildSnapshotState(scene, beforeStored, diff) as unknown as Prisma.InputJsonValue,
          },
        ],
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

    if (completing) await tx.$executeRaw(pruneSnapshotsSql(scene.id));
  });

  return delta;
}
