import { bonus, skillTarget, value } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import { editionOf } from '../edition';
import { DIFFICULTY_SL, resolvePercentileTest } from '../percentile';
import { rollSlot, rowText } from '../tables/resolve';
import {
    CANON_BODY_MAX_ROLL,
    CORRUPTION_TEST_DIFFICULTY,
    CORRUPTION_TEST_SKILL,
    type CorruptionSpecies,
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
    rules: Pick<Ruleset, 'tables'> & { edition?: unknown };
    points: number;
    reason: string;
    rng: Rng;
    id: string;
    at: string;
    presets?: GrantPresets;
    species?: CorruptionSpecies;
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
    species = 'human',
}: GrantInput): { state: CorruptionState; summary: GrantSummary } {
    const prev = c.corruption ?? EMPTY_CORRUPTION;

    const raw = prev.points + points;

    const total = Math.min(POINTS_MAX, raw);

    const canon = editionOf(rules).magicModel === 'canon5e';

    let finalPoints = total;

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

            const bodyMax = canon
                ? CANON_BODY_MAX_ROLL[species]
                : PHYSICAL_MAX_ROLL;

            const kind: MutationKind =
                typeRoll <= bodyMax ? 'physical' : 'mental';

            const { row, roll } = rollSlot(
                rules,
                kind === 'physical' ? 'mutationPhysical' : 'mutationMental',
                rng,
                presets.row
            );

            const effects = row.effects
                .filter(isMutationEffect)
                .map((e) => ({ ...e }));

            const created: Mutation = {
                id,
                at,
                kind,
                roll,
                text: rowText(row),
                effects,
            };

            mutation = created;

            summary.mutation = {
                kind,
                typeRoll,
                roll,
                text: created.text,
                effects,
            };

            if (canon) {
                const lost = Math.min(total, bonus(c, 'wp'));

                finalPoints = total - lost;

                summary.pointsLost = lost;

                const count = (k: MutationKind) =>
                    [...prev.mutations, created].filter((m) => m.kind === k)
                        .length;

                if (count('physical') > bonus(c, 't'))
                    summary.soulLost = 'physical';
                else if (count('mental') > bonus(c, 'wp'))
                    summary.soulLost = 'mental';
            }
        }
    }

    const state: CorruptionState = {
        points: finalPoints,
        mutations: mutation ? [...prev.mutations, mutation] : prev.mutations,
        ...((summary.soulLost ?? prev.soulLost) && {
            soulLost: summary.soulLost ?? prev.soulLost,
        }),
        last: {
            id,
            at,
            reason,
            before: { points: prev.points },
            after: { points: finalPoints, ...(mutation && { mutationId: id }) },
            summary,
        },
    };

    return { state, summary };
}
