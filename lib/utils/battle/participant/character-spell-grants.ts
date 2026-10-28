import type { Prisma } from "@prisma/client";

import type { EquippedArtifactRow } from "./extract-artifacts";

import type { ChoiceSelections } from "@/lib/utils/characters/choices/selections";
import { type ConsumableEntry, consumablePools } from "@/lib/utils/items/consumables";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { consumablePoolKey, itemPoolKey, itemPools } from "@/lib/utils/items/pools";
import type { AbilityPool, SpellGrant } from "@/types/battle";
import type { SelectedSpellGrant } from "@/types/choices";

const heroGrantPool = (sourceKey: string, policy: SelectedSpellGrant["grantPolicy"]) => `pool:grant:${policy.sharedPool ? `${sourceKey.slice(0, sourceKey.lastIndexOf(":"))}:shared:${encodeURIComponent(policy.sharedPool)}` : sourceKey}`;

export function buildCharacterSpellGrants({ selections, artifactRows, consumables, proficiencyBonus }: {
  selections: ChoiceSelections | null;
  artifactRows: EquippedArtifactRow[];
  consumables: ConsumableEntry<Prisma.ArtifactGetPayload<object>>[];
  proficiencyBonus: number;
}): { grants: SpellGrant[]; pools: Record<string, AbilityPool> } {
  const itemRows = [...new Map(artifactRows.map(({ row }) => [row.id, row])).values()];

  const grantPools = Object.fromEntries((selections?.spellGrants ?? []).flatMap(({ label, sourceKey, grantPolicy }) => {
    const key = heroGrantPool(sourceKey, grantPolicy);

    const max = grantPolicy.uses === "proficiency" ? proficiencyBonus : grantPolicy.uses;

    return max > 0 ? [[key, { label, max, rest: grantPolicy.rest }]] : [];
  }));

  const spellGrants: SpellGrant[] = (selections?.spellGrants ?? []).map(({ spellId, label, sourceKey, grantPolicy }) => {
    const pool = grantPolicy.uses === "proficiency" || grantPolicy.uses > 0 ? heroGrantPool(sourceKey, grantPolicy) : undefined;

    return { spellId, key: sourceKey, label, via: grantPolicy.via ?? "grant", ...(pool && { pool, cost: 1 }), ...(grantPolicy.castLevel !== undefined && { castLevel: grantPolicy.castLevel }), ...(grantPolicy.dcAbility && { dcAbility: grantPolicy.dcAbility }) };
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
      ...(spell.castLevel !== undefined && { castLevel: spell.castLevel }),
      ...(spell.dc !== undefined && { dc: spell.dc }),
      ...(spell.attackBonus !== undefined && { attackBonus: spell.attackBonus }),
      ...(spell.upcast && { upcast: spell.upcast }),
    }));
  });

  const scrollGrants = consumables.flatMap(({ itemId, row, spellId, label }) => {
    const spell = spellId && itemStatsFromRow(row)?.spells?.find((candidate) => candidate.spellId === spellId);

    if (!spell || !spellId) return [];

    return [{ spellId, key: `consumable:${itemId}:spell:${spellId}`, label: label ?? row.name, pool: consumablePoolKey(itemId), cost: 1, ...(spell.castLevel !== undefined && { castLevel: spell.castLevel }), ...(spell.dc !== undefined && { dc: spell.dc }), ...(spell.attackBonus !== undefined && { attackBonus: spell.attackBonus }) }];
  });

  return {
    grants: [...spellGrants, ...itemSpellGrants, ...scrollGrants],
    pools: { ...itemPools(itemRows), ...consumablePools(consumables), ...grantPools },
  };
}
