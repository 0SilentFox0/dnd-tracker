import { z } from "zod";

/**
 * PATCH участника: зміна HP, вбивство, повернення до життя з 1 HP або видалення з бою (DM).
 * .refine забороняє пустий PATCH.
 */
export const patchParticipantSchema = z
  .object({
    lairActive: z.boolean().optional(),
    currentHp: z.number().int().min(0).optional(),
    removeFromBattle: z.boolean().optional(),
    kill: z.boolean().optional(),
    revive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });

export type PatchParticipantData = z.infer<typeof patchParticipantSchema>;
