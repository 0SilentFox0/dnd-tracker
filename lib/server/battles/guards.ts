import type { PrismaClient } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import type { ActionExecutionContext } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { currentContentWrite } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";

export function assertExecutionScope(actor: Actor, execution: { actor: Actor; tx: unknown } | undefined, tx: unknown): void {
  if (!execution) return;

  if (execution.actor.userId !== actor.userId || execution.actor.campaignId !== actor.campaignId) throw new ContentError(API_ERRORS.ACTOR_MISMATCH, 409);

  if (tx !== undefined && tx !== execution.tx) throw new ContentError(API_ERRORS.TX_MISMATCH, 409);
}

export function assertWriteScope(actor: Actor, execution?: ActionExecutionContext): void {
  const current = currentContentWrite();

  assertExecutionScope(actor, execution && { actor: execution.caller.actor, tx: execution.db }, current?.db);

  if (current && current.campaignId !== actor.campaignId) throw new ContentError(API_ERRORS.TX_MISMATCH, 409);
}

export async function requireDmMember(db: Pick<PrismaClient, "campaignMember">, actor: Actor): Promise<void> {
  const member = await db.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: actor.campaignId, userId: actor.userId } } });

  if (member?.role !== CampaignRole.DM) throw new ContentError(API_ERRORS.DM_ONLY, 403);
}
