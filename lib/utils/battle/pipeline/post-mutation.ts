import { BattleStatus } from '@/lib/constants/battle';
import { syncMapAuras } from '@/lib/utils/abilities/engine/effects/map-auras';
import { actionsOf } from '@/lib/utils/battle/actions/access';
import { placeParticipants } from '@/lib/utils/battle/grid/placement';
import { placeRevived } from '@/lib/utils/battle/grid/revive-placement';
import { pruneExpiredTerrain } from '@/lib/utils/battle/grid/terrain';
import { lineText } from '@/lib/utils/battle/log/lines';
import { clearFallenEffects, dropAbsentHelp } from '@/lib/utils/battle/participant/fallen';
import { reserveOf } from '@/lib/utils/battle/participant/reserve';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { sweepOrphanedAnchored } from '@/lib/utils/battle/spell/anchored-zone';
import type { BattleSceneState } from '@/lib/utils/battle/store';
import { battleActionToEvent, systemEvent } from '@/lib/utils/battle/store';
import { dismissExpiredSummons } from '@/lib/utils/battle/summon/dismiss';
import { revertExpiredTransforms } from '@/lib/utils/battle/transform/revert';
import {
    checkVictoryConditions,
    completeBattle,
} from '@/lib/utils/battle/turn/victory';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export function withVictory(
    scene: BattleSceneState,
    result: MutationResult,
    rules: Ruleset
): MutationResult {
    const status = result.scene?.status ?? scene.status;

    if (status !== BattleStatus.ACTIVE) return result;

    const victory = checkVictoryConditions(
        result.participants,
        reserveOf(result.pending),
        rules
    );

    if (!victory.result) return result;

    const round = result.scene?.round ?? scene.round;

    const { updatedParticipants, battleAction } = completeBattle(
        result.participants,
        victory.result,
        round,
        rules
    );

    return {
        ...result,
        participants: updatedParticipants,
        scene: {
            ...result.scene,
            status: BattleStatus.COMPLETED,
            completedAt: new Date(),
        },
        events: [
            ...result.events,
            battleActionToEvent({ ...battleAction, round }),
        ],
    };
}

export function withoutTimedTerrainOnEnd(
    map: BattleMapConfig | null,
    before: BattleStatus,
    result: MutationResult
): MutationResult {
    if (
        result.scene?.status !== BattleStatus.COMPLETED ||
        before === BattleStatus.COMPLETED
    )
        return result;

    const current = result.scene.map !== undefined ? result.scene.map : map;

    const pruned = current
        ? pruneExpiredTerrain(current, Number.POSITIVE_INFINITY)
        : null;

    return pruned
        ? { ...result, scene: { ...result.scene, map: pruned } }
        : result;
}

export function withPlacement(
    map: BattleMapConfig | null,
    scene: {
        status: BattleStatus;
        round: number;
        participants: BattleParticipant[];
    },
    result: MutationResult,
    place: boolean,
    rules: Ruleset
): MutationResult {
    const dismissed = dismissExpiredSummons(
        result.participants,
        result.scene?.round ?? scene.round,
        rules
    );

    if (dismissed.participants !== result.participants)
        result = {
            ...result,
            participants: dismissed.participants,
            events: [
                ...result.events,
                systemEvent(
                    result.scene?.round ?? scene.round,
                    lineText(dismissed.messages, '; ')
                ),
            ],
        };

    const reverted = revertExpiredTransforms(
        result.participants,
        result.scene?.round ?? scene.round,
        rules
    );

    if (reverted.participants !== result.participants)
        result = {
            ...result,
            participants: reverted.participants,
            events: [
                ...result.events,
                systemEvent(
                    result.scene?.round ?? scene.round,
                    lineText(reverted.messages, '; ')
                ),
            ],
        };

    const cleared = dropAbsentHelp(
        clearFallenEffects(result.participants, rules)
    );

    if (cleared !== result.participants)
        result = { ...result, participants: cleared };

    const released = actionsOf(rules).releaseInvalidGrapples(
        result.participants,
        map
    );

    if (released.participants !== result.participants)
        result = {
            ...result,
            participants: released.participants,
            events: [
                ...result.events,
                systemEvent(
                    result.scene?.round ?? scene.round,
                    lineText(released.messages, '; ')
                ),
            ],
        };

    const swept = sweepOrphanedAnchored(result.participants);

    if (swept !== result.participants)
        result = { ...result, participants: swept };

    const barred = ruleSystemOf(rules).magic.sustain.dropBarred?.(
        result.participants,
        rules
    );

    if (barred && barred.participants !== result.participants)
        result = {
            ...result,
            participants: barred.participants,
            events: [
                ...result.events,
                systemEvent(
                    result.scene?.round ?? scene.round,
                    lineText(barred.messages, '; ')
                ),
            ],
        };

    const orphaned = ruleSystemOf(rules).magic.sustain.dropOrphaned(
        result.participants,
        map,
        result.scene?.round ?? scene.round
    );

    if (orphaned.participants !== result.participants)
        result = {
            ...result,
            participants: orphaned.participants,
            events: [
                ...result.events,
                systemEvent(
                    result.scene?.round ?? scene.round,
                    lineText(orphaned.messages, '; ')
                ),
            ],
        };

    if (!map || (result.scene?.status ?? scene.status) !== BattleStatus.ACTIVE)
        return result;

    const placed = place
        ? placeParticipants(
              map,
              placeRevived(map, scene.participants, result.participants)
          )
        : result.participants;

    const participants = syncMapAuras(placed, map);

    return participants === result.participants
        ? result
        : { ...result, participants };
}
