import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

const inventoryItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
}).passthrough(); // Дозволяє додаткові поля

const updateInventorySchema = z.object({
  gold: z.number().min(0).optional(),
  silver: z.number().min(0).optional(),
  copper: z.number().min(0).optional(),
  equipped: z.record(z.string(), z.string().optional()).optional(),
  backpack: z.array(inventoryItemSchema).optional(),
  items: z.array(inventoryItemSchema).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: true,
      },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    // Після перевірки character гарантовано не null
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const body = await request.json();

    const data = updateInventorySchema.parse(body);

    // Конвертуємо дані для Prisma (обробка null значень та типізація JSON)
    const equippedData: Prisma.InputJsonValue = 
      (data.equipped ?? character.inventory?.equipped ?? {}) as Prisma.InputJsonValue;

    const backpackData: Prisma.InputJsonValue = 
      (data.backpack ?? character.inventory?.backpack ?? []) as Prisma.InputJsonValue;

    const itemsData: Prisma.InputJsonValue = 
      (data.items ?? character.inventory?.items ?? []) as Prisma.InputJsonValue;

    // Оновлюємо або створюємо інвентар
    let inventory;

    if (character.inventory) {
      inventory = await prisma.characterInventory.update({
        where: { characterId },
        data: {
          gold: data.gold ?? character.inventory.gold,
          silver: data.silver ?? character.inventory.silver,
          copper: data.copper ?? character.inventory.copper,
          equipped: equippedData,
          backpack: backpackData,
          items: itemsData,
        },
      });
    } else {
      inventory = await prisma.characterInventory.create({
        data: {
          characterId,
          gold: data.gold ?? 0,
          silver: data.silver ?? 0,
          copper: data.copper ?? 0,
          equipped: equippedData,
          backpack: backpackData,
          items: itemsData,
        },
      });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error updating inventory:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: true,
        campaign: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!character || character.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Перевіряємо права доступу
    const isDM = character.campaign.members[0]?.role === "dm";

    const isOwner = character.controlledBy === userId;
    
    if (!isDM && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!character.inventory) {
      // Створюємо порожній інвентар якщо його немає
      const newInventory = await prisma.characterInventory.create({
        data: {
          characterId,
          gold: 0,
          silver: 0,
          copper: 0,
          equipped: {},
          backpack: [],
          items: [],
        },
      });

      return NextResponse.json(newInventory);
    }

    return NextResponse.json(character.inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
