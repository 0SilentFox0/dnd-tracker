import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

/** Схема для згрупованої структури створення скіла */
export const createSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  }),
  spellData: z.object({
    spellId: z.string().nullable().optional(),
    spellGroupId: z.string().nullable().optional(),
    grantedSpellId: z.string().nullable().optional(),
  }),
  spellEnhancementData: z.object({
    spellEnhancementTypes: z
      .array(
        z.enum([
          "effect_increase",
          "target_change",
          "additional_modifier",
          "new_spell",
          "aoe_spell_unlock",
        ]),
      )
      .optional(),
    spellEffectIncrease: z.number().min(0).max(200).optional(),
    spellTargetChange: z
      .object({
        target: z.enum(["enemies", "allies", "all"]),
      })
      .optional(),
    spellAdditionalModifier: z
      .object({
        modifier: z.string().optional(),
        damageDice: z.string().optional(),
        duration: z.number().optional(),
      })
      .optional(),
    spellNewSpellId: z.string().optional(),
    spellAllowMultipleTargets: z.boolean().optional(),
    spellAoeSpellIds: z.array(z.string()).optional(),
  }),
  abilities: AbilitiesSchema.optional(),
  mainSkillData: z.object({
    mainSkillId: z.string().nullable().optional(),
  }),
  image: z.string().nullable().optional(),
});
