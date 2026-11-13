import { attackAbilityOf } from './ability';
import {
    attackBonusOf,
    type AttackMathSystem,
    forcedRollMode,
    type RollMode,
    type RollModeReasons,
    rollModeReasonsOf,
    type SourceOpts,
} from './bonus-math';

import { statWithModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    findParticipant,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { attackSourceOf } from '@/lib/utils/battle/attack/source';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';

export { forcedRollMode };

export type { RollMode, RollModeReasons };

const mathSystemOf = (rules: Pick<Ruleset, 'system'>): AttackMathSystem => {
    const { combat } = ruleSystemOf(rules);

    return {
        abilityOf: (p, attack, participants) =>
            attackAbilityOf(rules, p, attack, participants),
        proficiencyBonus: (p) => combat.proficiency.bonus(p),
        reach: combat.reach,
    };
};

export function calculateAttackBonus(
    attacker: BattleParticipant,
    attack: BattleAttack,
    rules: Pick<Ruleset, 'system'>,
    participants: BattleParticipant[] = [attacker],
    extra?: StaticEffect[]
): number {
    return attackBonusOf(
        mathSystemOf(rules),
        attacker,
        attack,
        participants,
        extra
    );
}

export function rollModeReasons(
    attacker: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[],
    opts: SourceOpts
): RollModeReasons {
    return rollModeReasonsOf(
        mathSystemOf(opts.rules),
        attacker,
        attack,
        participants,
        opts
    );
}

export function hasAdvantage(
    attacker: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[] = [attacker],
    extra: StaticEffect[] | undefined,
    opts: { targetId?: string; targetExtra?: StaticEffect[]; rules: Ruleset }
): boolean {
    return (
        rollModeReasons(attacker, attack, participants, { ...opts, extra })
            .advantage.length > 0
    );
}

export function hasDisadvantage(
    attacker: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[] = [attacker],
    opts: SourceOpts
): boolean {
    return (
        rollModeReasons(attacker, attack, participants, opts).disadvantage
            .length > 0
    );
}

// Тригери з шансом < 100 % не передбачаємо — їх кидає сервер.
const CERTAIN_ONLY = () => 0.9999;

function previewBefore(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[],
    round: number,
    rules: Ruleset
) {
    const ps = withSelf(withSelf(participants, target), attacker);

    const r = runAbilities(
        ps,
        {
            type: 'attack',
            phase: 'before',
            actorId: attacker.basicInfo.id,
            targetId: target.basicInfo.id,
            attackKind: attackKindOf(attack.type),
            ...attackSourceOf(attack),
        },
        { round, rng: CERTAIN_ONLY, rules }
    );

    const self =
        findParticipant(r.participants, attacker.basicInfo.id) ?? attacker;

    return {
        ps: r.participants,
        self,
        extra: r.actionModifiers[attacker.basicInfo.id],
        targetExtra: r.actionModifiers[target.basicInfo.id],
    };
}

export type PredictedAttack = {
    totalBonus: number;
    targetAC: number;
    mode: RollMode;
    forced: boolean;
    reasons: RollModeReasons;
};

/** Прогноз влучання на клієнті — ті самі числа, що рахує сервер, з одного перегляду фази before (тригери з шансом не враховуємо). */
export function predictAttack(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[],
    {
        round = 1,
        map,
        ...opts
    }: {
        rules: Ruleset;
        round?: number;
        map?: BattleMapConfig | null;
        inspiration?: boolean;
    }
): PredictedAttack {
    const { ps, self, extra, targetExtra } = previewBefore(
        attacker,
        target,
        attack,
        participants,
        round,
        opts.rules
    );

    const reasons = rollModeReasons(self, attack, ps, {
        extra,
        targetId: target.basicInfo.id,
        targetExtra,
        map,
        inspiration: opts.inspiration,
        rules: opts.rules,
    });

    return {
        totalBonus: calculateAttackBonus(self, attack, opts.rules, ps, extra),
        targetAC: statWithModifiers(
            ps,
            target.basicInfo.id,
            'armor',
            target.combatStats.armorClass,
            { extra: targetExtra }
        ),
        ...forcedRollMode(reasons),
        reasons,
    };
}
