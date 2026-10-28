import { NextResponse } from "next/server";
import { z } from "zod";

import { runChat } from "@/lib/ai/chat/run-chat";
import { isAiConfigured } from "@/lib/ai/crypto";
import { discardGeneratedImage } from "@/lib/ai/generated-images";
import { guarded } from "@/lib/ai/guarded";
import { AiImageError, generateSlideImage } from "@/lib/ai/images";
import { applyProposal, listProposals, listProposalSummaries, rejectProposal } from "@/lib/ai/proposals";
import { getAiSettings, saveAiSettings } from "@/lib/ai/settings";
import { createThread, deleteThread, listThreads, loadMessages, loadThread, patchThread, resolveDefaultModel,slimToolOutputs } from "@/lib/ai/threads";
import { AI_LIMITS, AI_PROPOSAL_STATUSES, isKnownImageModel, isKnownModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { aiSettingsSchema, chatRequestSchema, createThreadSchema, discardGeneratedImageSchema, generateSlideImageSchema, patchThreadSchema } from "@/lib/schemas/ai";
import { cancelAssistantRun, readAssistantRuns } from "@/lib/server/assistant/runs";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function aiGuard(campaignId: string) {
  if (!isAiConfigured()) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED, 503);

  return requireDM(campaignId);
}

const listQuery = z.object({ pageId: z.string().min(1).max(40).optional(), status: z.enum(AI_PROPOSAL_STATUSES).optional(), summary: z.literal("1").optional(), workspace: z.literal("true").optional() });

export const listProposalsHandler = (req: Request, campaignId: string) =>
  guarded("list ai proposals", () => requireDM(campaignId), async (access) => {
    const query = listQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));

    if (!query.success) return errorResponse(API_ERRORS.INVALID_QUERY, 400, query.error.issues);

    const { summary, workspace, ...filter } = query.data;

    if (summary) return NextResponse.json(await listProposalSummaries(campaignId, filter));

    const proposals = await listProposals(campaignId, filter);

    if (!workspace) return NextResponse.json(proposals);

    const links = await prisma.assistantIntent.findMany({ where: { campaignId, userId: access.userId, legacyProposalId: { in: proposals.map(p => p.id) } }, select: { id: true, legacyProposalId: true } });

    return NextResponse.json(proposals.map(p => ({ ...p, assistantIntentId: links.find(link => link.legacyProposalId === p.id)?.id })), { headers: PRIVATE_NO_STORE_HEADERS });
  });

export const applyProposalHandler = (campaignId: string, proposalId: string) =>
  guarded("apply ai proposal", () => requireDM(campaignId), async (access) => {
    const result = await applyProposal(campaignId, access.userId, proposalId);

    return result.ok ? NextResponse.json("deck" in result ? { deck: result.deck } : result.page) : errorResponse(result.error, result.status);
  });

export const rejectProposalHandler = (campaignId: string, proposalId: string) =>
  guarded("reject ai proposal", () => requireDM(campaignId), async () => {
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

    return NextResponse.json({ thread, messages: slimToolOutputs(await loadMessages(threadId, AI_LIMITS.historyMessages * 2)) });
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

    return runChat({ campaignId, userId: access.userId, threadId, requestId: body.requestId, text: body.text, focus: body.focus, sessionContext: body.sessionContext, abortSignal: req.signal });
  });

export const generateSlideImageHandler = (req: Request, campaignId: string) =>
  guarded("generate slide image", () => aiGuard(campaignId), async (access) => {
    const body = await parseBody(generateSlideImageSchema, req);

    if (body instanceof NextResponse) return body;

    if (!isKnownImageModel(body.provider, body.model)) return errorResponse(API_ERRORS.AI_MODEL_UNKNOWN, 400);

    try {
      return NextResponse.json(await generateSlideImage({ ...body, campaignId, userId: access.userId }));
    } catch (error) {
      if (error instanceof AiImageError) return errorResponse(error.message, error.status);

      throw error;
    }
  });

export const discardGeneratedImageHandler = (req: Request, campaignId: string) =>
  guarded("discard generated image", () => requireDM(campaignId), async () => {
    const body = await parseBody(discardGeneratedImageSchema, req);

    if (body instanceof NextResponse) return body;

    const outcome = await discardGeneratedImage(campaignId, body.url);

    return outcome === "foreign" ? errorResponse(API_ERRORS.AI_IMAGE_NOT_OWNED, 400) : NextResponse.json({ removed: outcome === "removed" });
  });

const chatCaller = (campaignId: string, userId: string, threadId: string): AssistantCaller => ({ actor: { campaignId, userId, isDM: true, via: "session", scopes: null }, channel: "chat", threadId, tokenId: null });

export const recoverChatHandler = (campaignId: string, threadId: string, requestId?: string) =>
  guarded("recover ai chat", () => requireDM(campaignId), async access => runResponse(async () => {
    const caller = chatCaller(campaignId, access.userId, threadId);

    const state = requestId ? await readAssistantRuns(caller, requestId) : await readAssistantRuns(caller);

    return NextResponse.json({ ...state, messages: slimToolOutputs(await loadMessages(threadId, AI_LIMITS.historyMessages * 2)) });
  }));
export const cancelChatHandler = (req: Request, campaignId: string, threadId: string) =>
  guarded("cancel ai chat", () => requireDM(campaignId), async access => runResponse(async () => {
    const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).safeParse(new URL(req.url).searchParams.get("requestId"));

    if (!id.success) return errorResponse("Некоректний ідентифікатор запиту", 400);

    const state = await cancelAssistantRun(chatCaller(campaignId, access.userId, threadId), id.data);

    return NextResponse.json({ ...state, messages: slimToolOutputs(await loadMessages(threadId, AI_LIMITS.historyMessages * 2)) });
  }));

async function runResponse(run: () => Promise<Response>): Promise<Response> {
  try { const response = await run();

    response.headers.set("cache-control", PRIVATE_NO_STORE_HEADERS["Cache-Control"]);

    return response; }
  catch (error) {
    if (error instanceof ContentError) {
      const response = errorResponse(error.message, error.status);

      response.headers.set("cache-control", PRIVATE_NO_STORE_HEADERS["Cache-Control"]);

      return response;
    }

    throw error;
  }
}
