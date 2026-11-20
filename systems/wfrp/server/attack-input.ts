import { z } from 'zod';

import { ACCEPTED_SPOTS } from '../rules/combat/constants';
import { FORTUNE_INPUT } from '../rules/percentile/fortune';

import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

const roll = z.number().int().min(1).max(100);

const Body = z.object({
    system: z
        .object({
            key: z.literal('wfrp'),
            data: z.object({
                kind: z.enum(['reroll', 'sl', 'notFail', 'none']),
                rerolls: z.number().int().min(1).max(9).optional(),
                critical: z.boolean().optional(),
                location: z.enum(ACCEPTED_SPOTS).optional(),
                critBonus: z
                    .enum(['criticalDamage', 'totalPower', 'unstoppableForce'])
                    .optional(),
                blessing: z
                    .enum(['rangeYards', 'targets', 'durationRounds'])
                    .optional(),
                calledShot: z.enum(ACCEPTED_SPOTS).optional(),
                situational: z
                    .object({
                        highGround: z.enum(['attacker', 'defender']).optional(),
                        enclosed: z.literal(true).optional(),
                        badFooting: z.literal(true).optional(),
                    })
                    .optional(),
            }),
        })
        .optional(),
    secondRoll: roll.optional(),
});

export const WfrpFortuneInputSchema = Body.transform(
    ({ system, secondRoll }): SystemSlot | undefined => {
        if (!system) return undefined;

        const {
            kind,
            rerolls,
            critical,
            location,
            critBonus,
            blessing,
            calledShot,
            situational,
        } = system.data;

        return FORTUNE_INPUT.write({
            kind,
            ...(critBonus && { critBonus }),
            ...(blessing && { blessing }),
            ...(calledShot && { calledShot }),
            ...(situational && { situational }),
            ...(kind === 'reroll' &&
                secondRoll !== undefined && { manualReroll: secondRoll }),
            ...(kind === 'reroll' && rerolls && { rerolls }),
            ...(kind === 'notFail' && {
                ...(critical && { critical }),
                ...(critical && location && { location }),
            }),
        });
    }
);
