import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES, ArtifactSlot } from "@/lib/constants/artifacts";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { ArmorStatsSchema } from "@/lib/utils/artifacts/armor-stats";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";

const armorSlotOnly = { message: API_ERRORS.ARMOR_SLOT_ONLY, path: ["armor"] };

export const createArtifactSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES),
    abilities: AbilitiesSchema.describe("Здібності артефакту").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.nullable().describe("Броня 5e (лише слот armor); null прибирає модель").optional(),
    setId: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor == null || d.slot === ArtifactSlot.ARMOR, armorSlotOnly);

export const patchArtifactSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).nullable().optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES).optional(),
    abilities: AbilitiesSchema.describe("Здібності артефакту").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.nullable().describe("Броня 5e (лише слот armor); null прибирає модель").optional(),
    setId: z.string().nullable().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor == null || d.slot === undefined || d.slot === ArtifactSlot.ARMOR, armorSlotOnly);
