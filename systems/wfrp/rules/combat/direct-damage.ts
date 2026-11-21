import {
    findParticipant,
    isActive,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { dropBreakOnDamage } from '@/lib/utils/abilities/engine/effects/hp';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { ApplyDamageConsequences } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

/** Wounds that bypass armour and Toughness (a tick, a Swarm): applies them and runs the damage consequences */
export function inflictWounds(
    participants: BattleParticipant[],
    id: string,
    amount: number,
    ctx: {
        round: number;
        rng: Rng;
        rules: Ruleset;
        applyDamage: ApplyDamageConsequences;
    }
): { participants: BattleParticipant[]; messages: LogLine[]; name?: string } {
    const before = findParticipant(participants, id);

    if (!before || !isActive(before) || amount <= 0)
        return { participants, messages: [] };

    const after = dropBreakOnDamage(
        {
            ...before,
            combatStats: {
                ...before.combatStats,
                currentHp: Math.max(0, before.combatStats.currentHp - amount),
            },
        },
        amount
    );

    const r = ctx.applyDamage({
        before,
        after,
        amount,
        rules: ctx.rules,
        rng: ctx.rng,
        participants: replaceParticipant(participants, after),
        round: ctx.round,
    });

    return {
        participants: r.participants,
        messages: r.messages,
        name: before.basicInfo.name,
    };
}
