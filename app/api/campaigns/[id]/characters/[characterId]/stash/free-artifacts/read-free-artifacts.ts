import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import { matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { uniqueChecker } from "@/lib/utils/items/resolve";
import type { EquippedItems, FreeArtifact } from "@/types/inventory";

export async function readFreeArtifacts(campaignId: string): Promise<NextResponse> {
  const access = await requireDM(campaignId);

  if (access instanceof NextResponse) return access;

  const [all, inventories] = await Promise.all([
    prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true, icon: true, rarity: true, slot: true, modifiers: true }, orderBy: { name: "asc" } }),
    prisma.characterInventory.findMany({ where: { character: { campaignId } }, select: { characterId: true, equipped: true, stash: true } }),
  ]);

  const isUnique = uniqueChecker(new Map(all.map((a) => [a.id, a])));

  const held = inventories.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) }));

  const freeRows = all.filter((a) => !findHolder(held, a.id, undefined, isUnique));

  const free: FreeArtifact[] = freeRows.map(({ modifiers, ...a }) => {
    const stats = itemStatsFromRow({ modifiers });

    const template = stats?.property?.nameTemplate;

    return {
      ...a,
      ...(stats?.property && { property: { ...(template && { nameTemplate: template }), bases: freeRows.filter((b) => matchesAppliesTo(b, { ...a, modifiers })).map((b) => b.id) } }),
      ...(stats?.consumable && { consumable: true as const }),
      ...(stats && !stats.property && stats.unique === false && { gear: true as const }),
    };
  });

  return NextResponse.json(free);
}
