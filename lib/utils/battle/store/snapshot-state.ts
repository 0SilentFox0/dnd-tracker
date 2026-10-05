import type { ParticipantsDiff } from "./diff-participants";
import type {
  BattleSceneState,
  ParticipantColumns,
  ParticipantSnapshot,
  ParticipantState,
  StoredParticipant,
} from "./types";

export interface SnapshotState {
  scene: Pick<BattleSceneState, "round" | "turnIndex" | "status" | "pendingMoraleCheck">;
  participants: Array<{ columns: ParticipantColumns; state: ParticipantState }>;
  changedSnapshots?: Record<string, ParticipantSnapshot>;
  removed?: StoredParticipant[];
}

export function buildSnapshotState(
  scene: BattleSceneState,
  before: StoredParticipant[],
  diff: ParticipantsDiff,
): SnapshotState {
  const prev = new Map(before.map((p) => [p.columns.id, p]));

  const changed = diff.updated.filter((u) => u.snapshotChanged);

  const result: SnapshotState = {
    scene: {
      round: scene.round,
      turnIndex: scene.turnIndex,
      status: scene.status,
      pendingMoraleCheck: scene.pendingMoraleCheck,
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
