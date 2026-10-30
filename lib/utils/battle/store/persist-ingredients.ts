import type { Prisma } from "@prisma/client";

import { persistedHeroes } from "./persist-resources";

import { COIN_VALUE, InventoryLogKind } from "@/lib/constants/inventory";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { normalizeItems } from "@/lib/utils/inventory/items";
import { spendCoins, toCopper } from "@/lib/utils/inventory/money";
import { spendConsumables } from "@/lib/utils/items/consumables";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { Purse } from "@/types/inventory";

type Wallet = { gold: number; silver: number; copper: number };

const toPurse = (w: Wallet): Purse => ({ gp: w.gold, sp: w.silver, cp: w.copper });

export function spendCp(wallet: Wallet, cp: number): Wallet {
  const purse = toPurse(wallet);

  const wholeGp = Math.floor(cp / COIN_VALUE.gp);

  const rest = cp - wholeGp * COIN_VALUE.gp;

  const afterGp = toCopper(purse) < cp ? null : spendCoins(purse, wholeGp, "gp");

  const next = (afterGp && spendCoins(afterGp, rest, "cp")) ?? { gp: 0, sp: 0, cp: 0 };

  return { gold: next.gp, silver: next.sp, copper: next.cp };
}

export async function persistIngredients(
  tx: Pick<Prisma.TransactionClient, "characterInventory" | "inventoryLog" | "campaign" | "$executeRaw">,
  battle: { campaignId: string; rules: Ruleset },
  participants: BattleParticipant[],
): Promise<void> {
  if (!battle.rules.outOfCombat.persistResources) return;

  const spent = persistedHeroes(participants).flatMap((h) => {
    const stock = h.battleData.ingredientStock;

    if (!stock) return [];

    const byItem = Object.fromEntries(stock.items.filter((i) => i.used > 0).map((i) => [i.id, i.used]));

    return Object.keys(byItem).length > 0 || stock.usedCp > 0 ? [{ characterId: h.basicInfo.sourceId, byItem, usedCp: stock.usedCp }] : [];
  });

  if (spent.length === 0) return;

  await lockCampaignArtifacts(tx as Prisma.TransactionClient, battle.campaignId);

  const [campaign, inventories] = await Promise.all([
    tx.campaign.findUnique({ where: { id: battle.campaignId }, select: { dmUserId: true } }),
    tx.characterInventory.findMany({ where: { characterId: { in: spent.map((s) => s.characterId) } }, select: { characterId: true, items: true, gold: true, silver: true, copper: true } }),
  ]);

  const inventoryOf = new Map(inventories.map((i) => [i.characterId, i]));

  const logs: Prisma.InventoryLogCreateManyInput[] = [];

  for (const { characterId, byItem, usedCp } of spent) {
    const inv = inventoryOf.get(characterId);

    if (!inv) continue;

    const { items, used } = spendConsumables(normalizeItems(inv.items), byItem);

    const before = toCopper(toPurse(inv));

    const wallet = usedCp > 0 ? spendCp(inv, usedCp) : inv;

    const paidCp = before - toCopper(toPurse(wallet));

    if (used.length === 0 && paidCp <= 0) continue;

    await tx.characterInventory.update({
      where: { characterId },
      data: { items: items as unknown as Prisma.InputJsonValue, gold: wallet.gold, silver: wallet.silver, copper: wallet.copper },
    });

    if (!campaign) continue;

    const base = { campaignId: battle.campaignId, characterId, actorUserId: campaign.dmUserId, note: null };

    logs.push(...used.map((u) => ({ ...base, kind: InventoryLogKind.ITEM_USE, delta: { item: u.item, qty: -u.qty } })));

    if (paidCp > 0) {
      logs.push({ ...base, kind: InventoryLogKind.MONEY_SPEND, delta: { gp: wallet.gold - inv.gold, sp: wallet.silver - inv.silver, cp: wallet.copper - inv.copper } });
    }
  }

  if (logs.length > 0) await tx.inventoryLog.createMany({ data: logs });
}
