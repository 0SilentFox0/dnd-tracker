import type { ParticipantsDiff } from './diff-participants';
import type {
    BattleSceneState,
    ParticipantColumns,
    ParticipantSnapshot,
    ParticipantState,
    StoredParticipant,
} from './types';

import type { MapModeKey } from '@/lib/utils/battle/modes';
import { modeSnapshotSlice } from '@/lib/utils/battle/modes/server';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
    FogState,
    TerrainCell,
} from '@/types/battle-grid';

export const isEmptyMapState = (state: BattleMapState | null | undefined) =>
    !state ||
    (state.removedEdges.length === 0 &&
        Object.keys(state.doors).length === 0 &&
        !state.fog);

export const rowToMapState = (
    row: { removedEdges: unknown; doors: unknown; fog: unknown } | null
): BattleMapState | null =>
    row
        ? {
              removedEdges: row.removedEdges as string[],
              doors: row.doors as BattleMapState['doors'],
              ...(row.fog ? { fog: row.fog as FogState } : {}),
          }
        : null;

export interface SnapshotState {
    scene: Pick<BattleSceneState, 'round' | 'turnIndex' | 'status'> & {
        sceneState?: SystemSlot;
        mapState?: BattleMapState;
        mapStateChanged?: true;
        mapVersion?: number;
    } & {
        terrain?: Record<string, TerrainCell> | null;
    } & Partial<Record<MapModeKey, unknown>>;
    participants: Array<{
        columns: ParticipantColumns;
        state: ParticipantState;
    }>;
    changedSnapshots?: Record<string, ParticipantSnapshot>;
    removed?: StoredParticipant[];
}

export function buildSnapshotState(
    scene: BattleSceneState,
    before: StoredParticipant[],
    diff: ParticipantsDiff,
    map: BattleMapConfig | null = null,
    mapLayer: {
        mapState?: BattleMapState | null;
        mapRef?: BattleMapRef | null;
        mapStateChanged?: boolean;
    } = {}
): SnapshotState {
    const prev = new Map(before.map((p) => [p.columns.id, p]));

    const changed = diff.updated.filter((u) => u.snapshotChanged);

    const result: SnapshotState = {
        scene: {
            round: scene.round,
            turnIndex: scene.turnIndex,
            status: scene.status,
            ...(scene.sceneState && { sceneState: scene.sceneState }),
            ...(mapLayer.mapStateChanged && {
                mapState: isEmptyMapState(mapLayer.mapState)
                    ? { removedEdges: [], doors: {} }
                    : (mapLayer.mapState as BattleMapState),
                mapStateChanged: true as const,
            }),
            ...(mapLayer.mapRef && { mapVersion: mapLayer.mapRef.version }),
            ...(map && {
                terrain: map.terrain ?? null,
                ...modeSnapshotSlice(map),
            }),
        },
        participants: before.map((p) => ({
            columns: p.columns,
            state: p.state,
        })),
    };

    if (changed.length > 0) {
        result.changedSnapshots = Object.fromEntries(
            changed.flatMap((u) => {
                const old = prev.get(u.next.columns.id);

                return old ? [[u.next.columns.id, old.snapshot] as const] : [];
            })
        );
    }

    if (diff.removed.length > 0) result.removed = diff.removed;

    return result;
}
