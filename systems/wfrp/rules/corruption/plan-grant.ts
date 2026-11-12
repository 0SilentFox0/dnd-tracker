import { skillTarget, value } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import { DIFFICULTY_SL, resolvePercentileTest } from '../percentile';
import { rollSlot, rowText } from '../tables/resolve';
import {
    CORRUPTION_TEST_DIFFICULTY,
    CORRUPTION_TEST_SKILL,
    MUTATIONS_MAX,
    PHYSICAL_MAX_ROLL,
    POINTS_MAX,
} from './constants';
import { isMutationEffect } from './modifiers';
import { corruptionThreshold } from './threshold';
import {
    type CorruptionState,
    EMPTY_CORRUPTION,
    type GrantSummary,
    type Mutation,
    type MutationKind,
} from './types';

import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';

export type GrantPresets = { test?: number; type?: number; row?: number };

export type GrantInput = {
    characteristics: Characteristics;
    rules: Pick<Ruleset, 'tables'>;
    points: number;
    reason: string;
    rng: Rng;
    id: string;
    at: string;
    presets?: GrantPresets;
};

export function planGrant({
    characteristics: c,
    rules,
    points,
    reason,
    rng,
    id,
    at,
    presets = {},
}: GrantInput): { state: CorruptionState; summary: GrantSummary } {
    const prev = c.corruption ?? EMPTY_CORRUPTION;

    const raw = prev.points + points;

    const total = Math.min(POINTS_MAX, raw);

    const threshold = corruptionThreshold(c);

    const summary: GrantSummary = {
        points,
        total,
        threshold,
        ...(raw > POINTS_MAX && { pointsCapped: true as const }),
    };

    let mutation: Mutation | undefined;

    if (total > threshold) {
        const target =
            skillTarget(c, CORRUPTION_TEST_SKILL)?.target ?? value(c, 't');

        const r = resolvePercentileTest({
            target,
            slModifier: DIFFICULTY_SL[CORRUPTION_TEST_DIFFICULTY],
            doubles: false,
            mode: 'normal',
            rng,
            presetRoll: presets.test,
        });

        summary.test = {
            roll: r.roll,
            target: r.target,
            sl: r.sl,
            outcome: r.outcome,
        };

        const passed = r.outcome === 'success' || r.outcome === 'critical';

        if (!passed && prev.mutations.length >= MUTATIONS_MAX)
            summary.capped = true;
        else if (!passed) {
            const typeRoll = presets.type ?? rollDie(100, rng);

            const kind: MutationKind =
                typeRoll <= PHYSICAL_MAX_ROLL ? 'physical' : 'mental';

            const { row, roll } = rollSlot(
                rules,
                kind === 'physical' ? 'mutationPhysical' : 'mutationMental',
                rng,
                presets.row
            );

            const effects = row.effects
                .filter(isMutationEffect)
                .map((e) => ({ ...e }));

            mutation = { id, at, kind, roll, text: rowText(row), effects };

            summary.mutation = {
                kind,
                typeRoll,
                roll,
                text: mutation.text,
                effects,
            };
        }
    }

    const state: CorruptionState = {
        points: total,
        mutations: mutation ? [...prev.mutations, mutation] : prev.mutations,
        last: {
            id,
            at,
            reason,
            before: { points: prev.points },
            after: { points: total, ...(mutation && { mutationId: id }) },
            summary,
        },
    };

    return { state, summary };
}
