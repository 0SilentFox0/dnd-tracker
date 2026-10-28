import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { ARMOR_CATEGORIES } from "@/lib/utils/artifacts/armor-stats";
import { itemStatsRecords } from "@/lib/utils/items/item-row";

const ITEM_KINDS = ["weapon", "armor", "shield"] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

const PropertySchema = z.object({
  appliesTo: z.object({
    kinds: z.array(z.enum(ITEM_KINDS)).min(1),
    attackType: z.enum(["melee", "ranged"]).optional(),
    armorCategories: z.array(z.enum(ARMOR_CATEGORIES)).min(1).optional(),
    bases: z.array(z.string().trim().min(1).max(100)).min(1).max(ITEM_LIMITS.bases).optional(),
  }),
  nameTemplate: z.string().trim().max(100).refine((t) => t.includes("{base}"), "Шаблон має містити {base}").optional(),
  overrides: z
    .object({
      stealthDisadvantage: z.literal(false).optional(),
      strength: z.null().optional(),
      damageType: z.string().trim().min(1).max(30).optional(),
      addTraits: z.array(z.enum(WEAPON_TRAITS)).min(1).optional(),
    })
    .optional(),
});

export const ItemStatsSchema = z
  .object({
    unique: z.boolean().optional(),
    property: PropertySchema.optional(),
    attunement: z.boolean().optional(),
    charges: z.object({ max: z.number().int().min(ITEM_LIMITS.charges[0]).max(ITEM_LIMITS.charges[1]), rest: z.enum(["short", "long"]).nullable() }).optional(),
    consumable: z.boolean().optional(),
  })
  .refine((s) => !s.consumable || (!s.property && !s.charges?.rest), { message: API_ERRORS.ITEM_CONSUMABLE_CONFLICT, path: ["consumable"] })
  .describe("Предмет 5e: unique=false — звичайне спорядження; property — властивість, що видається разом із базою; attunement; charges (rest null — не відновлюються); consumable — видається кількістю");

export type ItemStats = z.infer<typeof ItemStatsSchema>;

export const itemStatsColumns = (stats: ItemStats): { modifiers: Array<{ type: string; value: string }> } => ({ modifiers: itemStatsRecords(stats) });

export { isPropertyRow, isUniqueRow, itemStatsFromRow } from "@/lib/utils/items/item-row";
