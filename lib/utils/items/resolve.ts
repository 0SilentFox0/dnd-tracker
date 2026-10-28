import { ArtifactModifierType, CARRIED_SLOTS, ItemModifierType } from "@/lib/constants/artifacts";
import { isRecord } from "@/lib/utils/common/is-record";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { composedName, composeItemRow, type ItemRowLike } from "@/lib/utils/items/compose";
import { isUniqueRow, itemStatsFromRow } from "@/lib/utils/items/item-row";
import type { ItemStats } from "@/lib/utils/items/item-stats";
import { isComposedRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

export type RowsById<R> = ReadonlyMap<string, R> | Readonly<Record<string, R>>;

export interface InventoryLike {
  equipped?: unknown;
  stash?: unknown;
  attuned?: unknown;
  items?: unknown;
}

export interface ItemResolveOptions {
  attuned?: readonly string[];
  itemsEnabled?: boolean;
}

export interface ActiveItemRef {
  ref: string;
  slot: string;
  carried?: true;
}

export const getRow = <R>(rows: RowsById<R>, id: string): R | undefined => (rows instanceof Map ? rows.get(id) : (rows as Record<string, R>)[id]);

const needsAttunement = (row: ItemRowLike, ref: string, opts: ItemResolveOptions) =>
  !!opts.itemsEnabled && itemStatsFromRow(row)?.attunement === true && !(opts.attuned ?? []).includes(ref);

const BASE_SHIELD_AC = "shield-ac";

// an unattuned unique item stays a weapon/armor but grants nothing; a shield keeps its base AC ability
const strip = <R extends ItemRowLike>(row: R): R => ({
  ...row,
  bonuses: {},
  abilities: (Array.isArray(row.abilities) ? row.abilities : []).filter((a) => isRecord(a) && a.id === BASE_SHIELD_AC),
  modifiers: (Array.isArray(row.modifiers) ? row.modifiers : []).filter((m) => !(isRecord(m) && (m.type === ArtifactModifierType.DAMAGE_BONUS || m.type === ItemModifierType.STATS))),
});

export function resolveItemRow<R extends ItemRowLike>(ref: string, rowsById: RowsById<R>, opts: ItemResolveOptions = {}): R | null {
  const direct = isComposedRef(ref) ? getRow(rowsById, ref) : undefined;

  if (direct) return direct;

  const parsed = parseItemRef(ref);

  const base = parsed && getRow(rowsById, parsed.baseId);

  if (!parsed || !base || itemStatsFromRow(base)?.property) return null;

  if (!parsed.propertyId) return needsAttunement(base, ref, opts) ? strip(base) : base;

  const property = getRow(rowsById, parsed.propertyId);

  const propertyStats = property && itemStatsFromRow(property);

  if (!property || !propertyStats?.property) return null;

  if (needsAttunement(property, ref, opts)) return { ...base, id: ref, name: composedName(base, property, propertyStats.property.nameTemplate) };

  return composeItemRow(base, property);
}

export const resolveItemRows = <R extends ItemRowLike>(refs: readonly string[], rowsById: RowsById<R>, opts: ItemResolveOptions = {}): R[] =>
  refs.flatMap((ref) => resolveItemRow(ref, rowsById, opts) ?? []);

const equippedEntries = (inv: InventoryLike | null | undefined): [string, string][] =>
  Object.entries(isRecord(inv?.equipped) ? inv.equipped : {}).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0);

export const heldRefs = (inv: InventoryLike | null | undefined): string[] => [...new Set([...equippedEntries(inv).map(([, r]) => r), ...normalizeStash(inv?.stash)])];

export const attunedRefs = (inv: InventoryLike | null | undefined): string[] => normalizeStash(inv?.attuned);

export function activeItemRefs<R extends ItemRowLike>(inv: InventoryLike | null | undefined, rowsById: RowsById<R>, itemsEnabled: boolean): ActiveItemRef[] {
  const worn = equippedEntries(inv).map(([slot, ref]) => ({ ref, slot }));

  if (!itemsEnabled) return worn;

  const wornRefs = new Set(worn.map((w) => w.ref));

  const carried = normalizeStash(inv?.stash).flatMap((ref): ActiveItemRef[] => {
    const slot = getRow(rowsById, parseItemRef(ref)?.baseId ?? "")?.slot;

    return !wornRefs.has(ref) && slot && CARRIED_SLOTS.has(slot) ? [{ ref, slot, carried: true }] : [];
  });

  return [...worn, ...carried];
}

export function inventoryArtifactIds(inv: InventoryLike | null | undefined, opts: { stash: boolean; consumables: boolean }): string[] {
  const refs = [...equippedEntries(inv).map(([, r]) => r), ...(opts.stash ? normalizeStash(inv?.stash) : [])];

  const consumables = opts.consumables ? normalizeItems(inv?.items).flatMap((i) => (i.artifactId ? [i.artifactId] : [])) : [];

  return [...new Set([...refs.flatMap(refArtifactIds), ...consumables])];
}

export const uniqueChecker =
  <R extends ItemRowLike>(rowsById: RowsById<R>) =>
  (artifactId: string): boolean => {
    const row = getRow(rowsById, artifactId);

    return !row || isUniqueRow(row);
  };

const statsOwner = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): R | undefined => {
  const parsed = parseItemRef(ref);

  return parsed ? getRow(rowsById, parsed.propertyId ?? parsed.baseId) : undefined;
};

export const attunementRequired = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): boolean => {
  const owner = statsOwner(ref, rowsById);

  return !!owner && itemStatsFromRow(owner)?.attunement === true;
};

export const itemChargesOf = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): ItemStats["charges"] | null => {
  const owner = statsOwner(ref, rowsById);

  return (owner && itemStatsFromRow(owner)?.charges) ?? null;
};

export const pruneAttuned = (attuned: readonly string[], inv: InventoryLike): string[] => {
  const held = new Set(heldRefs(inv));

  return [...new Set(attuned)].filter((r) => held.has(r));
};
