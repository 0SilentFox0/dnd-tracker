import type { Prisma } from "@prisma/client";

import { authorizeAssistant } from "./authorize";
import { intentSummary, requestDigest } from "./intent-store";
import type { ActionPreview, ActionResult,AssistantCaller } from "./types";

import "server-only";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { scenarioResult,scenarioState } from "@/lib/server/scenario/action-service";

const need = { access: "dm" as const, scope: "scenario:write" as const, sessionOnly: true as const };

export async function legacyPreview(caller: AssistantCaller, proposalId: string): Promise<ActionPreview> {
  const proposal = await prisma.aiProposal.findFirst({ where: { id: proposalId, campaignId: caller.actor.campaignId }, select: { id: true, pageId: true, summary: true, ops: true, status: true } });

  if (!proposal) throw new ContentError("Пропозицію не знайдено", 404);

  if (proposal.status !== "pending") throw new ContentError("Пропозиція вже завершена", 409);

  const state = await scenarioState(caller.actor, proposal.pageId);

  const target = { domain: "scenario", id: proposal.pageId, name: state.page?.title ?? "Сценарій" };

  return { summary: proposal.summary, targets: [target], changes: [{ target, path: "ops", before: scenarioResult(state.page).data, after: proposal.ops }], warnings: [], effects: [{ kind: "update", targets: [target], description: proposal.summary }], preconditions: { fingerprint: requestDigest({ proposal, state }) } };
}
export async function linkLegacyProposal(caller: AssistantCaller, proposalId: string) {
  // Old proposals have no trusted originating token identity. Only a real DM session may claim them.
  if (caller.actor.via !== "session") throw new ContentError("Потрібна сесія ДМ", 403);

  return withCampaignContentWrite(caller.actor.campaignId, async tx => {
    await authorizeAssistant(caller, need, "execute", tx);

    const existing = await tx.assistantIntent.findUnique({ where: { legacyProposalId: proposalId } });

    if (existing) {
      if (existing.campaignId !== caller.actor.campaignId || existing.userId !== caller.actor.userId) throw new ContentError("Дія недоступна", 403);

      return intentSummary(existing);
    }

    const preview = await legacyPreview(caller, proposalId);

    const originKey = requestDigest({ legacy: proposalId, campaignId: caller.actor.campaignId });

    const payload = { proposalId };

    const row = await tx.assistantIntent.create({ data: { campaignId: caller.actor.campaignId, userId: caller.actor.userId, channel: "chat", originKey, requestId: proposalId, requestHash: requestDigest({ actionId: "scenario.legacy-proposal", input: payload }), actionId: "scenario.legacy-proposal", legacyProposalId: proposalId, summary: preview.summary, targets: preview.targets, payload, preview: preview as Prisma.InputJsonValue, expected: preview.preconditions as Prisma.InputJsonValue, status: "pending", expiresAt: new Date(Date.now() + 15 * 60_000) } });

    return intentSummary(row);
  });
}
export async function reconcileLegacyProposal(tx: Prisma.TransactionClient, campaignId: string, proposalId: string, status: "applied" | "rejected" | "stale", result: ActionResult | null = null, executingIntentId?: string) {
  const linked = await tx.assistantIntent.findUnique({ where: { legacyProposalId: proposalId } });

  if (!linked || linked.campaignId !== campaignId) return;

  await tx.assistantIntent.update({ where: { id: linked.id }, data: { status } });

  if (status !== "applied" || linked.id === executingIntentId) return;

  await tx.assistantReceipt.upsert({ where: { intentId: linked.id }, update: {}, create: { intentId: linked.id, campaignId, userId: linked.userId, originTokenId: linked.originTokenId, originKey: linked.originKey, requestId: linked.requestId, requestHash: linked.requestHash, actionId: linked.actionId, status, result: result as Prisma.InputJsonValue, effects: { items: [], completed: [] }, effectsStatus: "complete" } });
}

/** Called by T14's queue adapter once its complete executable catalog is installed. */
export async function stageLegacyProposals(caller: AssistantCaller) {
  if (caller.actor.via !== "session") return [];

  const proposals = await prisma.aiProposal.findMany({ where: { campaignId: caller.actor.campaignId, status: "pending" }, select: { id: true }, orderBy: { createdAt: "desc" }, take: 50 });

  const summaries = [];

  for (const proposal of proposals) summaries.push(await linkLegacyProposal(caller, proposal.id));

  return summaries;
}
