import { BattleStatus } from "@/lib/constants/battle";
import { diffTerrain } from "@/lib/utils/battle/grid/terrain";
import type { MapModeKey } from "@/lib/utils/battle/modes";
import { MODE_MAP_KEYS, modeDeltas } from "@/lib/utils/battle/modes/client";
import type { BattleMeta, BattleSceneState } from "@/lib/utils/battle/store";
import { buildParticipantPatch, FULL_PARTICIPANT } from "@/lib/utils/battle/store";
import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";
import type { BattleParticipantPatch, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

const ids = (list: BattleParticipant[]) => list.map((p) => p.basicInfo.id);

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

const baseOf = (map: BattleMapConfig) => JSON.stringify(Object.fromEntries(Object.entries(map).filter(([k]) => k !== "terrain" && !MODE_MAP_KEYS.includes(k))));

// повну карту шлемо лише коли змінилось щось, крім місцевості й полів лабіринту: інакше великі штрихи переповнюють Pusher
function mapChange(before: BattleMapConfig | null, after: BattleMapConfig | null | undefined): Pick<ClientBattleDelta["scene"], "map" | "terrain" | MapModeKey> {
  if (after === undefined || before === after) return {};

  if (!before || !after || baseOf(before) !== baseOf(after)) return { map: after };

  const modes = modeDeltas(before, after);

  if (modes === null) return { map: after };

  const terrain = diffTerrain(before.terrain, after.terrain);

  return { ...(terrain && { terrain }), ...modes };
}

export function buildClientDelta(args: {
  before: { scene: BattleSceneState; meta: BattleMeta; participants: BattleParticipant[]; pending: BattleParticipant[] };
  after: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  /** змінені учасники у збереженій формі (split → join): клієнт має бачити те саме, що віддасть GET */
  stored: BattleParticipant[];
  /** нові учасники й ті, чий знімок змінився */
  fullIds: string[];
  log: BattleAction[];
  cancelledFrom?: number;
  knowledge?: BattleKnowledge;
  /** карта після мутації, якщо мутація її повернула */
  map?: BattleMapConfig | null;
}): ClientBattleDelta {
  const { before, after, participants, pending, log, cancelledFrom, knowledge, map } = args;

  const storedById = new Map(args.stored.map((p) => [p.basicInfo.id, p]));

  const full = new Set(args.fullIds);

  const previous = new Map(before.participants.map((p) => [p.basicInfo.id, p]));

  const upserted: BattleParticipant[] = [];

  const patched: BattleParticipantPatch[] = [];

  for (const { basicInfo } of participants) {
    const p = storedById.get(basicInfo.id);

    if (!p) continue;

    const old = previous.get(p.basicInfo.id);

    const patch = old && !full.has(p.basicInfo.id) ? buildParticipantPatch(old, p) : FULL_PARTICIPANT;

    if (patch === FULL_PARTICIPANT) upserted.push(p);
    else if (patch) patched.push(patch);
  }

  const afterIds = new Set([...ids(participants), ...ids(pending)]);

  const beforeOrder = ids(before.participants);

  const afterOrder = ids(participants);

  const beforePending = ids(before.pending);

  const pendingChanged = !sameIds(beforePending, ids(pending)) || pending.some((p) => storedById.has(p.basicInfo.id));

  const previousPending = new Map(before.pending.map((p) => [p.basicInfo.id, p]));

  const storedPending = pending.map((p) => storedById.get(p.basicInfo.id) ?? previousPending.get(p.basicInfo.id) ?? p);

  return {
    battleId: after.id,
    version: after.version,
    scene: {
      status: after.status,
      round: after.round,
      turnIndex: after.turnIndex,
      pendingMoraleCheck: after.pendingMoraleCheck,
      ...(after.startedAt ? { startedAt: after.startedAt.toISOString() } : before.scene.startedAt && { startedAt: null }),
      ...(after.completedAt
        ? { completedAt: after.completedAt.toISOString() }
        : before.scene.completedAt && { completedAt: null }),
      ...mapChange(before.meta.map, map),
    },
    upserted,
    ...(patched.length > 0 && { patched }),
    removed: [...beforeOrder, ...beforePending].filter((id) => !afterIds.has(id)),
    ...(!sameIds(beforeOrder, afterOrder) && { order: afterOrder }),
    ...(pendingChanged && { pending: storedPending }),
    ...(after.status === BattleStatus.PREPARED && { setup: before.meta.setup }),
    log,
    ...(cancelledFrom !== undefined && { cancelledFrom }),
    ...(knowledge && { knowledge }),
  };
}
