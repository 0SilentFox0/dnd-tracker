import { z } from "zod";

import { ARMOR_LIMITS, ArmorModifierType } from "@/lib/constants/artifacts";

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;

export type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];

export const ArmorStatsSchema = z.object({
  category: z.enum(ARMOR_CATEGORIES),
  base: z.number().int().min(ARMOR_LIMITS.base[0]).max(ARMOR_LIMITS.base[1]),
  dexCap: z.number().int().min(ARMOR_LIMITS.dexCap[0]).max(ARMOR_LIMITS.dexCap[1]).nullable().optional(),
  strength: z.number().int().min(ARMOR_LIMITS.strength[0]).max(ARMOR_LIMITS.strength[1]).optional(),
  stealthDisadvantage: z.boolean().optional(),
});

export type ArmorStats = z.infer<typeof ArmorStatsSchema>;

export function armorStatsColumns(stats: ArmorStats): { modifiers: Array<{ type: string; value: string }> } {
  return {
    modifiers: [
      { type: ArmorModifierType.CATEGORY, value: stats.category },
      { type: ArmorModifierType.BASE, value: String(stats.base) },
      ...(stats.dexCap != null ? [{ type: ArmorModifierType.DEX_CAP, value: String(stats.dexCap) }] : []),
      ...(stats.strength ? [{ type: ArmorModifierType.STRENGTH, value: String(stats.strength) }] : []),
      ...(stats.stealthDisadvantage ? [{ type: ArmorModifierType.STEALTH, value: "true" }] : []),
    ],
  };
}

export { armorDexCap, armorStatsFromRow } from "@/lib/utils/artifacts/armor-row";
