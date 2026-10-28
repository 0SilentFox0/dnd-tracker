import { buildEquipped } from "./equipment";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { refArtifactIds } from "@/lib/utils/items/ref";
import type { EquippedItems } from "@/types/inventory";

export interface HeldInventory {
  characterId: string;
  equipped: EquippedItems;
  stash: string[];
}

export const TransferError = {
  EMPTY_SLOT: "EMPTY_SLOT",
  SAME_CHARACTER: "SAME_CHARACTER",
  UNKNOWN_SLOT: "UNKNOWN_SLOT",
  NOT_IN_STASH: "NOT_IN_STASH",
} as const;

export type TransferErrorCode = (typeof TransferError)[keyof typeof TransferError];

export type TransferPlan =
  | { ok: true; artifactId: string; fromEquipped: EquippedItems; fromStash: string[]; toStash: string[] }
  | { ok: false; error: TransferErrorCode };

export type IsUnique = (artifactId: string) => boolean;

const ALL_UNIQUE: IsUnique = () => true;

const heldIds = (inv: HeldInventory) => [...Object.values(inv.equipped), ...inv.stash].filter((v): v is string => !!v).flatMap(refArtifactIds);

export function findHolder(inventories: HeldInventory[], ref: string, exceptCharacterId?: string, isUnique: IsUnique = ALL_UNIQUE): string | null {
  const ids = refArtifactIds(ref).filter(isUnique);

  if (ids.length === 0) return null;

  return inventories.find((inv) => inv.characterId !== exceptCharacterId && heldIds(inv).some((id) => ids.includes(id)))?.characterId ?? null;
}

export function uniqueConflict(refs: readonly string[], isUnique: IsUnique = ALL_UNIQUE): boolean {
  const ids = refs.flatMap(refArtifactIds).filter(isUnique);

  return new Set(ids).size !== ids.length;
}

export function planTransfer({
  from,
  to,
  source,
}: {
  from: HeldInventory;
  to: HeldInventory;
  source: { slot: string } | { artifactId: string };
}): TransferPlan {
  if (from.characterId === to.characterId) return { ok: false, error: TransferError.SAME_CHARACTER };

  if ("slot" in source) {
    if (!ARTIFACT_GRID_9.some((cell) => cell.key === source.slot)) return { ok: false, error: TransferError.UNKNOWN_SLOT };

    const artifactId = from.equipped[source.slot];

    if (!artifactId) return { ok: false, error: TransferError.EMPTY_SLOT };

    return {
      ok: true,
      artifactId,
      fromEquipped: buildEquipped(from.equipped, source.slot, null),
      fromStash: from.stash,
      toStash: [...to.stash, artifactId],
    };
  }

  if (!from.stash.includes(source.artifactId)) return { ok: false, error: TransferError.NOT_IN_STASH };

  return {
    ok: true,
    artifactId: source.artifactId,
    fromEquipped: from.equipped,
    fromStash: from.stash.filter((id) => id !== source.artifactId),
    toStash: [...to.stash, source.artifactId],
  };
}
