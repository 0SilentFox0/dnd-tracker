import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { DND_SKILLS } from "@/lib/constants/skills";
import { MAX_EXHAUSTION } from "@/lib/utils/battle/conditions/query";

const characterIds = z.array(z.string().min(1).max(100)).min(1).max(50);

const useInspiration = z.boolean().optional();

export const restSchema = z.object({ kind: z.enum(["short", "long", "close"]), characterIds });

export type RestInput = z.infer<typeof restSchema>;

export const hitDieSchema = z.object({ classId: z.string().min(1).max(100) });

export const arcaneRecoverySchema = z.object({ picks: z.record(z.string().regex(/^\d$/), z.number().int().min(1).max(9)) });

export type ArcaneRecoveryInput = z.infer<typeof arcaneRecoverySchema>;

export type HitDieInput = z.infer<typeof hitDieSchema>;

export const sheetRollSchema = z.union([
  z.object({ kind: z.literal("check"), skill: z.enum(DND_SKILLS), useInspiration }),
  z.object({ kind: z.literal("check"), ability: z.enum(ABILITY_KEYS), useInspiration }),
  z.object({ kind: z.literal("save"), ability: z.enum(ABILITY_KEYS), useInspiration }),
]);

export type SheetRollInput = z.infer<typeof sheetRollSchema>;

export const experienceSchema = z.object({
  characterIds,
  amount: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "rest.validation.xpZero"),
  split: z.boolean().default(false),
  note: z.string().trim().max(200).optional(),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const inspirationSchema = z.object({ value: z.boolean() });

export const resourcesEditSchema = z
  .object({
    hp: z.number().int().min(0).max(9999).optional(),
    tempHp: z.number().int().min(0).max(999).optional(),
    exhaustion: z.number().int().min(0).max(MAX_EXHAUSTION).optional(),
    dead: z.boolean().optional(),
    reset: z.literal(true).optional(),
    charges: z.record(z.string().min(1).max(300), z.number().int().min(0).max(999)).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "rest.validation.emptyPatch");

export type ResourcesEditInput = z.infer<typeof resourcesEditSchema>;
