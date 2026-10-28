import { ARMOR_LIMITS, ArmorModifierType } from "@/lib/constants/artifacts";
import type { ArmorCategory, ArmorStats } from "@/lib/utils/artifacts/armor-stats";

const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

const DEFAULT_DEX_CAP: Record<ArmorCategory, number | null> = { light: null, medium: 2, heavy: 0 };

export function armorDexCap(stats: ArmorStats): number | null {
  return stats.dexCap ?? DEFAULT_DEX_CAP[stats.category];
}

/** Без zod: ходить у entry-чанк бою (`lib/__tests__/client-entry-imports.test.ts`). */
export function armorStatsFromRow(row: { modifiers?: unknown }): ArmorStats | null {
  const byType = new Map<string, string>();

  for (const m of Array.isArray(row.modifiers) ? row.modifiers : []) {
    if (!m || typeof m !== "object") continue;

    const { type, value } = m as { type?: unknown; value?: unknown };

    if (typeof type === "string" && value != null) byType.set(type, String(value));
  }

  const category = byType.get(ArmorModifierType.CATEGORY);

  const base = Number(byType.get(ArmorModifierType.BASE));

  if (category !== "light" && category !== "medium" && category !== "heavy") return null;

  if (!isInt(base, ...ARMOR_LIMITS.base)) return null;

  const out: ArmorStats = { category, base };

  const dexCap = byType.get(ArmorModifierType.DEX_CAP);

  if (dexCap !== undefined) {
    if (!isInt(Number(dexCap), ...ARMOR_LIMITS.dexCap)) return null;

    out.dexCap = Number(dexCap);
  }

  const strength = byType.get(ArmorModifierType.STRENGTH);

  if (strength !== undefined) {
    if (!isInt(Number(strength), ...ARMOR_LIMITS.strength)) return null;

    out.strength = Number(strength);
  }

  if (byType.get(ArmorModifierType.STEALTH) === "true") out.stealthDisadvantage = true;

  return out;
}
