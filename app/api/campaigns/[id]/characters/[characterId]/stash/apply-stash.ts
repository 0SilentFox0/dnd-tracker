import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { buildStashView, STASH_ROW_SELECT } from "./read-stash";
import { stashActionSchema } from "./stash-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { findHolder } from "@/lib/utils/artifacts/ownership";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { canStashAction } from "@/lib/utils/inventory/permissions";
import { applyStashAction, StashError, type StashErrorCode } from "@/lib/utils/inventory/stash-actions";
import { type GrantError, type GrantPlan, planGrant } from "@/lib/utils/items/grant";
import { parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";
import { attunedRefs, attunementRequired, pruneAttuned, resolveItemRow, uniqueChecker } from "@/lib/utils/items/resolve";
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
  [StashError.ALREADY_IN_STASH]: API_ERRORS.ITEM_ALREADY_IN_STASH,
  [StashError.ITEMS_DISABLED]: API_ERRORS.ITEMS_DISABLED,
  [StashError.ITEM_NOT_HELD]: API_ERRORS.ITEM_NOT_HELD,
  [StashError.ATTUNEMENT_NOT_REQUIRED]: API_ERRORS.ATTUNEMENT_NOT_REQUIRED,
  [StashError.ALREADY_ATTUNED]: API_ERRORS.ALREADY_ATTUNED,
  [StashError.ATTUNEMENT_LIMIT]: API_ERRORS.ATTUNEMENT_LIMIT,
  [StashError.ITEM_NOT_ATTUNED]: API_ERRORS.ITEM_NOT_ATTUNED,
};

const STASH_ERROR_STATUS: Partial<Record<StashErrorCode, number>> = {
  [StashError.ALREADY_IN_STASH]: 409,
  [StashError.ITEMS_DISABLED]: 409,
  [StashError.ALREADY_ATTUNED]: 409,
  [StashError.ATTUNEMENT_LIMIT]: 409,
  [StashError.ITEM_NOT_ATTUNED]: 409,
  [StashError.ITEM_NOT_HELD]: 422,
  [StashError.ATTUNEMENT_NOT_REQUIRED]: 422,
};

const GRANT_ERROR: Record<GrantError, { text: string; status: number }> = {
  ARTIFACT_NOT_FOUND: { text: API_ERRORS.ARTIFACT_NOT_FOUND, status: 404 },
  ITEM_PROPERTY_NEEDS_BASE: { text: API_ERRORS.ITEM_PROPERTY_NEEDS_BASE, status: 422 },
  ITEM_BASE_MISMATCH: { text: API_ERRORS.ITEM_BASE_MISMATCH, status: 422 },
};

export async function applyStash(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const { isDM, userId } = access;

  const data = await parseBody(stashActionSchema, request);

  if (data instanceof NextResponse) return data;

  const character = await loadOwned(
    prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, status: true, resources: true } }),
    campaignId,
    API_ERRORS.CHARACTER_NOT_FOUND,
  );

  if (character instanceof NextResponse) return character;

  const allowed = canStashAction(data.action, { isDM, isOwner: character.controlledBy === userId, pending: character.status === CharacterStatus.PENDING });

  if (!allowed) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const rules = parseRules(access.campaign?.rules);

  if (data.action === "attune" || data.action === "unattune") {
    if (!rules.items.enabled) return errorResponse(API_ERRORS.ITEMS_DISABLED, 409);

    const inBattle = await rejectIfInActiveBattle(campaignId, [characterId]);

    if (inBattle) return inBattle;
  }

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const inv = await ensureInventory(tx, characterId);

    const state: StashState = {
      equipped: inv.equipped as EquippedItems,
      stash: normalizeStash(inv.stash),
      items: normalizeItems(inv.items),
      purse: { gp: inv.gold, sp: inv.silver, cp: inv.copper },
      attuned: attunedRefs(inv),
    };

    let artifactSlotType: string | undefined;

    let artifact: { slot: string; bonuses: unknown; modifiers: unknown } | undefined;

    let classesEnabled = false;

    let grantRow: Prisma.ArtifactGetPayload<{ select: typeof STASH_ROW_SELECT }> | undefined;

    let grant: GrantPlan | undefined;

    let items: { enabled: boolean; limit: number; attunable: boolean } | undefined;

    let name: string | undefined;

    if (data.action === "equip" || data.action === "grant") {
      const lookupId = data.action === "equip" ? (parseItemRef(data.artifactId)?.baseId ?? data.artifactId) : data.artifactId;

      const found = await tx.artifact.findFirst({ where: { id: lookupId, campaignId }, select: STASH_ROW_SELECT });

      if (!found) return errorResponse(API_ERRORS.ARTIFACT_NOT_FOUND, 404);

      artifact = found;
      grantRow = found;
      artifactSlotType = found.slot;

      if (data.action === "equip" && data.slot) {
        const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

        classesEnabled = parseRules(campaign?.rules).classes.enabled;
      }
    }

    if (data.action === "grant" && grantRow) {
      const base = data.baseId ? await tx.artifact.findFirst({ where: { id: data.baseId, campaignId }, select: STASH_ROW_SELECT }) : null;

      const rows = new Map([[data.artifactId, { ...grantRow, id: data.artifactId }], ...(base ? [[base.id, base] as const] : [])]);

      const planned = planGrant(data, rows);

      if (!planned.ok) {
        const { text, status } = GRANT_ERROR[planned.error];

        return errorResponse(text, status);
      }

      grant = planned.plan;

      if (grant.kind === "stash") {
        const all = await tx.characterInventory.findMany({
          where: { character: { campaignId } },
          select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } },
        });

        const holder = findHolder(
          all.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) })),
          grant.ref,
          undefined,
          uniqueChecker(rows),
        );

        if (holder) return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${all.find((o) => o.characterId === holder)?.character.name ?? ""}`, 409);
      }
    }

    if (data.action === "attune" || data.action === "unattune") {
      const refs = [...new Set([data.ref, ...(state.attuned ?? [])])];

      const foundRows = await tx.artifact.findMany({ where: { id: { in: [...new Set(refs.flatMap(refArtifactIds))] }, campaignId }, select: STASH_ROW_SELECT });

      const byId = new Map(foundRows.map((r) => [r.id, r]));

      state.attuned = pruneAttuned(state.attuned ?? [], state).filter((r) => resolveItemRow(r, byId) !== null);
      items = { enabled: true, limit: rules.items.attunementLimit, attunable: attunementRequired(data.ref, byId) };
      name = resolveItemRow(data.ref, byId)?.name;
    }

    const result = applyStashAction(state, data, { newItemId: randomUUID(), artifactSlotType, artifact, classesEnabled, grant, items, name, isDM });

    if (!result.ok) return errorResponse(STASH_ERROR_TEXT[result.error], STASH_ERROR_STATUS[result.error] ?? 400);

    const saved = await tx.characterInventory.update({
      where: { characterId },
      data: {
        equipped: result.state.equipped,
        stash: result.state.stash,
        items: result.state.items as unknown as Prisma.InputJsonValue,
        gold: result.state.purse.gp,
        silver: result.state.purse.sp,
        copper: result.state.purse.cp,
        attuned: result.state.attuned ?? [],
      },
    });

    await writeInventoryLog(tx, [{ campaignId, characterId, actorUserId: userId, ...result.log }]);

    return NextResponse.json(await buildStashView(tx, campaignId, saved, { rules, resources: character.resources }));
  });
}
