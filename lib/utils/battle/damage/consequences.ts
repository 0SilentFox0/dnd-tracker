import { textRef } from '@/lib/i18n/text-ref';
import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { revertOnZero } from '@/lib/utils/battle/transform/revert';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface DamageConsequencesInput {
    before: BattleParticipant;
    after: BattleParticipant;
    /** шкода після опорів, до обрізання на 0 */
    amount: number;
    crit?: boolean;
    rules: Ruleset;
    rng: () => number;
    participants: BattleParticipant[];
    location?: string;
    round?: number;
}

export interface DamageConsequencesResult {
    participant: BattleParticipant;
    participants: BattleParticipant[];
    messages: LogLine[];
}

export function applyDamageConsequences(
    input: DamageConsequencesInput
): DamageConsequencesResult {
    const reverted = revertOnZero(input.before, input.after, input.amount);

    if (reverted) {
        const note = textRef('battleLog.transform.formLost', {
            name: input.after.basicInfo.name,
            hasOverflow: String(reverted.overflow > 0),
            overflow: reverted.overflow,
        });

        const inner = applyDamageConsequences({
            ...input,
            before: reverted.before,
            after: reverted.after,
            amount: reverted.overflow,
            participants: replaceParticipant(
                input.participants,
                reverted.after
            ),
        });

        return { ...inner, messages: [note, ...inner.messages] };
    }

    const { combat } = ruleSystemOf(input.rules);

    return (combat.onDamaged ?? []).reduce(
        (result, hook) => hook(input, result),
        combat.onZeroHp(input)
    );
}

/** DM-зміна статусу (HP, воскресіння, вбивство): ті самі наслідки, що й від шкоди. `participants` уже містять `after`. */
export function settleStatusChange(
    before: BattleParticipant,
    after: BattleParticipant,
    participants: BattleParticipant[],
    rules: Ruleset
): DamageConsequencesResult {
    return ruleSystemOf(rules).combat.onZeroHp({
        before,
        after,
        amount: 0,
        rules,
        rng: () => 0,
        participants,
        manual: true,
    });
}
