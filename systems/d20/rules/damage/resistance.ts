import type { Ruleset } from '@/lib/utils/rules/schema';

export function d20CombineResistance(
    percents: readonly number[],
    rules: Ruleset
): number {
    const sum = percents.reduce((a, b) => a + b, 0);

    if (!rules.criticals.doubleDice) return sum;

    const resist = Math.max(0, ...percents);

    const vulnerable = Math.min(0, ...percents);

    return resist > 0 && vulnerable < 0 ? 0 : resist + vulnerable;
}
