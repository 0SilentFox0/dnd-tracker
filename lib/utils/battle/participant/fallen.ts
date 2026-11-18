import { CombatStatus } from '@/lib/constants/battle';
import { restoreCharm } from '@/lib/utils/abilities/engine/effects/charm';
import { isFallen } from '@/lib/utils/battle/grid/occupancy';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

type Keeps = (effect: ActiveEffect) => boolean;

const keptEffects = (p: BattleParticipant, keeps?: Keeps): ActiveEffect[] =>
    keeps && p.combatStats.status === CombatStatus.UNCONSCIOUS
        ? p.battleData.activeEffects.filter(keeps)
        : [];

const clears = (p: BattleParticipant, keeps?: Keeps) =>
    isFallen(p) &&
    p.battleData.activeEffects.length > keptEffects(p, keeps).length;

export function clearFallenEffects(
    participants: BattleParticipant[],
    rules?: Ruleset
): BattleParticipant[] {
    const keeps = rules
        ? ruleSystemOf(rules).conditions?.keepsWhenDown
        : undefined;

    if (!participants.some((p) => clears(p, keeps))) return participants;

    return participants.map((p) => {
        if (!clears(p, keeps)) return p;

        const freed = restoreCharm(p);

        return {
            ...freed,
            battleData: {
                ...freed.battleData,
                activeEffects: keptEffects(freed, keeps),
            },
        };
    });
}
