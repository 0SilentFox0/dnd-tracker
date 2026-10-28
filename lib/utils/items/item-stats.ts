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

export const ItemSpellSchema = z.object({
  spellId: z.string().trim().min(1).max(100),
  cost: z.number().int().min(0).max(50),
  castLevel: z.number().int().min(0).max(9).optional(),
  dc: z.number().int().min(1).max(40).optional(),
  attackBonus: z.number().int().min(-10).max(30).optional(),
  upcast: z.object({ maxLevel: z.number().int().min(1).max(9), extraCost: z.number().int().min(1).max(50) }).optional(),
});

export const ItemParameterSchema = z.object({
  kind: z.enum(["damageType", "creatureType"]),
  options: z.array(z.object({ key: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/), label: z.string().trim().min(1).max(60) })).min(1).max(50),
}).superRefine((parameter, ctx) => {
  const keys = new Set<string>();

  parameter.options.forEach((option, index) => {
    if (keys.has(option.key)) ctx.addIssue({ code: "custom", path: ["options", index, "key"], message: "Параметр має бути унікальним" });

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
    spells: z.array(ItemSpellSchema).max(500).optional(),
    parameter: ItemParameterSchema.optional(),
  })
  .superRefine((s, ctx) => {
    if (s.spells?.some((spell) => spell.cost > 0 || spell.upcast) && !s.charges && !s.consumable) ctx.addIssue({ code: "custom", path: ["spells"], message: "Заклинання предмета потребують зарядів або ознаки витратного предмета" });

    const ids = new Set<string>();

    for (const [index, spell] of (s.spells ?? []).entries()) {
      if (ids.has(spell.spellId)) ctx.addIssue({ code: "custom", path: ["spells", index, "spellId"], message: "Заклинання предмета не може дублюватися" });

      ids.add(spell.spellId);

      if (spell.upcast && spell.castLevel === undefined) ctx.addIssue({ code: "custom", path: ["spells", index, "upcast"], message: "Для підсилення потрібен рівень касту" });

      if (spell.upcast && spell.upcast.maxLevel <= (spell.castLevel ?? 0)) ctx.addIssue({ code: "custom", path: ["spells", index, "upcast", "maxLevel"], message: "Максимальний рівень має перевищувати базовий" });
    }
  })
  .refine((s) => !s.consumable || (!s.property && !s.charges?.rest), { message: API_ERRORS.ITEM_CONSUMABLE_CONFLICT, path: ["consumable"] })
  .describe("Предмет 5e: unique=false — звичайне спорядження; property — властивість, що видається разом із базою; attunement; charges (rest null — не відновлюються); consumable — видається кількістю; spells — касти за спільні заряди предмета");

export type ItemStats = z.infer<typeof ItemStatsSchema>;

export const itemStatsColumns = (stats: ItemStats): { modifiers: Array<{ type: string; value: string }> } => ({ modifiers: itemStatsRecords(stats) });

export { isPropertyRow, isUniqueRow, itemStatsFromRow } from "@/lib/utils/items/item-row";
