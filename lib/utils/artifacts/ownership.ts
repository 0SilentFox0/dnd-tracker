import { buildEquipped } from "./equipment";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

export interface HeldInventory {
  characterId: string;
  equipped: EquippedItems;
}

export const TransferError = { EMPTY_SLOT: "EMPTY_SLOT", SAME_CHARACTER: "SAME_CHARACTER", UNKNOWN_SLOT: "UNKNOWN_SLOT" } as const;

export type TransferErrorCode = (typeof TransferError)[keyof typeof TransferError];

export type TransferPlan =
  | { ok: true; artifactId: string; swappedArtifactId: string | null; fromEquipped: EquippedItems; toEquipped: EquippedItems }
  | { ok: false; error: TransferErrorCode };

export function findHolder(inventories: HeldInventory[], artifactId: string, exceptCharacterId?: string): string | null {
  const holder = inventories.find((inv) => inv.characterId !== exceptCharacterId && Object.values(inv.equipped).includes(artifactId));

  return holder?.characterId ?? null;
}

export function planTransfer({ from, to, slot }: { from: HeldInventory; to: HeldInventory; slot: string }): TransferPlan {
  if (!ARTIFACT_GRID_9.some((cell) => cell.key === slot)) return { ok: false, error: TransferError.UNKNOWN_SLOT };

  if (from.characterId === to.characterId) return { ok: false, error: TransferError.SAME_CHARACTER };

  const artifactId = from.equipped[slot];

  if (!artifactId) return { ok: false, error: TransferError.EMPTY_SLOT };

  const swappedArtifactId = to.equipped[slot] ?? null;

  return {
    ok: true,
    artifactId,
    swappedArtifactId,
    fromEquipped: buildEquipped(from.equipped, slot, swappedArtifactId),
    toEquipped: buildEquipped(to.equipped, slot, artifactId),
  };
}
