import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import { normalizeItems } from "@/lib/utils/inventory/items";
import { consumableEntries,type ConsumableEntry } from "@/lib/utils/items/consumables";
import { activeItemRefs, attunedRefs, inventoryArtifactIds, resolveItemRow } from "@/lib/utils/items/resolve";
import type { Ruleset } from "@/lib/utils/rules";
import type { EquippedArtifact } from "@/types/battle";

export type EquippedArtifactRow = { row: Prisma.ArtifactGetPayload<object>; slot: string; carried?: true };

export function loadEquippedArtifactRows(
  character: CharacterFromPrisma,
  artifactsById: Record<string, Prisma.ArtifactGetPayload<object>>,
  opts: { rules?: Ruleset } = {},
): EquippedArtifactRow[] {
  if (!character.inventory) return [];

  const itemsEnabled = !!opts.rules?.items.enabled;

  const ids = inventoryArtifactIds(character.inventory, { stash: itemsEnabled, consumables: false });

  if (ids.length === 0) return [];

  const rows = ids.map((id) => artifactsById[id]).filter((a): a is NonNullable<typeof a> => a != null);

  const byId = new Map(rows.map((r) => [r.id, r]));

  const attuned = attunedRefs(character.inventory);

  return activeItemRefs(character.inventory, byId, itemsEnabled).flatMap(({ ref, slot, carried }) => {
    const row = resolveItemRow(ref, byId, { attuned, itemsEnabled });

    return row ? [{ row, slot, ...(carried && { carried }) }] : [];
  });
}

export function toEquippedArtifacts(rows: EquippedArtifactRow[]): EquippedArtifact[] {
  return rows.map(({ row: artifact, slot }) => ({
    artifactId: artifact.id,
    name: artifact.name,
    slot,
    setId: artifact.setId ?? undefined,
    bonuses: (artifact.bonuses as Record<string, number>) || {},
    modifiers: (artifact.modifiers as EquippedArtifact["modifiers"]) || [],
  }));
}

export function loadConsumableEntries(
  character: CharacterFromPrisma,
  artifactsById: Record<string, Prisma.ArtifactGetPayload<object>>,
  rules?: Ruleset,
): ConsumableEntry<Prisma.ArtifactGetPayload<object>>[] {
  if (!rules?.items.enabled || !character.inventory) return [];

  const ids = normalizeItems(character.inventory.items).flatMap((i) => (i.artifactId ? [i.artifactId] : []));

  if (ids.length === 0) return [];

  return consumableEntries(character.inventory.items, artifactsById);
}
