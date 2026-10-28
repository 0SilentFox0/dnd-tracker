import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CARRIED_SLOTS } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { operationAccess } from "@/lib/server/characters/operation-context";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { isUniqueRow } from "@/lib/utils/items/item-row";
import { itemPoolKey } from "@/lib/utils/items/pools";
import { refArtifactIds } from "@/lib/utils/items/ref";
import { attunedRefs, attunementRequired, heldRefs, itemChargesOf, pruneAttuned, resolveItemRow } from "@/lib/utils/items/resolve";
import { parseRules, type Ruleset } from "@/lib/utils/rules/schema";
import type { StashArtifact, StashView } from "@/types/inventory";

export const STASH_ROW_SELECT = { id: true, name: true, icon: true, rarity: true, slot: true, description: true, bonuses: true, modifiers: true } as const;

type InventoryRow = { equipped: unknown; stash: unknown; attuned?: unknown; items: unknown; gold: number; silver: number; copper: number };

export async function buildStashView(tx: Prisma.TransactionClient, campaignId: string, inventory: InventoryRow | null, ctx: { rules: Ruleset; resources?: unknown }): Promise<StashView> {
  const stash = normalizeStash(inventory?.stash);

  const ids = [...new Set(heldRefs(inventory).flatMap(refArtifactIds))];

  const found = ids.length ? await tx.artifact.findMany({ where: { campaignId, id: { in: ids } }, select: STASH_ROW_SELECT }) : [];

  const byId = new Map(found.map((r) => [r.id, r]));

  const itemsOn = ctx.rules.items.enabled;

  const attuned = attunedRefs(inventory);

  const spent = ctx.rules.outOfCombat.persistResources ? (readResources(ctx.resources).charges ?? {}) : {};

  const artifacts = stash.flatMap((ref): StashArtifact[] => {
    const row = resolveItemRow(ref, byId);

    if (!row) return [];

    const charges = itemChargesOf(ref, byId);

    return [
      {
        id: ref,
        name: row.name,
        icon: row.icon,
        rarity: row.rarity,
        slot: row.slot,
        description: row.description,
        ...(canEquipOffHand(row, true) && { light: true }),
        ...(!isUniqueRow(row) && { gear: true as const }),
        ...(itemsOn && attunementRequired(ref, byId) && { attunement: attuned.includes(ref) ? ("attuned" as const) : ("required" as const) }),
        ...(itemsOn && CARRIED_SLOTS.has(row.slot) && { carried: true as const }),
        ...(charges && { charges: { max: charges.max, left: Math.max(0, charges.max - (spent[itemPoolKey(ref)]?.used ?? 0)), rest: charges.rest } }),
      },
    ];
  });

  return {
    purse: { gp: inventory?.gold ?? 0, sp: inventory?.silver ?? 0, cp: inventory?.copper ?? 0 },
    items: normalizeItems(inventory?.items),
    artifacts,
    ...(itemsOn && { attunement: { used: pruneAttuned(attuned, inventory ?? {}).filter((r) => resolveItemRow(r, byId)).length, limit: ctx.rules.items.attunementLimit } }),
  };
}

export async function readStash(campaignId: string, characterId: string, actor?: Actor): Promise<NextResponse> {
  const access = await operationAccess(campaignId, false, actor);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, resources: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const inventory = await prisma.characterInventory.findUnique({ where: { characterId } });

  return NextResponse.json(await buildStashView(prisma, campaignId, inventory, { rules: parseRules(access.campaign?.rules), resources: character.resources }));
}
