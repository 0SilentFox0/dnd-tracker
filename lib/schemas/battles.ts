import { z } from "zod";

import { HAZARD_DICE_PATTERN, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { hasPlayableArea } from "@/lib/utils/battle/grid/map-editor";

const MAP_BACKGROUND_PATTERN = /^(https:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

export const mapCellSchema = z.object({ x: z.number().int().min(0).max(59), y: z.number().int().min(0).max(59) });

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
  terrain: z
    .record(
      z.string().regex(/^\d+:\d+$/),
      z.object({
        kind: z.enum(["wall", "barrier", "hazard"]),
        label: z.string().max(60).optional(),
        untilRound: z.number().int().min(1).optional(),
        damage: z
          .object({ dice: z.string().regex(HAZARD_DICE_PATTERN).optional(), amount: z.number().int().min(0).max(1000).optional(), type: z.string().min(1).max(30), spellId: z.string().max(64).optional() })
          .optional(),
      }).refine((c) => c.kind !== "barrier" || c.untilRound !== undefined, "Барʼєру потрібен строк"),
    )
    .refine((t) => Object.keys(t).length <= 3600, "Забагато клітинок місцевості")
    .optional(),
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
