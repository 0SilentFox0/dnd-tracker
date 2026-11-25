import type { Ruleset } from '@/lib/utils/rules/schema';
import { composition, moduleMetaOf } from '@/lib/utils/rules/systems/catalog';

const FEET_PER_YARD = 3;

export function distanceOf(rules: Pick<Ruleset, 'system'>): {
    unit: 'ft' | 'yd';
    perCell: number;
} {
    const distance = moduleMetaOf(composition(rules.system).base)?.distance;

    if (!distance)
        throw new Error(`No cell scale for rule system: ${rules.system.key}`);

    return distance;
}

export function cellFeetOf(rules: Pick<Ruleset, 'system'>): number {
    const { unit, perCell } = distanceOf(rules);

    return unit === 'yd' ? perCell * FEET_PER_YARD : perCell;
}

const METRES_PER_FOOT = 0.3048;

const roundHalf = (n: number) => Math.round(n * 2) / 2;

export function costToDistance(
    cost: number,
    rules: Pick<Ruleset, 'system'>
): { feet: number; metres: number } {
    const feet = Math.round(cost * cellFeetOf(rules));

    return { feet, metres: roundHalf(feet * METRES_PER_FOOT) };
}
