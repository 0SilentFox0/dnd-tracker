import type { Prisma } from "@prisma/client";

import type { EquippedArtifactRow } from "./extract-artifacts";

import type { ChoiceSelections } from "@/lib/utils/characters/choices/selections";
import { type ConsumableEntry, consumablePools } from "@/lib/utils/items/consumables";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { consumablePoolKey, grantPoolKey, itemPoolKey, itemPools, spellGrantFields } from "@/lib/utils/items/pools";
import type { AbilityPool, SpellGrant } from "@/types/battle";

export function buildCharacterSpellGrants({ selections, artifactRows, consumables, proficiencyBonus }: {
  selections: ChoiceSelections | null;
  artifactRows: EquippedArtifactRow[];
  consumables: ConsumableEntry<Prisma.ArtifactGetPayload<object>>[];
  proficiencyBonus: number;
}): { grants: SpellGrant[]; pools: Record<string, AbilityPool> } {
  const itemRows = [...new Map(artifactRows.map(({ row }) => [row.id, row])).values()];

  const grantPools = Object.fromEntries((selections?.spellGrants ?? []).flatMap(({ label, sourceKey, grantPolicy }) => {
    const max = grantPolicy.uses === "proficiency" ? proficiencyBonus : grantPolicy.uses;

    return max > 0 ? [[grantPoolKey(sourceKey, grantPolicy.sharedPool), { label, max, rest: grantPolicy.rest }]] : [];
  }));

  const spellGrants: SpellGrant[] = (selections?.spellGrants ?? []).map(({ spellId, label, sourceKey, grantPolicy }) => {
    const pool = grantPolicy.uses === "proficiency" || grantPolicy.uses > 0 ? grantPoolKey(sourceKey, grantPolicy.sharedPool) : undefined;

    return { spellId, key: sourceKey, label, via: grantPolicy.via ?? "grant", ...(pool && { pool, cost: 1 }), ...spellGrantFields({ castLevel: grantPolicy.castLevel }), ...(grantPolicy.dcAbility && { dcAbility: grantPolicy.dcAbility }) };
  });

  const itemSpellGrants = itemRows.flatMap((row) => {
    const stats = itemStatsFromRow(row);

    const pool = itemPoolKey(row.id);

    return (stats?.spells ?? []).map((spell) => ({
      spellId: spell.spellId,
      key: `item:${row.id}:spell:${spell.spellId}`,
      label: row.name,
      ...(stats?.charges && { pool }),
      cost: spell.cost,
      ...spellGrantFields(spell),
    }));
  });

  const scrollGrants = consumables.flatMap(({ itemId, row, spellId, label }) => {
    const spell = spellId && itemStatsFromRow(row)?.spells?.find((candidate) => candidate.spellId === spellId);

    if (!spell || !spellId) return [];

    return [{ spellId, key: `consumable:${itemId}:spell:${spellId}`, label: label ?? row.name, pool: consumablePoolKey(itemId), cost: 1, ...spellGrantFields({ castLevel: spell.castLevel, dc: spell.dc, attackBonus: spell.attackBonus }) }];
  });

  return {
    grants: [...spellGrants, ...itemSpellGrants, ...scrollGrants],
    pools: { ...itemPools(itemRows), ...consumablePools(consumables), ...grantPools },
  };
}
