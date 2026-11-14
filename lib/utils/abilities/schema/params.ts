import { z } from 'zod';

export const STRIKE_RIDER_EFFECTS = ['poison', 'trip', 'withdraw'] as const;

export type StrikeRiderEffect = (typeof STRIKE_RIDER_EFFECTS)[number];

export const CunningStrikeParamsSchema = z
    .object({
        options: z
            .array(
                z
                    .object({
                        effect: z.enum(STRIKE_RIDER_EFFECTS),
                        dice: z.number().int().min(1).max(5),
                    })
                    .strict()
            )
            .min(1)
            .optional(),
        maxEffects: z.number().int().min(1).max(3).optional(),
    })
    .strict();

export const AbilityParamsSchema = z
    .object({
        cunningStrike: CunningStrikeParamsSchema.optional(),
        sneakAttack: z.literal(true).optional(),
    })
    .strict();

export type AbilityParams = z.infer<typeof AbilityParamsSchema>;
