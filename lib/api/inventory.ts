import { campaignGet, campaignPatch, campaignPost } from "@/lib/api/client";
import type { StashAction } from "@/lib/utils/inventory/stash-actions";
import type { Inventory, InventoryFormData, InventoryLogEntry, StashView } from "@/types/inventory";

/**
 * Оновлює інвентар персонажа
 */
export async function updateInventory(
  campaignId: string,
  characterId: string,
  data: Partial<InventoryFormData> & { equipSlot?: { slot: string; artifactId: string | null } },
): Promise<Inventory> {
  return campaignPatch<Inventory>(
    campaignId,
    `/characters/${characterId}/inventory`,
    data,
  );
}

export const transferArtifact = (campaignId: string, characterId: string, body: { toCharacterId: string; slot?: string; artifactId?: string }) =>
  campaignPost<{ from: Inventory; to: Inventory }>(campaignId, `/characters/${characterId}/artifacts/transfer`, body);

export const getStash = (campaignId: string, characterId: string) => campaignGet<StashView>(campaignId, `/characters/${characterId}/stash`);

export const postStashAction = (campaignId: string, characterId: string, action: StashAction) =>
  campaignPost<StashView>(campaignId, `/characters/${characterId}/stash`, action);

export const getInventoryLog = (campaignId: string, characterId: string, cursor?: string) =>
  campaignGet<{ entries: InventoryLogEntry[]; nextCursor: string | null }>(
    campaignId,
    `/characters/${characterId}/stash/log${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
  );
