import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

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

  const inventory = current
    ? await prisma.characterInventory.update({
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
    : await prisma.characterInventory.create({
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
}
