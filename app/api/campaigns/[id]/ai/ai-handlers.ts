import { NextResponse } from "next/server";
import { z } from "zod";

import { runChat } from "@/lib/ai/chat/run-chat";
import { isAiConfigured } from "@/lib/ai/crypto";
import { guarded } from "@/lib/ai/guarded";
import { applyProposal, listProposals, rejectProposal } from "@/lib/ai/proposals";
import { getAiSettings, saveAiSettings } from "@/lib/ai/settings";
import { createThread, deleteThread, listThreads, loadMessages, loadThread, patchThread, resolveDefaultModel } from "@/lib/ai/threads";
import { AI_LIMITS, AI_PROPOSAL_STATUSES, isKnownModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { aiSettingsSchema, chatRequestSchema, createThreadSchema, patchThreadSchema } from "@/lib/schemas/ai";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function aiGuard(campaignId: string) {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  return requireDM(campaignId);
}

const listQuery = z.object({ pageId: z.string().min(1).max(40).optional(), status: z.enum(AI_PROPOSAL_STATUSES).optional() });

export const listProposalsHandler = (req: Request, campaignId: string) =>
  guarded("list ai proposals", () => aiGuard(campaignId), async () => {
    const query = listQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));

    if (!query.success) return errorResponse(API_ERRORS.INVALID_QUERY, 400, query.error.issues);

    return NextResponse.json(await listProposals(campaignId, query.data));
  });

export const applyProposalHandler = (campaignId: string, proposalId: string) =>
  guarded("apply ai proposal", () => aiGuard(campaignId), async (access) => {
    const result = await applyProposal(campaignId, access.userId, proposalId);

    return result.ok ? NextResponse.json(result.page) : errorResponse(result.error, result.status);
  });

export const rejectProposalHandler = (campaignId: string, proposalId: string) =>
  guarded("reject ai proposal", () => aiGuard(campaignId), async () => {
    const row = await rejectProposal(campaignId, proposalId);

    return row ? NextResponse.json(row) : errorResponse(API_ERRORS.AI_PROPOSAL_DONE, 409);
  });

export const listThreadsHandler = (req: Request, campaignId: string) =>
  guarded("list ai threads", () => aiGuard(campaignId), async (access) => {
    const pageId = new URL(req.url).searchParams.get("pageId") ?? undefined;

    return NextResponse.json(await listThreads(campaignId, access.userId, pageId));
  });

export const createThreadHandler = (req: Request, campaignId: string) =>
  guarded("create ai thread", () => aiGuard(campaignId), async (access) => {
    const body = await parseBody(createThreadSchema, req);

    if (body instanceof NextResponse) return body;

    if (body.model && !isKnownModel(body.provider, body.model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    if (body.scenarioPageId && !(await prisma.scenarioPage.findFirst({ where: { id: body.scenarioPageId, campaignId }, select: { id: true } }))) {
      return errorResponse(API_ERRORS.SCENARIO_NOT_FOUND, 404);
    }

    return NextResponse.json(await createThread(campaignId, access.userId, body), { status: 201 });
  });

export const patchThreadHandler = (req: Request, campaignId: string, threadId: string) =>
  guarded("patch ai thread", () => aiGuard(campaignId), async (access) => {
    const body = await parseBody(patchThreadSchema, req);

    if (body instanceof NextResponse) return body;

    const current = await loadThread(campaignId, access.userId, threadId);

    if (!current) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    const provider = body.provider ?? current.provider;

    const model = body.model ?? (provider === current.provider ? current.model : await resolveDefaultModel(access.userId, provider, current.mode));

    if (!isKnownModel(provider, model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    return NextResponse.json(await patchThread(campaignId, access.userId, threadId, { ...body, provider, model }));
  });

export const deleteThreadHandler = (campaignId: string, threadId: string) =>
  guarded("delete ai thread", () => aiGuard(campaignId), async (access) =>
    (await deleteThread(campaignId, access.userId, threadId)) ? NextResponse.json({ ok: true }) : errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404));

export const listMessagesHandler = (campaignId: string, threadId: string) =>
  guarded("list ai messages", () => aiGuard(campaignId), async (access) => {
    const thread = await loadThread(campaignId, access.userId, threadId);

    if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

    return NextResponse.json({ thread, messages: await loadMessages(threadId, AI_LIMITS.historyMessages * 2) });
  });

export const getSettingsHandler = (campaignId: string) =>
  guarded("get ai settings", () => requireDM(campaignId), async () => NextResponse.json(await getAiSettings(campaignId)));

export const putSettingsHandler = (req: Request, campaignId: string) =>
  guarded("save ai settings", () => requireDM(campaignId), async () => {
    const body = await parseBody(aiSettingsSchema, req);

    if (body instanceof NextResponse) return body;

    return NextResponse.json(await saveAiSettings(campaignId, body.instructions.trim() || null));
  });

export const chatHandler = (req: Request, campaignId: string, threadId: string) =>
  guarded("ai chat", () => aiGuard(campaignId), async (access) => {
    const body = await parseBody(chatRequestSchema, req);

    if (body instanceof NextResponse) return body;

    return runChat({ campaignId, userId: access.userId, threadId, text: body.text, focus: body.focus, abortSignal: req.signal });
  });
