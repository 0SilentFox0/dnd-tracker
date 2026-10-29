import type { Ability } from "@/lib/utils/abilities/schema";
import type { ItemRowLike } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import type { AbilityPool, SpellGrant } from "@/types/battle";

export const ITEM_CHARGES_KEY = "charges";

export const ITEM_POOL_PREFIX = "pool:item:";

export const GRANT_POOL_PREFIX = "pool:grant:";

export const CONSUMABLE_POOL_PREFIX = "pool:consumable:";

export const itemPoolKey = (ref: string) => `${ITEM_POOL_PREFIX}${ref}`;

export const spellPoolKey = (spellId: string) => `pool:spell:${spellId}`;

export const grantPoolKey = (sourceKey: string, sharedPool?: string | null) =>
  `${GRANT_POOL_PREFIX}${sharedPool ? `${sourceKey.slice(0, sourceKey.lastIndexOf(":"))}:shared:${encodeURIComponent(sharedPool)}` : sourceKey}`;

export const classPoolKey = (classId: string, key: string) => `pool:${classId}:${key}`;

type SpellGrantFields = Pick<SpellGrant, "castLevel" | "dc" | "attackBonus" | "upcast">;

export const spellGrantFields = (spell: SpellGrantFields): Partial<SpellGrantFields> => ({
  ...(spell.castLevel !== undefined && { castLevel: spell.castLevel }),
  ...(spell.dc !== undefined && { dc: spell.dc }),
  ...(spell.attackBonus !== undefined && { attackBonus: spell.attackBonus }),
  ...(spell.upcast && { upcast: spell.upcast }),
});

export const castPoolKey = (castId: string, effectIndex: number) => `pool:cast:${castId}:${effectIndex}`;

export const isCastPool = (key: string) => key.startsWith("pool:cast:");

export const consumablePoolKey = (itemId: string) => `${CONSUMABLE_POOL_PREFIX}${itemId}`;

export const isConsumablePool = (key: string) => key.startsWith(CONSUMABLE_POOL_PREFIX);

export function withItemPool(abilities: Ability[], key: string): Ability[] {
  return abilities.map((a) => (a.limits?.pool?.key === ITEM_CHARGES_KEY ? { ...a, limits: { ...a.limits, pool: { ...a.limits.pool, key } } } : a));
}

export function itemPools(rows: readonly ItemRowLike[]): Record<string, AbilityPool> {
  const out: Record<string, AbilityPool> = {};

  for (const row of rows) {
    const charges = itemStatsFromRow(row)?.charges;

    if (charges) out[itemPoolKey(row.id)] = { label: row.name, max: charges.max, rest: charges.rest };
  }

  return out;
}
