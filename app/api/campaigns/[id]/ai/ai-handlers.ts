import { NextResponse } from "next/server";
import { z } from "zod";

import { isAiConfigured } from "@/lib/ai/crypto";
import { applyProposal, listProposals, rejectProposal } from "@/lib/ai/proposals";
import { createThread, deleteThread, listThreads, loadMessages, loadThread, patchThread, resolveDefaultModel } from "@/lib/ai/threads";
import { AI_LIMITS, AI_PROPOSAL_STATUSES, isKnownModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createThreadSchema, patchThreadSchema } from "@/lib/schemas/ai";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

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

export async function listThreadsHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const pageId = new URL(req.url).searchParams.get("pageId") ?? undefined;

    return NextResponse.json(await listThreads(campaignId, access.userId, pageId));
  } catch (error) {
    return handleApiError(error, { action: "list ai threads" });
  }
}

export async function createThreadHandler(req: Request, campaignId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createThreadSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.model && !isKnownModel(body.provider, body.model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    if (body.scenarioPageId && !(await prisma.scenarioPage.findFirst({ where: { id: body.scenarioPageId, campaignId }, select: { id: true } }))) return errorResponse(API_ERRORS.SCENARIO_NOT_FOUND, 404);

    return NextResponse.json(await createThread(campaignId, access.userId, body), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create ai thread" });
  }
}

export async function patchThreadHandler(req: Request, campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(patchThreadSchema, req);

    if (body instanceof NextResponse) return body;

    const current = await loadThread(campaignId, access.userId, threadId);

    if (!current) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    const provider = body.provider ?? current.provider;

    // switching provider without a model picks the key's default model, else the mode default
    const model = body.model ?? (provider === current.provider ? current.model : await resolveDefaultModel(access.userId, provider, current.mode));

    if (!isKnownModel(provider, model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    return NextResponse.json(await patchThread(campaignId, access.userId, threadId, { ...body, provider, model }));
  } catch (error) {
    return handleApiError(error, { action: "patch ai thread" });
  }
}

export async function deleteThreadHandler(campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    return (await deleteThread(campaignId, access.userId, threadId)) ? NextResponse.json({ ok: true }) : errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);
  } catch (error) {
    return handleApiError(error, { action: "delete ai thread" });
  }
}

export async function listMessagesHandler(campaignId: string, threadId: string) {
  try {
    const access = await aiGuard(campaignId);

    if (access instanceof NextResponse) return access;

    const thread = await loadThread(campaignId, access.userId, threadId);

    if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    return NextResponse.json({ thread, messages: await loadMessages(threadId, AI_LIMITS.historyMessages * 2) });
  } catch (error) {
    return handleApiError(error, { action: "list ai messages" });
  }
}
