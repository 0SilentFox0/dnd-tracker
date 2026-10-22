import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import type { EquippedItems } from "@/types/inventory";

const inventoryItemSchema = z.object({ name: z.string(), quantity: z.number().optional() }).passthrough();

const updateInventorySchema = z.object({
  gold: z.number().min(0).optional(),
  silver: z.number().min(0).optional(),
  copper: z.number().min(0).optional(),
  equipped: z.record(z.string(), z.string().optional()).optional(),
  equipSlot: z.object({ slot: z.string(), artifactId: z.string().nullable() }).optional(),
  backpack: z.array(inventoryItemSchema).optional(),
  items: z.array(inventoryItemSchema).optional(),
});

export async function updateInventory(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const accessResult = await requireDM(campaignId);

  if (accessResult instanceof NextResponse) return accessResult;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId } }), campaignId);

  if (character instanceof NextResponse) return character;

  const data = await parseBody(updateInventorySchema, request);

  if (data instanceof NextResponse) return data;

  if (data.equipSlot && !ARTIFACT_GRID_9.some((cell) => cell.key === data.equipSlot?.slot)) {
    return errorResponse(API_ERRORS.ARTIFACT_UNKNOWN_SLOT, 400);
  }

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const current = await tx.characterInventory.findUnique({ where: { characterId } });

    let nextEquipped: EquippedItems | undefined = data.equipped as EquippedItems | undefined;

    if (data.equipSlot) {
      nextEquipped = buildEquipped((current?.equipped ?? {}) as EquippedItems, data.equipSlot.slot, data.equipSlot.artifactId);
    }

    if (nextEquipped) {
      const ids = Object.values(nextEquipped).filter((v): v is string => !!v);

      if (new Set(ids).size !== ids.length) return errorResponse(API_ERRORS.ARTIFACT_ALREADY_EQUIPPED, 409);

      const checkIds = data.equipSlot ? (data.equipSlot.artifactId ? [data.equipSlot.artifactId] : []) : ids;

      if (checkIds.length > 0) {
        const others = await tx.characterInventory.findMany({
          where: { character: { campaignId }, characterId: { not: characterId } },
          select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } },
        });

        const held = others.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) }));

        for (const artifactId of checkIds) {
          const holderId = findHolder(held, artifactId);

          if (holderId) {
            const holderName = others.find((o) => o.characterId === holderId)?.character.name ?? "";

            return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${holderName}`, 409);
          }
        }
      }
    }

    const scalars = {
      ...(data.gold !== undefined && { gold: data.gold }),
      ...(data.silver !== undefined && { silver: data.silver }),
      ...(data.copper !== undefined && { copper: data.copper }),
      ...(nextEquipped && { equipped: nextEquipped as Prisma.InputJsonValue }),
      ...(data.equipSlot?.artifactId && { stash: normalizeStash(current?.stash).filter((id) => id !== data.equipSlot?.artifactId) }),
      ...(data.backpack && { backpack: data.backpack as Prisma.InputJsonValue }),
      ...(data.items && { items: data.items as Prisma.InputJsonValue }),
    };

    const inventory = await tx.characterInventory.upsert({
      where: { characterId },
      update: scalars,
      create: { characterId, equipped: {}, backpack: [], items: [], stash: [], ...scalars },
    });

    return NextResponse.json(inventory);
  });
}
