import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { buildStashView } from "./read-stash";
import { stashActionSchema } from "./stash-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { canStashAction } from "@/lib/utils/inventory/permissions";
import { applyStashAction, StashError, type StashErrorCode } from "@/lib/utils/inventory/stash-actions";
import { parseRules } from "@/lib/utils/rules/schema";
import type { EquippedItems, StashState } from "@/types/inventory";

const STASH_ERROR_TEXT: Record<StashErrorCode, string> = {
  [StashError.NOT_ENOUGH_MONEY]: API_ERRORS.NOT_ENOUGH_MONEY,
  [StashError.MONEY_OVERFLOW]: API_ERRORS.MONEY_OVERFLOW,
  [StashError.ITEM_NOT_FOUND]: API_ERRORS.ITEM_NOT_FOUND,
  [StashError.SLOT_EMPTY]: API_ERRORS.ARTIFACT_SLOT_EMPTY,
  [StashError.UNKNOWN_SLOT]: API_ERRORS.ARTIFACT_UNKNOWN_SLOT,
  [StashError.NOT_IN_STASH]: API_ERRORS.ARTIFACT_NOT_IN_STASH,
  [StashError.NO_SLOT_FOR_ARTIFACT]: API_ERRORS.ARTIFACT_NO_SLOT,
};

export async function applyStash(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const { isDM, userId } = access;

  const data = await parseBody(stashActionSchema, request);

  if (data instanceof NextResponse) return data;

  const character = await loadOwned(
    prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, status: true } }),
    campaignId,
    API_ERRORS.CHARACTER_NOT_FOUND,
  );

  if (character instanceof NextResponse) return character;

  const allowed = canStashAction(data.action, { isDM, isOwner: character.controlledBy === userId, pending: character.status === CharacterStatus.PENDING });

  if (!allowed) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const inv = await ensureInventory(tx, characterId);

    const state: StashState = {
      equipped: inv.equipped as EquippedItems,
      stash: normalizeStash(inv.stash),
      items: normalizeItems(inv.items),
      purse: { gp: inv.gold, sp: inv.silver, cp: inv.copper },
    };

    let artifactSlotType: string | undefined;

    let artifact: { slot: string; bonuses: unknown; modifiers: unknown } | undefined;

    let classesEnabled = false;

    if (data.action === "equip" || data.action === "grant") {
      const found = await tx.artifact.findFirst({ where: { id: data.artifactId, campaignId }, select: { slot: true, bonuses: true, modifiers: true } });

      if (!found) return errorResponse(API_ERRORS.ARTIFACT_NOT_FOUND, 404);

      artifact = found;
      artifactSlotType = found.slot;

      if (data.action === "equip" && data.slot) {
        const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

        classesEnabled = parseRules(campaign?.rules).classes.enabled;
      }
    }

    if (data.action === "grant") {
      const all = await tx.characterInventory.findMany({
        where: { character: { campaignId } },
        select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } },
      });

      const holder = findHolder(
        all.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) })),
        data.artifactId,
      );

      if (holder) return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${all.find((o) => o.characterId === holder)?.character.name ?? ""}`, 409);
    }

    const result = applyStashAction(state, data, { newItemId: randomUUID(), artifactSlotType, artifact, classesEnabled });

    if (!result.ok) return errorResponse(STASH_ERROR_TEXT[result.error], 400);

    const saved = await tx.characterInventory.update({
      where: { characterId },
      data: {
        equipped: result.state.equipped,
        stash: result.state.stash,
        items: result.state.items as unknown as Prisma.InputJsonValue,
        gold: result.state.purse.gp,
        silver: result.state.purse.sp,
        copper: result.state.purse.cp,
      },
    });

    await writeInventoryLog(tx, [{ campaignId, characterId, actorUserId: userId, ...result.log }]);

    return NextResponse.json(await buildStashView(tx, campaignId, saved));
  });
}
