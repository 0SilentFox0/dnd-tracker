import type { Ruleset } from '@/lib/utils/rules';
import type { ParticipantPart } from '@/lib/utils/rules/systems/types';

export function heroDiceTable(
    rules: Ruleset,
    kind: 'melee' | 'ranged'
): Record<number, string> | undefined {
    const t =
        kind === 'melee'
            ? rules.heroScaling.meleeDiceByLevel
            : rules.heroScaling.rangedDiceByLevel;

    return t
        ? Object.fromEntries(Object.entries(t).map(([k, v]) => [Number(k), v]))
        : undefined;
}

export const heroDicePart: ParticipantPart<object> = (p, { rules }) => {
    const melee = heroDiceTable(rules, 'melee');

    const ranged = heroDiceTable(rules, 'ranged');

    return melee || ranged
        ? { ...p, abilities: { ...p.abilities, heroDice: { melee, ranged } } }
        : p;
};
