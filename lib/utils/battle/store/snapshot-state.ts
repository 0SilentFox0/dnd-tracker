import type { ParticipantsDiff } from "./diff-participants";
import type {
  BattleSceneState,
  ParticipantColumns,
  ParticipantSnapshot,
  ParticipantState,
  StoredParticipant,
} from "./types";

import type { BattleMapConfig, MazeConfig, TerrainCell } from "@/types/battle";

export interface SnapshotState {
  /** terrain і maze лише для боїв із картою; старі знімки без поля — цю частину карти при відкаті не чіпаємо */
  scene: Pick<BattleSceneState, "round" | "turnIndex" | "status" | "pendingMoraleCheck"> & {
    terrain?: Record<string, TerrainCell> | null;
    maze?: MazeConfig | null;
  };
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
      ...(map && { terrain: map.terrain ?? null, maze: map.maze ?? null }),
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
