import { z } from "zod";

import { GridShape, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

export const battleMapSchema = z.object({
  grid: z.enum([GridShape.SQUARE, GridShape.HEX]),
  cols: z.number().int().min(4).max(60),
  rows: z.number().int().min(4).max(60),
  background: z.string().url().nullable(),
  opacity: z.number().min(0).max(1),
});

export const createBattleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  participants: z.array(
    z.object({
      id: z.string(),
      type: z.enum([ParticipantSourceType.CHARACTER, ParticipantSourceType.UNIT]),
      side: z.enum([ParticipantSide.ALLY, ParticipantSide.ENEMY]),
      quantity: z.number().min(1).optional(),
      reserved: z.number().int().min(0).optional(),
    }),
  ),
  map: battleMapSchema.nullable().optional(),
});

export const moraleCheckSchema = z.object({
  participantId: z.string(),
  d10Roll: z.number().min(1).max(10),
});

export type MoraleCheckInput = z.infer<typeof moraleCheckSchema>;
