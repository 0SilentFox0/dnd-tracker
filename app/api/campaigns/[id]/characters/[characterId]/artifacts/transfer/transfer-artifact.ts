import { NextResponse } from "next/server";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { InventoryLogKind } from "@/lib/constants/inventory";
import { prisma } from "@/lib/db";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { planTransfer, TransferError, type TransferErrorCode } from "@/lib/utils/artifacts/ownership";
import { normalizeStash } from "@/lib/utils/inventory/items";
import type { EquippedItems } from "@/types/inventory";

const transferSchema = z
  .object({ toCharacterId: z.string().min(1), slot: z.string().min(1).optional(), artifactId: z.string().min(1).optional() })
  .refine((d) => !!d.slot !== !!d.artifactId);

const ERROR_TEXT: Record<TransferErrorCode, string> = {
  [TransferError.EMPTY_SLOT]: API_ERRORS.ARTIFACT_SLOT_EMPTY,
  [TransferError.SAME_CHARACTER]: API_ERRORS.ARTIFACT_TRANSFER_SELF,
  [TransferError.UNKNOWN_SLOT]: API_ERRORS.ARTIFACT_UNKNOWN_SLOT,
  [TransferError.NOT_IN_STASH]: API_ERRORS.ARTIFACT_NOT_IN_STASH,
};

const characterSelect = { id: true, campaignId: true, controlledBy: true, status: true } as const;

export async function transferArtifact(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const data = await parseBody(transferSchema, request);

  if (data instanceof NextResponse) return data;

  const from = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (from instanceof NextResponse) return from;

  if (!access.isDM && (from.controlledBy !== access.userId || from.status === CharacterStatus.PENDING)) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const to = await loadOwned(prisma.character.findUnique({ where: { id: data.toCharacterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (to instanceof NextResponse) return to;

  if (to.status === CharacterStatus.PENDING) return errorResponse(API_ERRORS.CHARACTER_NOT_FOUND, 404);

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const fromInv = await ensureInventory(tx, from.id);

    const toInv = await ensureInventory(tx, to.id);

    const plan = planTransfer({
      from: { characterId: from.id, equipped: fromInv.equipped as EquippedItems, stash: normalizeStash(fromInv.stash) },
      to: { characterId: to.id, equipped: toInv.equipped as EquippedItems, stash: normalizeStash(toInv.stash) },
      source: data.slot ? { slot: data.slot } : { artifactId: data.artifactId as string },
    });

    if (!plan.ok) return errorResponse(ERROR_TEXT[plan.error], 400);

    const fromSaved = await tx.characterInventory.update({ where: { characterId: from.id }, data: { equipped: plan.fromEquipped, stash: plan.fromStash } });

    const toSaved = await tx.characterInventory.update({ where: { characterId: to.id }, data: { stash: plan.toStash } });

    const base = { campaignId, actorUserId: access.userId, kind: InventoryLogKind.ARTIFACT_TRANSFER, note: null };

    await writeInventoryLog(tx, [
      { ...base, characterId: from.id, delta: { artifactId: plan.artifactId, toCharacterId: to.id } },
      { ...base, characterId: to.id, delta: { artifactId: plan.artifactId, fromCharacterId: from.id } },
    ]);

    return NextResponse.json({ from: fromSaved, to: toSaved });
  });
}
