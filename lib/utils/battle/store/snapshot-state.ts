import type { ParticipantsDiff } from "./diff-participants";
import type {
  BattleSceneState,
  ParticipantColumns,
  ParticipantSnapshot,
  ParticipantState,
  StoredParticipant,
} from "./types";

import type { MapModeKey } from "@/lib/utils/battle/modes";
import { modeSnapshotSlice } from "@/lib/utils/battle/modes/server";
import { hasMomentum } from "@/lib/utils/battle/momentum";
import type { BattleMapConfig, SceneMomentum, TerrainCell } from "@/types/battle";

export interface SnapshotState {
  /** terrain і конфіги режимів лише для боїв із картою; старі знімки без поля — цю частину карти при відкаті не чіпаємо */
  scene: Pick<BattleSceneState, "round" | "turnIndex" | "status" | "pendingMoraleCheck"> & { momentum?: SceneMomentum } & {
    terrain?: Record<string, TerrainCell> | null;
  } & Partial<Record<MapModeKey, unknown>>;
  participants: Array<{ columns: ParticipantColumns; state: ParticipantState }>;
  changedSnapshots?: Record<string, ParticipantSnapshot>;
  removed?: StoredParticipant[];
}

export function buildSnapshotState(
  scene: BattleSceneState,
  before: StoredParticipant[],
  diff: ParticipantsDiff,
  map: BattleMapConfig | null = null,
): SnapshotState {
  const prev = new Map(before.map((p) => [p.columns.id, p]));

  const changed = diff.updated.filter((u) => u.snapshotChanged);

  const result: SnapshotState = {
    scene: {
      round: scene.round,
      turnIndex: scene.turnIndex,
      status: scene.status,
      pendingMoraleCheck: scene.pendingMoraleCheck,
      ...(hasMomentum(scene.momentum) && { momentum: scene.momentum }),
      ...(map && { terrain: map.terrain ?? null, ...modeSnapshotSlice(map) }),
    },
    participants: before.map((p) => ({ columns: p.columns, state: p.state })),
  };

  if (changed.length > 0) {
    result.changedSnapshots = Object.fromEntries(
      changed.flatMap((u) => {
        const old = prev.get(u.next.columns.id);

        return old ? [[u.next.columns.id, old.snapshot] as const] : [];
      }),
    );
  }

  if (diff.removed.length > 0) result.removed = diff.removed;

  return result;
}
