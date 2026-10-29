import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARMOR_CATEGORIES, ITEM_KINDS, ITEM_LIMITS } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { itemStatsRecords } from "@/lib/utils/items/item-row";

export type ItemKind = (typeof ITEM_KINDS)[number];

const PropertySchema = z.object({
  appliesTo: z.object({
    kinds: z.array(z.enum(ITEM_KINDS)).min(1),
    attackType: z.enum(["melee", "ranged"]).optional(),
    armorCategories: z.array(z.enum(ARMOR_CATEGORIES)).min(1).optional(),
    bases: z.array(z.string().trim().min(1).max(100)).min(1).max(ITEM_LIMITS.bases).optional(),
  }),
  nameTemplate: z.string().trim().max(100).refine((t) => t.includes("{base}"), API_ERRORS.ITEM_TEMPLATE_NEEDS_BASE).optional(),
  overrides: z
    .object({
      stealthDisadvantage: z.literal(false).optional(),
      strength: z.null().optional(),
      damageType: z.string().trim().min(1).max(30).optional(),
      addTraits: z.array(z.enum(WEAPON_TRAITS)).min(1).optional(),
    })
    .optional(),
});

export const ItemSpellSchema = z.object({
  spellId: z.string().trim().min(1).max(100),
  cost: z.number().int().min(ITEM_LIMITS.cost[0]).max(ITEM_LIMITS.cost[1]),
  castLevel: z.number().int().min(ITEM_LIMITS.castLevel[0]).max(ITEM_LIMITS.castLevel[1]).optional(),
  dc: z.number().int().min(ITEM_LIMITS.dc[0]).max(ITEM_LIMITS.dc[1]).optional(),
  attackBonus: z.number().int().min(ITEM_LIMITS.attackBonus[0]).max(ITEM_LIMITS.attackBonus[1]).optional(),
  upcast: z.object({ maxLevel: z.number().int().min(ITEM_LIMITS.upcastMaxLevel[0]).max(ITEM_LIMITS.upcastMaxLevel[1]), extraCost: z.number().int().min(ITEM_LIMITS.upcastExtraCost[0]).max(ITEM_LIMITS.upcastExtraCost[1]) }).optional(),
});

export const ItemParameterSchema = z.object({
  kind: z.enum(["damageType", "creatureType"]),
  options: z.array(z.object({ key: z.string().regex(ITEM_LIMITS.keyPattern), label: z.string().trim().min(1).max(ITEM_LIMITS.label) })).min(1).max(ITEM_LIMITS.options),
}).superRefine((parameter, ctx) => {
  const keys = new Set<string>();

  parameter.options.forEach((option, index) => {
    if (keys.has(option.key)) ctx.addIssue({ code: "custom", path: ["options", index, "key"], message: API_ERRORS.ITEM_PARAMETER_DUPLICATE });

    keys.add(option.key);
  });
});

export const ItemStatsSchema = z
  .object({
    unique: z.boolean().optional(),
    property: PropertySchema.optional(),
    attunement: z.boolean().optional(),
    charges: z.object({ max: z.number().int().min(ITEM_LIMITS.charges[0]).max(ITEM_LIMITS.charges[1]), rest: z.enum(["short", "long"]).nullable() }).optional(),
    consumable: z.boolean().optional(),
    spells: z.array(ItemSpellSchema).max(ITEM_LIMITS.spells).optional(),
    parameter: ItemParameterSchema.optional(),
  })
  .superRefine((s, ctx) => {
    if (s.spells?.some((spell) => spell.cost > 0 || spell.upcast) && !s.charges && !s.consumable) ctx.addIssue({ code: "custom", path: ["spells"], message: API_ERRORS.ITEM_SPELLS_NEED_CHARGES });

    const ids = new Set<string>();

    for (const [index, spell] of (s.spells ?? []).entries()) {
      if (ids.has(spell.spellId)) ctx.addIssue({ code: "custom", path: ["spells", index, "spellId"], message: API_ERRORS.ITEM_SPELL_DUPLICATE });

      ids.add(spell.spellId);

      if (spell.upcast && spell.castLevel === undefined) ctx.addIssue({ code: "custom", path: ["spells", index, "upcast"], message: API_ERRORS.ITEM_UPCAST_NEEDS_CAST_LEVEL });

      if (spell.upcast && spell.upcast.maxLevel <= (spell.castLevel ?? 0)) ctx.addIssue({ code: "custom", path: ["spells", index, "upcast", "maxLevel"], message: API_ERRORS.ITEM_UPCAST_MAX_BELOW_BASE });
    }
  })
  .refine((s) => !s.consumable || (!s.property && !s.charges?.rest), { message: API_ERRORS.ITEM_CONSUMABLE_CONFLICT, path: ["consumable"] })
  .describe("5e item: unique=false is ordinary gear; property is a property granted with the base item; attunement; charges (rest null means they do not recharge); consumable is granted by quantity; spells are cast using the item's shared charges");

export type ItemStats = z.infer<typeof ItemStatsSchema>;

export const itemStatsColumns = (stats: ItemStats): { modifiers: Array<{ type: string; value: string }> } => ({ modifiers: itemStatsRecords(stats) });

export { isPropertyRow, isUniqueRow, itemStatsFromRow } from "@/lib/utils/items/item-row";
