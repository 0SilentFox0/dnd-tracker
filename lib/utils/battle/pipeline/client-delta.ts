import type { BattleMeta, BattleSceneState } from "@/lib/utils/battle/store";
import type { ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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
    ...(after.status === "prepared" && { setup: before.meta.setup }),
    log,
    ...(cancelledFrom !== undefined && { cancelledFrom }),
  };
}
