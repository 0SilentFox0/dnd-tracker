import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isAirborne,
} from '@/lib/utils/abilities/engine/core/participants';
import type { StrikeRiderEffect } from '@/lib/utils/abilities/schema';
import { assertAttackAllowed } from '@/lib/utils/battle/attack/assert-allowed';
import { canAttackFromPool } from '@/lib/utils/battle/attack/attacks-left';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import {
    type ActorScope,
    requireActor,
} from '@/lib/utils/battle/common/control';
import { hasTrait } from '@/lib/utils/battle/common/weapon-trait';
import {
    BattleAccessError,
    BattleRuleError,
    ruleErrorOf,
} from '@/lib/utils/battle/store/errors';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export interface AttackRequest {
    attackerId: string;
    targetId?: string;
    targetIds?: string[];
    attackId?: string;
    d20Roll?: number;
    attackRoll?: number;
    attackRolls?: number[];
    serverRoll?: boolean;
    secondRolls?: (number | null)[];
    advantageRoll?: number;
    disadvantageRoll?: number;
    rollMode?: 'normal' | 'advantage' | 'disadvantage';
    damageRolls: number[];
    offHand?: boolean;
    useInspiration?: boolean;
    cunningStrike?: StrikeRiderEffect[];
    /** Already parsed by the system's `schemas.attackInput` */
    system?: SystemSlot;
}

export function requestedTargetIds(
    data: Pick<AttackRequest, 'targetId' | 'targetIds'>
): string[] {
    if (data.targetIds?.length) return data.targetIds;

    return data.targetId ? [data.targetId] : [];
}

export function findAttack(
    attacker: BattleParticipant,
    attackId: string | undefined,
    offHand?: boolean
): BattleAttack | undefined {
    const { attacks } = attacker.battleData;

    if (offHand) {
        const named = attackId
            ? attacks.find((a) => a.id === attackId || a.name === attackId)
            : undefined;

        return named?.hand === 'off'
            ? named
            : attacks.find((a) => a.hand === 'off');
    }

    return (
        (attackId
            ? attacks.find((a) => a.id === attackId || a.name === attackId)
            : undefined) ?? attacks.find((a) => a.hand !== 'off')
    );
}

export { assertAttackAllowed };

function assertOffHand(
    attacker: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset
): void {
    if (attacker.actionFlags.hasUsedBonusAction)
        throw new BattleRuleError('action_used', API_ERRORS.BONUS_ACTION_USED);

    if (!ruleSystemOf(rules).combat.secondaryAttack?.ready(attacker))
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NEEDS_ATTACK
        );

    if (hasTrait(attack, 'twoHanded'))
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_TWO_HANDED
        );

    if (attackKindOf(attack.type) !== AttackType.MELEE)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NOT_MELEE
        );

    if (!hasTrait(attack, 'light'))
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NOT_LIGHT
        );
}

export interface ValidatedAttackRequest {
    attacker: BattleParticipant;
    attack: BattleAttack;
    targetIds: string[];
    chosenTargets: BattleParticipant[];
    singleRoll: number | undefined;
    usePerTargetRolls: boolean;
}

export function validateAttackRequest(
    scope: ActorScope,
    data: AttackRequest,
    rules: Ruleset
): ValidatedAttackRequest {
    const order = scope.participants;

    const maxRoll = ruleSystemOf(rules).combat.dice;

    if (
        [data.d20Roll, data.attackRoll, ...(data.attackRolls ?? [])].some(
            (roll) => roll != null && roll > maxRoll
        )
    ) {
        throw new BattleRuleError('invalid_dice', API_ERRORS.ROLL_OUT_OF_RANGE);
    }

    const singleRoll = data.d20Roll ?? data.attackRoll;

    const targetIds = requestedTargetIds(data);

    const chosenTargets = [...new Set(targetIds)].flatMap(
        (id) => findParticipant(order, id) ?? []
    );

    const usePerTargetRolls =
        Array.isArray(data.attackRolls) &&
        data.attackRolls.length === chosenTargets.length;

    if (!singleRoll && !usePerTargetRolls && !data.serverRoll) {
        throw new BattleRuleError('action_rejected', REJECT.rollRequired);
    }

    const attacker = requireActor(scope, data.attackerId, {
        missing: REJECT.attackerMissing,
        forbidden: REJECT.attackForbidden,
        inactive: { code: 'action_rejected', message: REJECT.attackerInactive },
    });

    if (chosenTargets.length === 0)
        throw new BattleAccessError(404, REJECT.noTargetsInBattle);

    if (chosenTargets.some(isAirborne))
        throw new BattleRuleError('invalid_target', API_ERRORS.TARGET_AIRBORNE);

    if (order[scope.scene.turnIndex]?.basicInfo.id !== attacker.basicInfo.id) {
        throw new BattleRuleError('action_rejected', REJECT.notAttackerTurn);
    }

    if (data.system)
        ruleSystemOf(rules).combat.input?.assert(data.system, {
            kind: 'attack',
            actor: attacker,
            targetCount: chosenTargets.length,
        });

    if (
        data.offHand &&
        !ruleSystemOf(rules).combat.secondaryAttack?.allowed(attacker)
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NOT_ALLOWED
        );

    if (
        !data.offHand &&
        attacker.actionFlags.hasUsedAction &&
        !canAttackFromPool(attacker)
    )
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    const attack = findAttack(attacker, data.attackId, data.offHand);

    if (!attack)
        throw new BattleRuleError(
            'action_rejected',
            data.offHand
                ? API_ERRORS.NO_OFF_HAND_WEAPON
                : REJECT.noAttackAvailable
        );

    if (data.offHand) assertOffHand(attacker, attack, rules);
    else if (attack.hand === 'off')
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NEEDS_ATTACK
        );

    assertAttackAllowed(attacker, attack, chosenTargets);

    if (data.cunningStrike?.length) {
        const { rejected } = ruleSystemOf(rules).combat.attack?.hitRiders?.({
            attacker,
            round: 0,
            effects: data.cunningStrike,
        }) ?? { rejected: textRef(REJECT.cunningUnavailable) };

        if (rejected) throw ruleErrorOf('action_rejected', rejected);
    }

    return {
        attacker,
        attack,
        targetIds,
        chosenTargets,
        singleRoll,
        usePerTargetRolls,
    };
}
