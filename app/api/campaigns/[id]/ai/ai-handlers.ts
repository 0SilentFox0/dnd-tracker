import { NextResponse } from "next/server";
import { z } from "zod";

import { isAiConfigured } from "@/lib/ai/crypto";
import { applyProposal, listProposals, rejectProposal } from "@/lib/ai/proposals";
import { AI_PROPOSAL_STATUSES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function aiGuard(campaignId: string) {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  return requireDM(campaignId);
}

const listQuery = z.object({ pageId: z.string().min(1).max(40).optional(), status: z.enum(AI_PROPOSAL_STATUSES).optional() });

export async function listProposalsHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const query = listQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));

    if (!query.success) return errorResponse(API_ERRORS.INVALID_QUERY, 400, query.error.issues);

    return NextResponse.json(await listProposals(campaignId, query.data));
  } catch (error) {
    return handleApiError(error, { action: "list ai proposals" });
  }
}

export async function applyProposalHandler(campaignId: string, proposalId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const result = await applyProposal(campaignId, access.userId, proposalId);

    return result.ok ? NextResponse.json(result.page) : errorResponse(result.error, result.status);
  } catch (error) {
    return handleApiError(error, { action: "apply ai proposal" });
  }
}

export async function rejectProposalHandler(campaignId: string, proposalId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const row = await rejectProposal(campaignId, proposalId);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.AI_PROPOSAL_DONE, 409);
  } catch (error) {
    return handleApiError(error, { action: "reject ai proposal" });
  }
}
