import { z } from "zod";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { hasPlayableArea } from "@/lib/utils/battle/grid/map-editor";

const MAP_BACKGROUND_PATTERN = /^(https:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

export const battleMapSchema = z.object({
  cols: z.number().int().min(4).max(60),
  rows: z.number().int().min(4).max(60),
  background: z
    .string()
    .max(7_000_000)
    .refine((v) => MAP_BACKGROUND_PATTERN.test(v), "Фон: потрібне посилання https, файл або вбудований фон")
    .nullable(),
  opacity: z.number().min(0).max(1),
  blocked: z.array(z.string().regex(/^\d+:\d+$/)).max(3600).optional(),
}).refine((m) => hasPlayableArea(m), { message: "Ігрова зона карти замала: потрібно щонайменше 2×2 вільні клітинки", path: ["blocked"] });

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
