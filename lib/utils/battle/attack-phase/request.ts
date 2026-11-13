import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import {
    findParticipant,
    isAirborne,
} from '@/lib/utils/abilities/engine/core/participants';
import type { CunningStrikeEffect } from '@/lib/utils/abilities/schema';
import { hasTrait } from '@/lib/utils/battle/attack/ability';
import { assertAttackAllowed } from '@/lib/utils/battle/attack/assert-allowed';
import { canAttackFromPool } from '@/lib/utils/battle/attack/attacks-left';
import {
    cunningStrikeCost,
    cunningStrikeOffer,
} from '@/lib/utils/battle/attack/cunning-strike';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import {
    type ActorScope,
    requireActor,
} from '@/lib/utils/battle/common/control';
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
    /** Один кидок на ціль (для multi-target); якщо length === targets.length, використовується для кожної цілі */
    attackRolls?: number[];
    serverRoll?: boolean;
    /** Сирі другі d20 на ціль (null — без другого); сервер вирішує перевагу/недолік сам */
    secondRolls?: (number | null)[];
    advantageRoll?: number;
    disadvantageRoll?: number;
    rollMode?: 'normal' | 'advantage' | 'disadvantage';
    damageRolls: number[];
    offHand?: boolean;
    useInspiration?: boolean;
    cunningStrike?: CunningStrikeEffect[];
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
    attack: BattleAttack
): void {
    if (attacker.actionFlags.hasUsedBonusAction)
        throw new BattleRuleError('action_used', API_ERRORS.BONUS_ACTION_USED);

    if (!attacker.battleData.attackedWithLight)
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

    if (data.offHand && !ruleSystemOf(rules).combat.offHand?.(attacker))
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

    if (data.offHand) assertOffHand(attacker, attack);
    else if (attack.hand === 'off')
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.OFF_HAND_NEEDS_ATTACK
        );

    assertAttackAllowed(attacker, attack, chosenTargets);

    if (data.cunningStrike?.length) {
        const cost = cunningStrikeCost(
            cunningStrikeOffer(attacker, 0),
            data.cunningStrike
        );

        if (typeof cost !== 'number')
            throw ruleErrorOf('action_rejected', cost);
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
