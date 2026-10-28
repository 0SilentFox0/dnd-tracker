import { APICallError, consumeStream, convertToModelMessages, createUIMessageStreamResponse, isStepCount, type LanguageModel, streamText, toUIMessageStream, type UIMessage } from "ai";

import "server-only";
import { buildInstructions } from "@/lib/ai/context/prompt";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { aiErrorMessage } from "@/lib/ai/errors";
import { createModel } from "@/lib/ai/providers";
import { appendMessage, loadMessages, loadThread } from "@/lib/ai/threads";
import { toAiSdkTools } from "@/lib/ai/tools";
import { publicToolData } from "@/lib/ai/tools/projection";
import { AI_LIMITS, API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { beginAssistantRun, createRunSignal, finishAssistantRun, isAssistantRunCancelled, readAssistantRuns, recordAssistantRunUsage, RUN_GRACE_MS } from "@/lib/server/assistant/runs";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import type { AiChatMessage, AiFocus, AiMessageMetadata, AssistantSessionContext } from "@/types/ai";

const COMPACTED = "[результат інструменту стиснуто]";

const isToolPart = (p: unknown): p is { type: string; output?: unknown } => !!p && typeof p === "object" && String((p as { type?: string }).type).startsWith("tool-");

export function compactHistory(messages: AiChatMessage[]): AiChatMessage[] {
  const keepFrom = messages.length - AI_LIMITS.fullToolResultsInLast;

  return messages.map((m, i) => (i >= keepFrom ? m : { ...m, parts: m.parts.map((p) => (isToolPart(p) && "output" in p ? { ...p, output: COMPACTED } : p)) }));
}

type RunChatArgs = { campaignId: string; userId: string; threadId: string; requestId: string; text: string; focus?: AiFocus; sessionContext?: AssistantSessionContext; abortSignal?: AbortSignal };

export async function runChat({ campaignId, userId, threadId, requestId, text, focus, sessionContext, abortSignal }: RunChatArgs, deps: { model?: LanguageModel } = {}): Promise<Response> {
  const thread = await loadThread(campaignId, userId, threadId);

  if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

  const caller: AssistantCaller = { actor: { campaignId, userId, isDM: true, via: "session", scopes: null }, channel: "chat", threadId, tokenId: null };

  let claim;

  try {
    claim = await beginAssistantRun(caller, requestId, { text, ...(focus && { focus }), ...(sessionContext?.sourceNoteKeys.length && { sessionContext }) });
  } catch (e) {
    if (e instanceof ContentError) return errorResponse(e.message, e.status);

    throw e;
  }

  if (claim.replayed) return Response.json({ recovered: true, ...await readAssistantRuns(caller, requestId), messages: await loadMessages(threadId, AI_LIMITS.historyMessages * 2) }, { headers: PRIVATE_NO_STORE_HEADERS });

  caller.runId = claim.run.id;

  const cancellation = new AbortController();

  const runSignal = createRunSignal(AbortSignal.any([cancellation.signal, ...(abortSignal ? [abortSignal] : [])]), claim.run.expiresAt.getTime() - RUN_GRACE_MS - Date.now());

  const toolSignal = runSignal.signal;

  let checking = false;

  const poll = setInterval(async () => {
    if (checking) return;

    checking = true;
    try { if (await isAssistantRunCancelled(claim.run.id)) cancellation.abort(); }
    catch { cancellation.abort(); }
    finally { checking = false; }
  }, 500);

  const dispose = () => { clearInterval(poll); runSignal.dispose(); };

  let usage: AiMessageMetadata["usage"] = { inputTokens: null, outputTokens: null, partial: true };

  let error: string | undefined;

  let completedSteps = 0;

  try {
    let model = deps.model;

    if (!model) {
      let apiKey: string | null;

      try {
        apiKey = await loadApiKey(userId, thread.provider);
      } catch (error) {
        if (error instanceof AiKeyUnreadableError) throw new ContentError(API_ERRORS.AI_KEY_UNREADABLE, 400);

        throw error;
      }

      if (!apiKey) throw new ContentError(API_ERRORS.AI_KEY_MISSING, 400);

      model = createModel(thread.provider, apiKey, thread.model);
    }

    const tools = toAiSdkTools({ campaignId, userId, scopes: API_TOKEN_SCOPES, threadId, abortSignal: toolSignal, caller });

    const [stored, instructions] = await Promise.all([
      loadMessages(threadId, AI_LIMITS.historyMessages),
      buildInstructions({ campaignId, mode: thread.mode, pageId: focus && "pageId" in focus ? focus.pageId : thread.scenarioPageId, focus, caller, ...(sessionContext?.sourceNoteKeys.length && { sourceNoteSelection: { source: "session-ui", selectedKeys: sessionContext.sourceNoteKeys } }) }),
    ]);

    // Historical tool outputs predate the current transport redaction boundary.
    const history = publicToolData(compactHistory(stored)) as UIMessage[];

    const result = streamText({
      model,
      instructions: { role: "system", content: instructions, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
      messages: await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true }),
      tools,
      stopWhen: isStepCount(AI_LIMITS.maxSteps),
      abortSignal: toolSignal,
      maxRetries: 0,
      onStepFinish: async step => {
        const u = step.usage;

        const previous = completedSteps++ ? usage : { inputTokens: 0, outputTokens: 0 };

        usage = {
          inputTokens: previous?.inputTokens === null || u.inputTokens === undefined ? null : (previous?.inputTokens ?? 0) + u.inputTokens,
          outputTokens: previous?.outputTokens === null || u.outputTokens === undefined ? null : (previous?.outputTokens ?? 0) + u.outputTokens,
          partial: true,
        };
        await recordAssistantRunUsage(claim.run.id, usage);
      },
      onError: ({ error: e }) => console.error("[ai chat]", APICallError.isInstance(e) ? e.statusCode : e instanceof Error ? e.name : "unknown"),
    });


    return createUIMessageStreamResponse({
      headers: PRIVATE_NO_STORE_HEADERS,
      stream: toUIMessageStream({
        stream: result.stream,
        tools,
        originalMessages: history,
        generateMessageId: () => crypto.randomUUID(),
        onError: (e) => (error = aiErrorMessage(e)),
        messageMetadata: ({ part }) => {
          if (part.type !== "finish") return undefined;

          usage = { inputTokens: part.totalUsage.inputTokens ?? null, outputTokens: part.totalUsage.outputTokens ?? null };

          return { usage, model: thread.model } satisfies AiMessageMetadata;
        },
        onEnd: async ({ responseMessage }) => {
          try {
            if (toolSignal.aborted || error) usage = { ...usage, inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, partial: true };

            if (responseMessage.role === "assistant") {
              await appendMessage(threadId, { id: `assistant-${claim.run.id}`, role: "assistant", parts: responseMessage.parts, metadata: { usage, model: thread.model, ...(error && { error }) } });
            }

            await finishAssistantRun(claim.run.id, { status: toolSignal.aborted ? "cancelled" : error ? "failed" : "completed", usage, ...(error && { errorCode: "PROVIDER_ERROR" }) });
          } finally { dispose(); }
        },
      }),
      consumeSseStream: consumeStream,
    });
  } catch (e) {
    dispose();
    await finishAssistantRun(claim.run.id, { status: toolSignal.aborted ? "cancelled" : "failed", usage, errorCode: "CHAT_FAILED" });

    return errorResponse(e instanceof ContentError ? e.message : aiErrorMessage(e), e instanceof ContentError ? e.status : 500);
  }
}
