import { z } from "zod";

import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";

export const createArtifactSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rarity: z.enum(ARTIFACT_RARITY_VALUES).optional(),
  slot: z.enum(ARTIFACT_SLOT_VALUES),
  abilities: AbilitiesSchema.optional(),
  weapon: WeaponStatsSchema.optional(),
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
  abilities: AbilitiesSchema.optional(),
  weapon: WeaponStatsSchema.optional(),
  setId: z.string().nullable().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional(),
  ),
});
