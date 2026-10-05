import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

export function buildEquipped(equipped: EquippedItems, slotKey: string, artifactId: string | null): EquippedItems {
  const next: EquippedItems = {};

  for (const cell of ARTIFACT_GRID_9) {
    const id = cell.key === slotKey ? (artifactId ?? undefined) : (equipped[cell.key] as string | undefined);

    if (id) next[cell.key] = id;
  }

  return next;
}
