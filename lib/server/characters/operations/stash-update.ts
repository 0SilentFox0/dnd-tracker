import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { z } from "zod";

import { type CampaignScope, characterHandler, defineCharacterOperation, memberScope, orThrow } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { ensureInventory } from "@/lib/server/artifacts/inventory";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { buildStashView, STASH_ROW_SELECT } from "@/lib/server/characters/core/read-stash";
import { stashActionSchema } from "@/lib/server/characters/core/stash-schema";
import { ContentError } from "@/lib/server/content/errors";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import type { Actor } from "@/lib/utils/api/actor";
import { loadOwned } from "@/lib/utils/api/load-owned";
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
  ITEM_PARAMETER_REQUIRED: { text: API_ERRORS.ITEM_PARAMETER_REQUIRED, status: 422 },
  ITEM_PARAMETER_INVALID: { text: API_ERRORS.ITEM_PARAMETER_INVALID, status: 422 },
  ITEM_SPELL_REQUIRED: { text: API_ERRORS.ITEM_SPELL_REQUIRED, status: 422 },
  ITEM_SPELL_INVALID: { text: API_ERRORS.ITEM_SPELL_INVALID, status: 422 },
};

type Tx = Prisma.TransactionClient;

type StashData = z.infer<typeof stashActionSchema>;

type StashRow = Prisma.ArtifactGetPayload<{ select: typeof STASH_ROW_SELECT }>;

type Rules = ReturnType<typeof parseRules>;

const isAttuneAction = (data: StashData) => data.action === "attune" || data.action === "unattune";

async function loadStashState(tx: Tx, characterId: string) {
  const inv = await ensureInventory(tx, characterId);

  const state: StashState = {
    equipped: inv.equipped as EquippedItems,
    stash: normalizeStash(inv.stash),
    items: normalizeItems(inv.items),
    purse: { gp: inv.gold, sp: inv.silver, cp: inv.copper },
    attuned: attunedRefs(inv),
  };

  return state;
}

async function planStashGrant(tx: Tx, campaignId: string, data: Extract<StashData, { action: "grant" }>, grantRow: StashRow): Promise<GrantPlan> {
  const base = data.baseId ? await tx.artifact.findFirst({ where: { id: data.baseId, campaignId }, select: STASH_ROW_SELECT }) : null;

  const rows = new Map([[data.artifactId, { ...grantRow, id: data.artifactId }], ...(base ? [[base.id, base] as const] : [])]);

  const planned = planGrant(data, rows);

  if (!planned.ok) {
    const { text, status } = GRANT_ERROR[planned.error];

    throw new ContentError(text, status);
  }

  const grant = planned.plan;

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

    if (holder) throw new ContentError(API_ERRORS.ARTIFACT_HELD_BY_OTHER_DETAIL, 409, undefined, { detail: all.find((o) => o.characterId === holder)?.character.name ?? "" });
  }

  return grant;
}

async function attuneContext(tx: Tx, campaignId: string, data: Extract<StashData, { action: "attune" | "unattune" }>, state: StashState, rules: Rules) {
  const refs = [...new Set([data.ref, ...(state.attuned ?? [])])];

  const foundRows = await tx.artifact.findMany({ where: { id: { in: [...new Set(refs.flatMap(refArtifactIds))] }, campaignId }, select: STASH_ROW_SELECT });

  const byId = new Map(foundRows.map((r) => [r.id, r]));

  state.attuned = pruneAttuned(state.attuned ?? [], state).filter((r) => resolveItemRow(r, byId) !== null);

  return { items: { enabled: true, limit: rules.items.attunementLimit, attunable: attunementRequired(data.ref, byId) }, name: resolveItemRow(data.ref, byId)?.name };
}

async function buildActionContext(tx: Tx, scope: { campaignId: string; rules: Rules; isDM: boolean }, data: StashData, state: StashState) {
  const { campaignId, rules, isDM } = scope;

  let artifactSlotType: string | undefined;

  let artifact: StashRow | undefined;

  let classesEnabled = false;

  let grant: GrantPlan | undefined;

  let items: { enabled: boolean; limit: number; attunable: boolean } | undefined;

  let name: string | undefined;

  if (data.action === "equip" || data.action === "grant") {
    const lookupId = data.action === "equip" ? (parseItemRef(data.artifactId)?.baseId ?? data.artifactId) : data.artifactId;

    const found = await tx.artifact.findFirst({ where: { id: lookupId, campaignId }, select: STASH_ROW_SELECT });

    if (!found) throw new ContentError(API_ERRORS.ARTIFACT_NOT_FOUND, 404);

    artifact = found;
    artifactSlotType = found.slot;

    if (data.action === "equip" && data.slot) classesEnabled = rules.classes.enabled;

    if (data.action === "grant") grant = await planStashGrant(tx, campaignId, data, found);
  }

  if (data.action === "attune" || data.action === "unattune") ({ items, name } = await attuneContext(tx, campaignId, data, state, rules));

  return { newItemId: randomUUID(), artifactSlotType, artifact, classesEnabled, grant, items, name, isDM };
}

async function applyStashCore({ access, campaignId, characterId }: CampaignScope, data: StashData) {
  const { isDM, userId } = access;

  const character = await orThrow(loadOwned(
    prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, status: true, resources: true } }),
    campaignId,
    API_ERRORS.CHARACTER_NOT_FOUND,
  ));

  const allowed = canStashAction(data.action, { isDM, isOwner: character.controlledBy === userId, pending: character.status === CharacterStatus.PENDING });

  if (!allowed) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  const rules = parseRules(access.campaign?.rules);

  if (isAttuneAction(data)) {
    if (!rules.items.enabled) throw new ContentError(API_ERRORS.ITEMS_DISABLED, 409);

    await assertNotInActiveBattle(campaignId, [characterId]);
  }

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const state = await loadStashState(tx, characterId);

    const context = await buildActionContext(tx, { campaignId, rules, isDM }, data, state);

    const result = applyStashAction(state, data, context);

    if (!result.ok) throw new ContentError(STASH_ERROR_TEXT[result.error], STASH_ERROR_STATUS[result.error] ?? 400);

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

    return buildStashView(tx, campaignId, saved, { rules, resources: character.resources });
  });
}

export const stashUpdateOperation = defineCharacterOperation({
  name: "stash-update",
  action: "apply stash action",
  schema: stashActionSchema,
  gate: memberScope,
  run: applyStashCore,
});

const stash = characterHandler(stashUpdateOperation);

export const applyStash = (request: Request, campaignId: string, characterId: string, actor?: Actor) => stash(request, campaignId, characterId, actor);
