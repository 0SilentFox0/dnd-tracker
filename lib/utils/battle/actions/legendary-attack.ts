import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    findParticipant,
    isAttackable,
} from '@/lib/utils/abilities/engine/core/participants';
import { reject } from '@/lib/utils/battle/actions/errors';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import type {
    LegendaryAttackInput,
    LegendaryAttackResult,
} from '@/lib/utils/battle/actions/types';
import { assertAttackAllowed } from '@/lib/utils/battle/attack/assert-allowed';
import { getDisabledAttackKinds } from '@/lib/utils/battle/attack/disabled-attacks';
import type { ActionFlow } from '@/lib/utils/battle/common/action-flow';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { attackReachError } from '@/lib/utils/battle/grid/attack-reach';
import { isHostile } from '@/lib/utils/battle/modes/engine';

export function legendaryAttack(
    input: LegendaryAttackInput
): LegendaryAttackResult {
    const {
        participants,
        actorId,
        targetId,
        map,
        rules,
        round,
        rng,
        battleId,
    } = input;

    const actor =
        findParticipant(participants, actorId) ??
        reject(API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

    const attack =
        actor.battleData.attacks[input.attackIndex] ??
        reject(actionReason('noSuchAttack'));

    if (
        attack.hand === 'off' ||
        getDisabledAttackKinds(actor)[attackKindOf(attack.type)]
    )
        return reject(actionReason('attackUnavailable'));

    const target = findParticipant(participants, targetId);

    if (
        !target ||
        !isHostile(map, actor, target) ||
        !isAttackable(target) ||
        target.battleData.reserved
    )
        return reject(actionReason('enemyRequired'));

    assertAttackAllowed(actor, attack, [target]);

    const reach = attackReachError(
        map,
        participants,
        actor,
        attack,
        [target],
        rules
    );

    if (reach) return reject(reach);

    const flow: ActionFlow = {
        ps: participants,
        messages: [],
        summons: [],
        ctx: { round, rng, map, rules },
        sceneState: input.sceneState,
    };

    const { battleAction } = input.strike({
        flow,
        attackerId: actorId,
        targetId,
        attack,
        currentRound: round,
        battleId,
        rng,
        label: 'legendary',
    });

    return {
        participants: flow.ps,
        action: battleAction,
        attackName: attack.name,
        sceneState: flow.sceneState,
    };
}
