import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

/** Схема для згрупованої структури (всі поля опціональні для оновлення) */
export const updateSkillSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      icon: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url().nullable().optional(),
      ),
    })
    .optional(),
  spellData: z
    .object({
      spellId: z.string().nullable().optional(),
      spellGroupId: z.string().nullable().optional(),
      grantedSpellId: z.string().nullable().optional(),
    })
    .optional(),
  abilities: AbilitiesSchema.optional(),
  mainSkillData: z
    .object({
      mainSkillId: z.string().nullable().optional(),
    })
    .optional(),
  image: z.string().nullable().optional(),
  appearanceDescription: z.string().nullable().optional(),
});
