import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { lockCampaignArtifacts } from "@/lib/utils/artifacts/lock";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import type { EquippedItems } from "@/types/inventory";

const inventoryItemSchema = z.object({ name: z.string(), quantity: z.number().optional() }).passthrough();

const updateInventorySchema = z.object({
  gold: z.number().min(0).optional(),
  silver: z.number().min(0).optional(),
  copper: z.number().min(0).optional(),
  equipped: z.record(z.string(), z.string().optional()).optional(),
  backpack: z.array(inventoryItemSchema).optional(),
  items: z.array(inventoryItemSchema).optional(),
});

export async function updateInventory(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const accessResult = await requireDM(campaignId);

  if (accessResult instanceof NextResponse) return accessResult;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } }), campaignId);

  if (character instanceof NextResponse) return character;

  const data = await parseBody(updateInventorySchema, request);

  if (data instanceof NextResponse) return data;

  const current = character.inventory;

  const equipped = (data.equipped ?? current?.equipped ?? {}) as Prisma.InputJsonValue;

  const backpack = (data.backpack ?? current?.backpack ?? []) as Prisma.InputJsonValue;

  const items = (data.items ?? current?.items ?? []) as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    if (data.equipped) {
      const others = await tx.characterInventory.findMany({
        where: { character: { campaignId }, characterId: { not: characterId } },
        select: { characterId: true, equipped: true, character: { select: { name: true } } },
      });

      const held = others.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems }));

      for (const artifactId of Object.values(data.equipped).filter((v): v is string => !!v)) {
        const holderId = findHolder(held, artifactId);

        if (holderId) {
          const holderName = others.find((o) => o.characterId === holderId)?.character.name ?? "";

          return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${holderName}`, 409);
        }
      }
    }

    const inventory = current
      ? await tx.characterInventory.update({
          where: { characterId },
          data: {
            gold: data.gold ?? current.gold,
            silver: data.silver ?? current.silver,
            copper: data.copper ?? current.copper,
            equipped,
            backpack,
            items,
          },
        })
      : await tx.characterInventory.create({
          data: {
            characterId,
            gold: data.gold ?? 0,
            silver: data.silver ?? 0,
            copper: data.copper ?? 0,
            equipped,
            backpack,
            items,
          },
        });

    return NextResponse.json(inventory);
  });
}
