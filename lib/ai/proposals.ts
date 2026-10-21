import type { Prisma } from "@prisma/client";

import "server-only";
import type { AiToolContext } from "@/lib/ai/tools/define";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { contentWrite, OWNED_WITH_CONTENT_SELECT, readContentStrict, toPage } from "@/lib/server/scenario/page-store";
import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";
import { applyAiOps } from "@/lib/utils/scenario/ai-ops";
import type { AiProposal, AiProposalStatus, ScenarioAiOp } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const SELECT = { id: true, pageId: true, threadId: true, summary: true, ops: true, status: true, appliedVersion: true, createdAt: true } as const;

type Row = Prisma.AiProposalGetPayload<{ select: typeof SELECT }>;

const toProposal = (r: Row): AiProposal => ({ ...r, ops: r.ops as unknown as ScenarioAiOp[], status: r.status as AiProposalStatus, createdAt: r.createdAt.toISOString() });

export async function createProposal(ctx: AiToolContext, pageId: string, summary: string, ops: ScenarioAiOp[]): Promise<AiProposal> {
  const row = await prisma.aiProposal.create({ data: { campaignId: ctx.campaignId, threadId: ctx.threadId, pageId, summary, ops: ops as unknown as Prisma.InputJsonValue }, select: SELECT });

  return toProposal(row);
}

export async function listProposals(campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }): Promise<AiProposal[]> {
  const rows = await prisma.aiProposal.findMany({ where: { campaignId, ...filter }, select: SELECT, orderBy: { createdAt: "desc" }, take: 50 });

  return rows.map(toProposal);
}

type ApplyResult = { ok: true; page: ScenarioPage } | { ok: false; status: 400 | 404 | 409 | 413; error: string };

export async function applyProposal(campaignId: string, userId: string, proposalId: string): Promise<ApplyResult> {
  return prisma.$transaction(async (tx): Promise<ApplyResult> => {
    const proposal = await tx.aiProposal.findFirst({ where: { id: proposalId, campaignId }, select: SELECT });

    if (!proposal) return { ok: false, status: 404, error: API_ERRORS.AI_PROPOSAL_NOT_FOUND };

    if (proposal.status !== "pending") return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE };

    const page = await tx.scenarioPage.findFirst({ where: { id: proposal.pageId, campaignId }, select: OWNED_WITH_CONTENT_SELECT });

    if (!page) return { ok: false, status: 404, error: API_ERRORS.SCENARIO_NOT_FOUND };

    const applied = applyAiOps(readContentStrict(page.content), proposal.ops as unknown as ScenarioAiOp[]);

    if (!applied.ok) {
      await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "stale" } });

      return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE };
    }

    if (!scenarioContentSchema.safeParse(applied.content).success) return { ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID };

    if (Buffer.byteLength(JSON.stringify(applied.content)) > SCENARIO_MAX_CONTENT_BYTES) return { ok: false, status: 413, error: API_ERRORS.SCENARIO_TOO_LARGE };

    await snapshotIfDue(tx, page.id, userId, { force: true });
    await pruneVersions(tx, page.id);

    const { count } = await tx.scenarioPage.updateMany({ where: { id: page.id, version: page.version }, data: { ...contentWrite(page.title, applied.content), version: { increment: 1 } } });

    if (count === 0) return { ok: false, status: 409, error: API_ERRORS.SCENARIO_CONFLICT };

    await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "applied", appliedVersion: page.version + 1 } });

    return { ok: true, page: toPage({ ...page, content: applied.content, version: page.version + 1, updatedAt: new Date() }) };
  });
}

export async function rejectProposal(campaignId: string, proposalId: string): Promise<AiProposal | null> {
  const { count } = await prisma.aiProposal.updateMany({ where: { id: proposalId, campaignId, status: { in: ["pending", "stale"] } }, data: { status: "rejected" } });

  if (count === 0) return null;

  const row = await prisma.aiProposal.findUnique({ where: { id: proposalId }, select: SELECT });

  return row && toProposal(row);
}
