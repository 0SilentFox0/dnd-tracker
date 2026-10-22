import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import type { StashArtifact, StashView } from "@/types/inventory";

const artifactSelect = { id: true, name: true, icon: true, rarity: true, slot: true, description: true } as const;

type InventoryRow = { equipped: unknown; stash: unknown; items: unknown; gold: number; silver: number; copper: number };

export async function buildStashView(tx: Prisma.TransactionClient, campaignId: string, inventory: InventoryRow | null): Promise<StashView> {
  const stash = normalizeStash(inventory?.stash);

  const found = stash.length ? await tx.artifact.findMany({ where: { campaignId, id: { in: stash } }, select: artifactSelect }) : [];

  const byId = new Map<string, StashArtifact>(found.map((a) => [a.id, a]));

  const view: StashView = {
    purse: { gp: inventory?.gold ?? 0, sp: inventory?.silver ?? 0, cp: inventory?.copper ?? 0 },
    items: normalizeItems(inventory?.items),
    artifacts: stash.flatMap((id) => byId.get(id) ?? []),
  };

  return view;
}

export async function readStash(campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const inventory = await prisma.characterInventory.findUnique({ where: { characterId } });

  return NextResponse.json(await buildStashView(prisma, campaignId, inventory));
}
