import { z } from "zod";

export const createBattleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  participants: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["character", "unit"]),
      side: z.enum(["ally", "enemy"]),
      quantity: z.number().min(1).optional(),
    }),
  ),
});

export type CreateBattleInput = z.infer<typeof createBattleSchema>;

export const moraleCheckSchema = z.object({
  participantId: z.string(),
  d10Roll: z.number().min(1).max(10),
});

export type MoraleCheckInput = z.infer<typeof moraleCheckSchema>;
