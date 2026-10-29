import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES, ArtifactSlot, PROPERTY_SLOTS } from "@/lib/constants/artifacts";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { ArmorStatsSchema } from "@/lib/utils/artifacts/armor-stats";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";
import { ItemStatsSchema } from "@/lib/utils/items/item-stats";

const armorSlotOnly = { message: API_ERRORS.ARMOR_SLOT_ONLY, path: ["armor"] };

const BONUS_ONLY = new Set(["attackBonus", "damageBonus"]);

const propertyStatsOk = (d: { item?: { property?: unknown } | null; weapon?: object; armor?: unknown }) =>
  !d.item?.property || (d.armor == null && Object.keys(d.weapon ?? {}).every((k) => BONUS_ONLY.has(k)));

const propertySlot = { message: API_ERRORS.ITEM_PROPERTY_SLOT, path: ["item"] };

const propertyStats = { message: API_ERRORS.ITEM_PROPERTY_STATS, path: ["item"] };

export const createArtifactSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES),
    abilities: AbilitiesSchema.describe("Artifact abilities").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.nullable().describe("5e armor (armor slot only); null removes the model").optional(),
    item: ItemStatsSchema.nullable().describe("5e item; null removes the model").optional(),
    setId: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor == null || d.slot === ArtifactSlot.ARMOR, armorSlotOnly)
  .refine((d) => !d.item?.property || PROPERTY_SLOTS.has(d.slot), propertySlot)
  .refine(propertyStatsOk, propertyStats);

export const patchArtifactSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).nullable().optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES).optional(),
    abilities: AbilitiesSchema.describe("Artifact abilities").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.nullable().describe("5e armor (armor slot only); null removes the model").optional(),
    item: ItemStatsSchema.nullable().describe("5e item; null removes the model").optional(),
    setId: z.string().nullable().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor == null || d.slot === undefined || d.slot === ArtifactSlot.ARMOR, armorSlotOnly)
  .refine((d) => !d.item?.property || d.slot === undefined || PROPERTY_SLOTS.has(d.slot), propertySlot)
  .refine(propertyStatsOk, propertyStats);
