import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import type { EquippedItems, FreeArtifact } from "@/types/inventory";

export async function readFreeArtifacts(campaignId: string): Promise<NextResponse> {
  const access = await requireDM(campaignId);

  if (access instanceof NextResponse) return access;

  const [all, inventories] = await Promise.all([
    prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true, icon: true, rarity: true, slot: true }, orderBy: { name: "asc" } }),
    prisma.characterInventory.findMany({ where: { character: { campaignId } }, select: { characterId: true, equipped: true, stash: true } }),
  ]);

  const held = inventories.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) }));

  const free: FreeArtifact[] = all.filter((a) => !findHolder(held, a.id));

  return NextResponse.json(free);
}
