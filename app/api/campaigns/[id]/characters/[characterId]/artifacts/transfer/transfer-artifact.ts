import { NextResponse } from "next/server";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/utils/artifacts/lock";
import { planTransfer, TransferError, type TransferErrorCode } from "@/lib/utils/artifacts/ownership";
import type { EquippedItems } from "@/types/inventory";

const transferSchema = z.object({ slot: z.string().min(1), toCharacterId: z.string().min(1) });

const ERROR_TEXT: Record<TransferErrorCode, string> = {
  [TransferError.EMPTY_SLOT]: API_ERRORS.ARTIFACT_SLOT_EMPTY,
  [TransferError.SAME_CHARACTER]: API_ERRORS.ARTIFACT_TRANSFER_SELF,
  [TransferError.UNKNOWN_SLOT]: API_ERRORS.ARTIFACT_UNKNOWN_SLOT,
};

const characterSelect = { id: true, campaignId: true, controlledBy: true } as const;

export async function transferArtifact(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const data = await parseBody(transferSchema, request);

  if (data instanceof NextResponse) return data;

  const from = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (from instanceof NextResponse) return from;

  if (!access.isDM && from.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const to = await loadOwned(prisma.character.findUnique({ where: { id: data.toCharacterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (to instanceof NextResponse) return to;

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const fromInv = await ensureInventory(tx, from.id);

    const toInv = await ensureInventory(tx, to.id);

    const plan = planTransfer({
      from: { characterId: from.id, equipped: fromInv.equipped as EquippedItems },
      to: { characterId: to.id, equipped: toInv.equipped as EquippedItems },
      slot: data.slot,
    });

    if (!plan.ok) return errorResponse(ERROR_TEXT[plan.error], 400);

    const fromSaved = await tx.characterInventory.update({ where: { characterId: from.id }, data: { equipped: plan.fromEquipped } });

    const toSaved = await tx.characterInventory.update({ where: { characterId: to.id }, data: { equipped: plan.toEquipped } });

    return NextResponse.json({ from: fromSaved, to: toSaved });
  });
}
