import { BATTLE_CONSTANTS, CombatStatus } from '@/lib/constants/battle';
import { dropBreakOnDamage } from '@/lib/utils/abilities/engine/effects/hp';
import type { AttackKind } from '@/lib/utils/abilities/schema';
import { applyResistance } from '@/lib/utils/battle/resistance';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function applyDamageToTarget(
    target: BattleParticipant,
    totalFinalDamage: number
): BattleParticipant {
    const fromTemp = Math.min(
        target.combatStats.tempHp,
        Math.max(0, totalFinalDamage)
    );

    const currentHp = Math.max(
        BATTLE_CONSTANTS.MIN_DAMAGE,
        target.combatStats.currentHp - (totalFinalDamage - fromTemp)
    );

    return dropBreakOnDamage(
        {
            ...target,
            combatStats: {
                ...target.combatStats,
                tempHp: target.combatStats.tempHp - fromTemp,
                currentHp,
                status:
                    currentHp <= 0
                        ? CombatStatus.UNCONSCIOUS
                        : target.combatStats.status,
            },
        },
        totalFinalDamage
    );
}

export interface ApplyResistanceForAdditionalResult {
    totalAdditionalDamage: number;
    additionalDamageBreakdown: LogLine[];
}

export function applyResistanceForAdditional(
    target: BattleParticipant,
    additionalDamageList: Array<{ type: string; value: number }>,
    dmgMult: number,
    participants: BattleParticipant[] = [target],
    attackKind?: AttackKind,
    rules?: Ruleset
): ApplyResistanceForAdditionalResult {
    let totalAdditionalDamage = 0;

    const additionalDamageBreakdown: LogLine[] = [];

    for (const additionalDamage of additionalDamageList) {
        const additionalValue = Math.floor(additionalDamage.value * dmgMult);

        const additionalResistance = applyResistance(
            target,
            additionalValue,
            additionalDamage.type,
            { participants, attackKind, rules }
        );

        totalAdditionalDamage += additionalResistance.finalDamage;
        additionalDamageBreakdown.push(...additionalResistance.breakdown);
    }

    return { totalAdditionalDamage, additionalDamageBreakdown };
}
