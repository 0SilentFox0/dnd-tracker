import type { StaticEffect } from '@/lib/utils/abilities/schema';

export function strengthOf(
    effect: StaticEffect,
    num: (v: unknown) => number
): number {
    if (effect.kind === 'flag')
        return Math.abs(
            'percent' in effect
                ? effect.percent
                : 'value' in effect
                  ? effect.value
                  : 1
        );

    return (
        Math.abs(num('flat' in effect ? effect.flat : undefined)) +
        Math.abs(num('percent' in effect ? effect.percent : undefined))
    );
}

export const numericStrength = (effect: StaticEffect): number =>
    strengthOf(effect, (v) => (typeof v === 'number' ? v : 0));
