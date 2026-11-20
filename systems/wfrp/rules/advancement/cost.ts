import { CANON_TALENT_COST } from './canon';
import type { AdvancementRules } from './rules';

/** Next points value: `step` 1 = +1; otherwise snapped to the next multiple of step; null = at limit */
export function advanceTarget(
    current: number,
    max: number,
    step = 1
): number | null {
    const to = step > 1 ? (Math.floor(current / step) + 1) * step : current + 1;

    return current >= max || to > max ? null : to;
}

export function advanceCost(
    kind: 'characteristic' | 'skill',
    currentAdvances: number,
    rules: AdvancementRules,
    step = 1
): number | null {
    const track = rules[kind];

    if (advanceTarget(currentAdvances, track.max, step) === null) return null;

    const index =
        step > 1 ? Math.floor(currentAdvances / step) + 1 : currentAdvances;

    const bracket =
        track.brackets.find((b) => index <= b.upTo) ??
        track.brackets[track.brackets.length - 1];

    return bracket.cost;
}

export const talentCost = (
    xpCost: number,
    currentRank: number,
    rules: AdvancementRules,
    flat = false
): number =>
    Math.round(
        (flat ? CANON_TALENT_COST : xpCost * (currentRank + 1)) *
            rules.talentCostMultiplier
    );
