import { publicPending } from './public-pending';

import { BattleStatus } from '@/lib/constants/battle';
import { diffEdges, EDGE_DIFF_LIMIT } from '@/lib/utils/battle/grid/edge-diff';
import { diffTerrain } from '@/lib/utils/battle/grid/terrain';
import { diffMapState } from '@/lib/utils/battle/map-storage/effective-map';
import {
    clientMapOf,
    persistedMap,
} from '@/lib/utils/battle/map-storage/persisted-map';
import type { MapModeKey } from '@/lib/utils/battle/modes';
import { isModeMapKey, modeDeltas } from '@/lib/utils/battle/modes/client';
import type { BattleMeta, BattleSceneState } from '@/lib/utils/battle/store';
import {
    buildParticipantPatch,
    FULL_PARTICIPANT,
} from '@/lib/utils/battle/store';
import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import type { BattleKnowledge } from '@/lib/utils/battle/view/knowledge';
import type { BattleParticipantPatch, ClientBattleDelta } from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
} from '@/types/battle-grid';

const ids = (list: BattleParticipant[]) => list.map((p) => p.basicInfo.id);

const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]);

const baseOf = (map: BattleMapConfig) =>
    JSON.stringify(
        Object.fromEntries(
            Object.entries(map).filter(
                ([k]) =>
                    k !== 'terrain' &&
                    k !== 'spellZones' &&
                    k !== 'walls' &&
                    k !== 'bars' &&
                    !isModeMapKey(k)
            )
        )
    );

function mapChange(
    before: BattleMapConfig | null,
    after: BattleMapConfig | null | undefined
): Pick<
    ClientBattleDelta['scene'],
    'map' | 'terrain' | 'walls' | 'bars' | MapModeKey
> {
    if (after === undefined || before === after) return {};

    if (!before || !after || baseOf(before) !== baseOf(after))
        return { map: after };

    const modes = modeDeltas(before, after);

    if (modes === null) return { map: after };

    const walls = diffEdges(before.walls, after.walls);

    const bars = diffEdges(before.bars, after.bars);

    const edgeCount =
        (walls ? walls.add.length + walls.remove.length : 0) +
        (bars ? bars.add.length + bars.remove.length : 0);

    if (edgeCount > EDGE_DIFF_LIMIT) return { map: after };

    const terrain = diffTerrain(before.terrain, after.terrain);

    return {
        ...(terrain && { terrain }),
        ...(walls && { walls }),
        ...(bars && { bars }),
        ...modes,
    };
}

export function buildClientDelta(args: {
    before: {
        scene: BattleSceneState;
        meta: BattleMeta;
        participants: BattleParticipant[];
        pending: BattleParticipant[];
    };
    after: BattleSceneState;
    participants: BattleParticipant[];
    pending: BattleParticipant[];
    stored: BattleParticipant[];
    fullIds: string[];
    log: BattleAction[];
    cancelledFrom?: number;
    knowledge?: BattleKnowledge;
    map?: BattleMapConfig | null;
    mapState?: BattleMapState | null;
    mapRef?: BattleMapRef;
}): ClientBattleDelta {
    const {
        before,
        after,
        participants,
        pending,
        log,
        cancelledFrom,
        knowledge,
        map,
    } = args;

    const mapState =
        args.mapState === undefined ? before.meta.mapState : args.mapState;

    const stateDelta =
        args.mapState === undefined
            ? null
            : diffMapState(before.meta.mapState, mapState);

    const storedById = new Map(args.stored.map((p) => [p.basicInfo.id, p]));

    const full = new Set(args.fullIds);

    const previous = new Map(
        before.participants.map((p) => [p.basicInfo.id, p])
    );

    const upserted: BattleParticipant[] = [];

    const patched: BattleParticipantPatch[] = [];

    for (const { basicInfo } of participants) {
        const p = storedById.get(basicInfo.id);

        if (!p) continue;

        const old = previous.get(p.basicInfo.id);

        // a changed side/owner flips what a viewer may see, so the cache must not keep the old projection
        const reprojected =
            old &&
            (old.basicInfo.side !== p.basicInfo.side ||
                old.basicInfo.controlledBy !== p.basicInfo.controlledBy);

        const patch =
            old && !full.has(p.basicInfo.id) && !reprojected
                ? buildParticipantPatch(old, p)
                : FULL_PARTICIPANT;

        if (patch === FULL_PARTICIPANT) upserted.push(p);
        else if (patch) patched.push(patch);
    }

    const afterIds = new Set([...ids(participants), ...ids(pending)]);

    const beforeOrder = ids(before.participants);

    const afterOrder = ids(participants);

    const beforePending = ids(before.pending);

    const pendingChanged =
        !sameIds(beforePending, ids(pending)) ||
        pending.some((p) => storedById.has(p.basicInfo.id));

    const previousPending = new Map(
        before.pending.map((p) => [p.basicInfo.id, p])
    );

    const storedPending = pending.map(
        (p) =>
            storedById.get(p.basicInfo.id) ??
            previousPending.get(p.basicInfo.id) ??
            p
    );

    return {
        battleId: after.id,
        version: after.version,
        scene: {
            status: after.status,
            round: after.round,
            turnIndex: after.turnIndex,
            pendingChoice: publicPending(after.pendingChoice),
            ...(after.turnStartedAt &&
                after.turnStartedAt.getTime() !==
                    before.scene.turnStartedAt?.getTime() && {
                    turnStartedAt: after.turnStartedAt.toISOString(),
                }),
            ...(!jsonEqual(
                before.scene.sceneState ?? null,
                after.sceneState ?? null
            ) && { system: after.sceneState ?? null }),
            ...(after.startedAt
                ? { startedAt: after.startedAt.toISOString() }
                : before.scene.startedAt && { startedAt: null }),
            ...(after.completedAt
                ? { completedAt: after.completedAt.toISOString() }
                : before.scene.completedAt && { completedAt: null }),
            ...(map !== undefined &&
                mapChange(
                    clientMapOf(before.meta),
                    map && persistedMap(before.meta, map, mapState)
                )),
            ...(stateDelta && { mapState: stateDelta }),
            ...(args.mapRef && { mapRef: args.mapRef }),
        },
        upserted,
        ...(patched.length > 0 && { patched }),
        removed: [...beforeOrder, ...beforePending].filter(
            (id) => !afterIds.has(id)
        ),
        ...(!sameIds(beforeOrder, afterOrder) && { order: afterOrder }),
        ...(pendingChanged && { pending: storedPending }),
        ...(after.status === BattleStatus.PREPARED && {
            setup: before.meta.setup,
        }),
        log,
        ...(cancelledFrom !== undefined && { cancelledFrom }),
        ...(knowledge && { knowledge }),
    };
}
