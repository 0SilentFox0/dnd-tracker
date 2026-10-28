import { z } from "zod";

import { type CampaignScope, characterHandler, defineCharacterOperation, memberScope, orThrow } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { InventoryLogKind } from "@/lib/constants/inventory";
import { prisma } from "@/lib/db";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { ContentError } from "@/lib/server/content/errors";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import type { Actor } from "@/lib/utils/api/actor";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { planTransfer, TransferError, type TransferErrorCode } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import { pruneAttuned } from "@/lib/utils/items/resolve";
import type { EquippedItems } from "@/types/inventory";

export const transferSchema = z
  .object({ toCharacterId: z.string().min(1), slot: z.string().min(1).optional(), artifactId: z.string().min(1).optional() })
  .refine((d) => !!d.slot !== !!d.artifactId);

const ERROR_TEXT: Record<TransferErrorCode, string> = {
  [TransferError.EMPTY_SLOT]: API_ERRORS.ARTIFACT_SLOT_EMPTY,
  [TransferError.SAME_CHARACTER]: API_ERRORS.ARTIFACT_TRANSFER_SELF,
  [TransferError.UNKNOWN_SLOT]: API_ERRORS.ARTIFACT_UNKNOWN_SLOT,
  [TransferError.NOT_IN_STASH]: API_ERRORS.ARTIFACT_NOT_IN_STASH,
};

const characterSelect = { id: true, campaignId: true, controlledBy: true, status: true, type: true } as const;

async function transferCore({ access, campaignId, characterId }: CampaignScope, data: z.infer<typeof transferSchema>) {
  const from = await orThrow(loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND));

  if (!access.isDM && (from.controlledBy !== access.userId || from.status === CharacterStatus.PENDING)) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  const to = await orThrow(loadOwned(prisma.character.findUnique({ where: { id: data.toCharacterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND));

  if (to.status === CharacterStatus.PENDING) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

  if (!access.isDM && to.type !== CharacterType.PLAYER) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const fromInv = await ensureInventory(tx, from.id);

    const toInv = await ensureInventory(tx, to.id);

    const plan = planTransfer({
      from: { characterId: from.id, equipped: fromInv.equipped as EquippedItems, stash: normalizeStash(fromInv.stash) },
      to: { characterId: to.id, equipped: toInv.equipped as EquippedItems, stash: normalizeStash(toInv.stash) },
      source: data.slot ? { slot: data.slot } : { artifactId: data.artifactId as string },
    });

    if (!plan.ok) throw new ContentError(ERROR_TEXT[plan.error], 400);

    if (normalizeStash(toInv.stash).includes(plan.artifactId)) throw new ContentError(API_ERRORS.ITEM_ALREADY_IN_STASH, 409);

    const attunedBefore = normalizeStash(fromInv.attuned);

    const attuned = pruneAttuned(attunedBefore, { equipped: plan.fromEquipped, stash: plan.fromStash });

    const fromSaved = await tx.characterInventory.update({ where: { characterId: from.id }, data: { equipped: plan.fromEquipped, stash: plan.fromStash, ...(attuned.length !== attunedBefore.length && { attuned }) } });

    const toSaved = await tx.characterInventory.update({ where: { characterId: to.id }, data: { stash: plan.toStash } });

    const base = { campaignId, actorUserId: access.userId, kind: InventoryLogKind.ARTIFACT_TRANSFER, note: null };

    await writeInventoryLog(tx, [
      { ...base, characterId: from.id, delta: { artifactId: plan.artifactId, toCharacterId: to.id } },
      { ...base, characterId: to.id, delta: { artifactId: plan.artifactId, fromCharacterId: from.id } },
    ]);

    return { from: fromSaved, to: toSaved };
  });
}

export const transferOperation = defineCharacterOperation({
  name: "transfer",
  action: "transfer artifact",
  schema: transferSchema,
  gate: memberScope,
  run: transferCore,
});

const transfer = characterHandler(transferOperation);

export const transferArtifact = (request: Request, campaignId: string, characterId: string, actor?: Actor) => transfer(request, campaignId, characterId, actor);
