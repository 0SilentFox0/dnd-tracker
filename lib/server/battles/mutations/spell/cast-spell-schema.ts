import { z } from "zod";

import { mapCellSchema } from "@/lib/schemas/battles";

export const spellSchema = z.object({
  casterId: z.string(),
  legendaryKey: z.string().min(1).optional(),
  spellId: z.string(),
  grantKey: z.string().min(1).max(300).optional(),
  castLevel: z.number().int().min(0).max(9).optional(),
  targetIds: z.array(z.string()).default([]),
  targetCell: mapCellSchema.optional(),
  diceRolls: z.array(z.number()).default([]),
  saveRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional(),
  attackRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional(),
  preview: z.boolean().optional(),
  castingRounds: z.number().int().min(1).max(144000).optional(),
  cancelCasting: z.boolean().optional(),
  free: z.boolean().optional(),
  optionIndex: z.number().int().min(0).max(6).optional(),
  inputCount: z.number().int().min(0).max(40).optional(),
  slotKey: z.string().regex(/^([1-9]|pact)$/).optional(),
});

export type SpellRequestData = z.infer<typeof spellSchema>;
