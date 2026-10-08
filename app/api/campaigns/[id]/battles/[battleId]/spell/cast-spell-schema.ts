import { z } from "zod";

export const spellSchema = z.object({
  casterId: z.string(),
  spellId: z.string(),
  targetIds: z.array(z.string()).default([]),
  diceRolls: z.array(z.number()).default([]),
  saveRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional(),
  preview: z.boolean().optional(),
});

export type SpellRequestData = z.infer<typeof spellSchema>;
