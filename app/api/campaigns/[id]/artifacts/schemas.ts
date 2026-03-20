import { z } from "zod";

import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";

export const artifactSkillEffectSchema = z.object({
  stat: z.string(),
  type: z.string(),
  value: z.union([z.number(), z.string(), z.boolean()]),
  isPercentage: z.boolean().optional(),
  duration: z.number().optional(),
  target: z.string().optional(),
  maxTriggers: z.number().nullable().optional(),
});

export const artifactModifierSchema = z.object({
  type: z.string(),
  value: z.union([z.number(), z.string()]),
  isPercentage: z.boolean().optional().default(false),
  element: z.string().optional(),
});

const artifactEffectScopeSchema = z
  .object({
    audience: z.enum(["self", "all_allies", "all_enemies"]).optional(),
    immuneSpellIds: z.array(z.string()).optional(),
  })
  .strict();

export const artifactPassiveAbilitySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  effect: z.record(z.string(), z.unknown()).optional(),
  trigger: z.record(z.string(), z.unknown()).optional(),
  effects: z.array(artifactSkillEffectSchema).optional(),
  effectScope: artifactEffectScopeSchema.optional(),
});

export const createArtifactSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rarity: z.enum(ARTIFACT_RARITY_VALUES).optional(),
  slot: z.enum(ARTIFACT_SLOT_VALUES),
  bonuses: z.record(z.string(), z.number()).default({}),
  modifiers: z.array(artifactModifierSchema).default([]),
  passiveAbility: artifactPassiveAbilitySchema.optional(),
  setId: z.string().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional(),
  ),
});

export const patchArtifactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  rarity: z.enum(ARTIFACT_RARITY_VALUES).nullable().optional(),
  slot: z.enum(ARTIFACT_SLOT_VALUES).optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  modifiers: z.array(artifactModifierSchema).optional(),
  passiveAbility: artifactPassiveAbilitySchema.nullable().optional(),
  setId: z.string().nullable().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional(),
  ),
});
