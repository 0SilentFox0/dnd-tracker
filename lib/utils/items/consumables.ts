import { normalizeItems } from "@/lib/utils/inventory/items";
import type { ItemRowLike } from "@/lib/utils/items/compose";
import { CONSUMABLE_POOL_PREFIX, consumablePoolKey, isConsumablePool } from "@/lib/utils/items/pools";
import { getRow, resolveItemRow, type RowsById } from "@/lib/utils/items/resolve";
import type { AbilityPool, BattleParticipant } from "@/types/battle";
import type { SpecialItem } from "@/types/inventory";

export interface ConsumableEntry<R> {
  itemId: string;
  quantity: number;
  row: R;
  spellId?: string;
  label?: string;
}

export function consumableEntries<R extends ItemRowLike>(items: unknown, rowsById: RowsById<R>): ConsumableEntry<R>[] {
  return normalizeItems(items).flatMap((i) => {
    const row = i.artifactId ? getRow(rowsById, i.artifactId) : undefined;

    const resolved = row && i.parameter ? resolveItemRow(`${row.id}~${i.parameter}`, rowsById) : row;

    return resolved && i.quantity > 0 ? [{ itemId: i.id, quantity: i.quantity, row: resolved, ...(i.spellId && { spellId: i.spellId, label: i.name }) }] : [];
  });
}

export const consumablePools = (entries: readonly ConsumableEntry<ItemRowLike>[]): Record<string, AbilityPool> =>
  Object.fromEntries(entries.map((e) => [consumablePoolKey(e.itemId), { label: e.label ?? e.row.name, max: e.quantity, rest: null }]));

export function consumableSpend(p: BattleParticipant): Record<string, number> {
  return Object.fromEntries(
    Object.keys(p.battleData.pools ?? {})
      .filter(isConsumablePool)
      .flatMap((key) => {
        const used = p.battleData.abilityUsage?.[key]?.battle ?? 0;

        return used > 0 ? [[key.slice(CONSUMABLE_POOL_PREFIX.length), used] as const] : [];
      }),
  );
}

export function spendConsumables(items: SpecialItem[], spent: Record<string, number>): { items: SpecialItem[]; used: Array<{ item: string; qty: number }> } {
  const used: Array<{ item: string; qty: number }> = [];

  const next = items.flatMap((i) => {
    const n = Math.min(spent[i.id] ?? 0, i.quantity);

    if (n <= 0) return [i];

    used.push({ item: i.name, qty: n });

    return i.quantity - n > 0 ? [{ ...i, quantity: i.quantity - n }] : [];
  });

  return { items: next, used };
}
