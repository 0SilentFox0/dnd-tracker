import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE,
    BattleStatus,
} from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { replaceTerrain } from '@/lib/utils/battle/grid/terrain';
import { restoreModeSlices } from '@/lib/utils/battle/modes/server';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { upgradeSceneState } from '@/lib/utils/battle/scene-state';
import type { SnapshotState } from '@/lib/utils/battle/store';
import {
    BattleRuleError,
    loadSnapshotsFrom,
    restoreParticipantsAt,
} from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { isEmptyMapState } from '@/lib/utils/battle/store/snapshot-state';
import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import type { BattleMapConfig } from '@/types/battle-grid';

export const rollbackSchema = z.object({
    actionIndex: z.number().int().min(1),
});

type LoadSnapshots = (
    battleId: string,
    seq: number
) => Promise<Array<{ seq: number; state: SnapshotState }>>;

type IsActiveEvent = (battleId: string, seq: number) => Promise<boolean>;

const defaultLoad: LoadSnapshots = (battleId, seq) =>
    loadSnapshotsFrom(prisma, battleId, seq);

const defaultIsActiveEvent: IsActiveEvent = async (battleId, seq) =>
    (await prisma.battleEvent.count({
        where: { battleId, seq, cancelledAt: null },
    })) > 0;

function restoreMap(
    map: BattleMapConfig,
    scene: SnapshotState['scene']
): BattleMapConfig | undefined {
    const restored = restoreModeSlices(
        scene.terrain !== undefined ? replaceTerrain(map, scene.terrain) : map,
        scene
    );

    return restored === map ? undefined : restored;
}

export function createRollbackMutation(
    load: LoadSnapshots = defaultLoad,
    isActiveEvent: IsActiveEvent = defaultIsActiveEvent
) {
    return async (
        ctx: BattleMutationContext,
        body: z.infer<typeof rollbackSchema>
    ): Promise<MutationResult> => {
        // repeated click or a second DM tab: do not roll back a cancelled event twice
        if (!(await isActiveEvent(ctx.scene.id, body.actionIndex))) {
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.BATTLE_ACTION_NOT_IN_LOG
            );
        }

        const snapshots = await load(ctx.scene.id, body.actionIndex);

        const [first] = snapshots;

        if (!first) {
            throw new BattleRuleError('action_rejected', REJECT.rollbackLimit, {
                count: BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE,
            });
        }

        const { scene } = first.state;

        const { mapRef } = ctx.meta;

        if (
            mapRef &&
            scene.mapVersion !== undefined &&
            scene.mapVersion !== mapRef.version
        ) {
            throw new BattleRuleError(
                'action_rejected',
                REJECT.rollbackAcrossMapUpdate
            );
        }

        const { participants, pending } = restoreParticipantsAt(snapshots, ctx);

        const changed = snapshots.find((s) => s.state.scene.mapStateChanged);

        const mapState = changed?.state.scene.mapState ?? null;

        const stateChanged =
            !!changed &&
            !jsonEqual(
                isEmptyMapState(mapState) ? null : mapState,
                isEmptyMapState(ctx.meta.mapState) ? null : ctx.meta.mapState
            );

        const map = ctx.meta.map ? restoreMap(ctx.meta.map, scene) : undefined;

        return {
            participants,
            pending,
            scene: {
                round: scene.round,
                turnIndex: scene.turnIndex,
                status: scene.status,
                pendingChoice: null,
                sceneState:
                    upgradeSceneState(ctx.meta.rules, scene.sceneState, {
                        pendingMoraleCheck: scene.pendingMoraleCheck,
                    }) ?? null,
                ...(scene.status !== BattleStatus.COMPLETED && {
                    completedAt: null,
                }),
                ...(map && { map }),
                ...(stateChanged && { mapState }),
            },
            events: [],
            history: { cancelFromSeq: first.seq },
        };
    };
}
