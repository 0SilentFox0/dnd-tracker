import { z } from "zod";

import { ParticipantSide,ParticipantSourceType } from "@/lib/constants/battle";

export const createBattleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  participants: z.array(
    z.object({
      id: z.string(),
      type: z.enum([ParticipantSourceType.CHARACTER, ParticipantSourceType.UNIT]),
      side: z.enum([ParticipantSide.ALLY, ParticipantSide.ENEMY]),
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
