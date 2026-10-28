import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARTIFACT_GRID_9, ArtifactSlot } from "@/lib/constants/artifacts";
import { InventoryLogKind } from "@/lib/constants/inventory";
import { prisma } from "@/lib/db";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";
import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";
import { findHolder, uniqueConflict } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { isComposedRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";
import { resolveItemRow, uniqueChecker } from "@/lib/utils/items/resolve";
import { parseRules } from "@/lib/utils/rules/schema";
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

    let displaced: string | undefined;

    if (data.equipSlot) {
      const equippedNow = (current?.equipped ?? {}) as EquippedItems;

      const occupant = equippedNow[data.equipSlot.slot] as string | undefined;

      displaced = occupant && occupant !== data.equipSlot.artifactId ? occupant : undefined;

      if (displaced && normalizeStash(current?.stash).includes(displaced)) return errorResponse(API_ERRORS.ITEM_ALREADY_IN_STASH, 409);

      nextEquipped = buildEquipped(equippedNow, data.equipSlot.slot, data.equipSlot.artifactId);
    }

    const shieldId = nextEquipped?.shield;

    if (typeof shieldId === "string" && shieldId && shieldId !== (current?.equipped as EquippedItems | undefined)?.shield) {
      const shieldArtifact = await tx.artifact.findFirst({ where: { id: parseItemRef(shieldId)?.baseId ?? shieldId, campaignId }, select: { slot: true, bonuses: true, modifiers: true } });

      if (shieldArtifact && shieldArtifact.slot !== ArtifactSlot.SHIELD) {
        const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

        if (!canEquipOffHand(shieldArtifact, parseRules(campaign?.rules).classes.enabled)) return errorResponse(API_ERRORS.OFF_HAND_EQUIP, 422);
      }
    }

    if (nextEquipped) {
      const ids = Object.values(nextEquipped).filter((v): v is string => !!v);

      const rules = parseRules(accessResult.campaign?.rules);

      // the legacy grid editor knows non-unique gear only for 5e item campaigns or composed refs: HOMM keeps one query-free check
      const rows =
        (rules.items.enabled || ids.some((ref) => isComposedRef(ref) || !!parseItemRef(ref)?.param)) && ids.length > 0
          ? new Map((await tx.artifact.findMany({ where: { id: { in: [...new Set(ids.flatMap(refArtifactIds))] }, campaignId }, select: { id: true, name: true, slot: true, modifiers: true } })).map((r) => [r.id, r]))
          : null;

      const isUnique = rows ? uniqueChecker(rows) : undefined;

      if (uniqueConflict(ids, isUnique)) return errorResponse(API_ERRORS.ARTIFACT_ALREADY_EQUIPPED, 409);

      const checkIds = data.equipSlot ? (data.equipSlot.artifactId ? [data.equipSlot.artifactId] : []) : ids;

      if (rows && checkIds.some((ref) => {
        const parsed = parseItemRef(ref);

        const owner = parsed && rows.get(parsed.propertyId ?? parsed.baseId);

        return (!!parsed?.param || !!(owner && itemStatsFromRow(owner)?.parameter)) && !resolveItemRow(ref, rows);
      })) return errorResponse("Недозволений або відсутній параметр предмета", 422);

      if (checkIds.length > 0) {
        const others = await tx.characterInventory.findMany({
          where: { character: { campaignId }, characterId: { not: characterId } },
          select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } },
        });

        const held = others.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) }));

        for (const artifactId of checkIds) {
          const holderId = findHolder(held, artifactId, undefined, isUnique);

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
      ...(data.equipSlot && { stash: [...normalizeStash(current?.stash).filter((id) => id !== data.equipSlot?.artifactId && id !== displaced), ...(displaced ? [displaced] : [])] }),
      ...(data.backpack && { backpack: data.backpack as Prisma.InputJsonValue }),
      ...(data.items && { items: data.items as Prisma.InputJsonValue }),
    };

    const inventory = await tx.characterInventory.upsert({
      where: { characterId },
      update: scalars,
      create: { characterId, equipped: {}, backpack: [], items: [], stash: [], ...scalars },
    });

    if (data.equipSlot && displaced) {
      await writeInventoryLog(tx, [
        {
          campaignId,
          characterId,
          actorUserId: accessResult.userId,
          kind: data.equipSlot.artifactId ? InventoryLogKind.ARTIFACT_EQUIP : InventoryLogKind.ARTIFACT_UNEQUIP,
          delta: data.equipSlot.artifactId
            ? { artifactId: data.equipSlot.artifactId, slot: data.equipSlot.slot, swappedArtifactId: displaced }
            : { artifactId: displaced, slot: data.equipSlot.slot },
          note: null,
        },
      ]);
    }

    return NextResponse.json(inventory);
  });
}
