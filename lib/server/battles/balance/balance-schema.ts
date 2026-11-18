import { z } from 'zod';

import { MAX_BALANCE_ALLIES } from '@/lib/constants/battle-balance';
import { XP_DIFFICULTIES } from '@/lib/utils/battle/balance/xp-budget';

export const balanceSchema = z.object({
    allyParticipants: z
        .object({
            characterIds: z
                .array(z.string())
                .max(MAX_BALANCE_ALLIES)
                .default([]),
            units: z
                .array(
                    z.object({
                        id: z.string(),
                        quantity: z.number().min(1).max(20),
                    })
                )
                .max(MAX_BALANCE_ALLIES)
                .default([]),
        })
        .default({ characterIds: [], units: [] }),
    suggest: z.boolean().optional(),
    raceId: z.string().optional(),
    xpDifficulty: z
        .enum([...XP_DIFFICULTIES['2014'], ...XP_DIFFICULTIES['2024']])
        .optional(),
});
