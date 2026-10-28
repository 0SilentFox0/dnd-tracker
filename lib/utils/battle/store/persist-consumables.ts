import type { Prisma } from "@prisma/client";

import { persistedHeroes } from "./persist-resources";

import { InventoryLogKind } from "@/lib/constants/inventory";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { normalizeItems } from "@/lib/utils/inventory/items";
import { consumableSpend, spendConsumables } from "@/lib/utils/items/consumables";
import type { BattleParticipant } from "@/types/battle";

export async function persistConsumables(
  tx: Pick<Prisma.TransactionClient, "characterInventory" | "inventoryLog" | "campaign" | "$executeRaw">,
  battle: { campaignId: string },
  participants: BattleParticipant[],
): Promise<void> {
  const spent = persistedHeroes(participants).flatMap((h) => {
    const byItem = consumableSpend(h);

    return Object.keys(byItem).length > 0 ? [{ characterId: h.basicInfo.sourceId, byItem }] : [];
  });

  if (spent.length === 0) return;

  await lockCampaignArtifacts(tx as Prisma.TransactionClient, battle.campaignId);

  const [campaign, inventories] = await Promise.all([
    tx.campaign.findUnique({ where: { id: battle.campaignId }, select: { dmUserId: true } }),
    tx.characterInventory.findMany({ where: { characterId: { in: spent.map((s) => s.characterId) } }, select: { characterId: true, items: true } }),
  ]);

  const logs: Prisma.InventoryLogCreateManyInput[] = [];

  for (const { characterId, byItem } of spent) {
    const inv = inventories.find((i) => i.characterId === characterId);

    if (!inv) continue;

    const { items, used } = spendConsumables(normalizeItems(inv.items), byItem);

    if (used.length === 0) continue;

    await tx.characterInventory.update({ where: { characterId }, data: { items: items as unknown as Prisma.InputJsonValue } });

    if (campaign) logs.push(...used.map((u) => ({ campaignId: battle.campaignId, characterId, actorUserId: campaign.dmUserId, kind: InventoryLogKind.ITEM_USE, delta: { item: u.item, qty: -u.qty }, note: null })));
  }

  if (logs.length > 0) await tx.inventoryLog.createMany({ data: logs });
}
