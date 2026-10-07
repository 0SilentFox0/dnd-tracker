import { z } from "zod";

import { ArtifactModifierType } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";

export { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";

export const WeaponStatsSchema = z.object({
  damageDice: z.string().trim().max(30).optional(),
  damageType: z.string().trim().max(30).optional(),
  attackType: z.enum([AttackType.MELEE, AttackType.RANGED]).optional(),
  range: z.string().trim().max(30).optional(),
  properties: z.string().trim().max(200).optional(),
  attackBonus: z.number().int().min(-20).max(20).optional(),
  minTargets: z.number().int().min(1).max(20).optional(),
  maxTargets: z.number().int().min(1).max(20).optional(),
});

export type WeaponStats = z.infer<typeof WeaponStatsSchema>;

const STRING_FIELDS = ["damageDice", "damageType", "attackType", "range", "properties"] as const;

const NUMBER_FIELDS = ["minTargets", "maxTargets"] as const;

const MODIFIER_TYPES = new Set<string>(Object.values(ArtifactModifierType));

/** Weapon stats live in the legacy `bonuses`/`modifiers` columns that battle attack extraction reads. */
export function weaponStatsColumns(stats: WeaponStats): { bonuses: Record<string, number>; modifiers: Array<{ type: string; value: string }> } {
  const modifiers: Array<{ type: string; value: string }> = [];

  for (const key of [...STRING_FIELDS, ...NUMBER_FIELDS]) {
    const value = stats[key];

    if (value !== undefined && value !== "") modifiers.push({ type: key, value: String(value) });
  }

  return { bonuses: stats.attackBonus ? { attackBonus: stats.attackBonus } : {}, modifiers };
}

export function weaponStatsFromRow(row: { bonuses?: unknown; modifiers?: unknown }): WeaponStats {
  const out: Record<string, unknown> = {};

  for (const m of Array.isArray(row.modifiers) ? row.modifiers : []) {
    if (!m || typeof m !== "object") continue;

    const { type, value } = m as { type?: unknown; value?: unknown };

    if (typeof type !== "string" || !MODIFIER_TYPES.has(type) || value == null || value === "") continue;

    out[type] = (NUMBER_FIELDS as readonly string[]).includes(type) ? Number(value) : String(value);
  }

  const bonuses = row.bonuses && typeof row.bonuses === "object" ? (row.bonuses as Record<string, unknown>) : {};

  const attackBonus = bonuses.attackBonus ?? bonuses.attack;

  if (typeof attackBonus === "number" && attackBonus !== 0) out.attackBonus = attackBonus;

  const parsed = WeaponStatsSchema.safeParse(out);

  return parsed.success ? parsed.data : {};
}
