import { APICallError, consumeStream, convertToModelMessages, createUIMessageStreamResponse, isStepCount, type LanguageModel, streamText, toUIMessageStream, type UIMessage } from "ai";

import "server-only";
import { createRunSignal } from "@/lib/ai/chat/run-signal";
import { compactToolOutputs } from "@/lib/ai/compact";
import { buildInstructions } from "@/lib/ai/context/prompt";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { aiErrorMessage } from "@/lib/ai/errors";
import { createModel } from "@/lib/ai/providers";
import { recoveredState } from "@/lib/ai/recovered-state";
import { appendMessage, loadMessages, loadThread } from "@/lib/ai/threads";
import { toAiSdkTools } from "@/lib/ai/tools";
import { AI_LIMITS, AI_SCENARIO_READ_TOOLS, API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { chatCaller } from "@/lib/server/assistant/caller";
import { beginAssistantRun, finishAssistantRun, isAssistantRunCancelled, recordAssistantRunUsage, RUN_GRACE_MS } from "@/lib/server/assistant/runs";
import { ContentError } from "@/lib/server/content/errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { translateErrorBody } from "@/lib/utils/api/translate-error";
import { publicToolData } from "@/lib/utils/common/public-tool-data";
import type { AiFocus, AiMessageMetadata, AssistantSessionContext } from "@/types/ai";

type RunChatArgs = { campaignId: string; userId: string; threadId: string; requestId: string; text: string; focus?: AiFocus; sessionContext?: AssistantSessionContext; abortSignal?: AbortSignal };

type Thread = NonNullable<Awaited<ReturnType<typeof loadThread>>>;

type Caller = ReturnType<typeof chatCaller>;

interface RunState { usage: NonNullable<AiMessageMetadata["usage"]>; error: string | undefined; completedSteps: number }

interface StreamScope {
  args: RunChatArgs;
  thread: Thread;
  caller: Caller;
  t: Awaited<ReturnType<typeof getTranslator>>;
  runId: string;
  toolSignal: AbortSignal;
  cancellation: AbortController;
  state: RunState;
  dispose: () => void;
}

async function claimRun(caller: Caller, { requestId, text, focus, sessionContext }: RunChatArgs) {
  try {
    return await beginAssistantRun(caller, requestId, { text, ...(focus && { focus }), ...(sessionContext?.sourceNoteKeys.length && { sessionContext }) });
  } catch (e) {
    if (e instanceof ContentError) return errorResponse(e.message, e.status, undefined, e.params);

    throw e;
  }
}

function startCancelPoll(runId: string, cancellation: AbortController) {
  let checking = false;

  const poll = setInterval(async () => {
    if (checking) return;

    checking = true;
    try { if (await isAssistantRunCancelled(runId)) cancellation.abort(); }
    catch { cancellation.abort(); }
    finally { checking = false; }
  }, AI_LIMITS.cancelPollMs);

  return () => clearInterval(poll);
}

async function resolveModel(provided: LanguageModel | undefined, userId: string, thread: Thread): Promise<LanguageModel> {
  if (provided) return provided;

  let apiKey: string | null;

  try {
    apiKey = await loadApiKey(userId, thread.provider);
  } catch (error) {
    if (error instanceof AiKeyUnreadableError) throw new ContentError(API_ERRORS.AI_KEY_UNREADABLE, 400);

    throw error;
  }

  if (!apiKey) throw new ContentError(API_ERRORS.AI_KEY_MISSING, 400);

  return createModel(thread.provider, apiKey, thread.model);
}

function addStepUsage(state: RunState, u: { inputTokens: number | undefined; outputTokens: number | undefined }) {
  const previous = state.completedSteps++ ? state.usage : { inputTokens: 0, outputTokens: 0 };

  state.usage = {
    inputTokens: previous?.inputTokens === null || u.inputTokens === undefined ? null : (previous?.inputTokens ?? 0) + u.inputTokens,
    outputTokens: previous?.outputTokens === null || u.outputTokens === undefined ? null : (previous?.outputTokens ?? 0) + u.outputTokens,
    partial: true,
  };
}

async function persistOutcome({ thread, runId, toolSignal, state, dispose, args }: StreamScope, responseMessage: UIMessage) {
  try {
    if (toolSignal.aborted || state.error) state.usage = { ...state.usage, inputTokens: state.usage?.inputTokens ?? null, outputTokens: state.usage?.outputTokens ?? null, partial: true };

    const { usage, error } = state;

    if (responseMessage.role === "assistant") {
      await appendMessage(args.threadId, { id: `assistant-${runId}`, role: "assistant", parts: responseMessage.parts, metadata: { usage, model: thread.model, ...(error && { error }) } });
    }

    await finishAssistantRun(runId, { status: toolSignal.aborted ? "cancelled" : error ? "failed" : "completed", usage, ...(error && { errorCode: "PROVIDER_ERROR" }) });
  } finally { dispose(); }
}

async function streamChat(scope: StreamScope, model: LanguageModel): Promise<Response> {
  const { args, thread, caller, t, runId, toolSignal, cancellation, state } = scope;

  const { campaignId, userId, threadId, focus, sessionContext } = args;

  const tools = toAiSdkTools({ campaignId, userId, scopes: API_TOKEN_SCOPES, threadId, abortSignal: toolSignal, caller, locale: caller.locale });

  const [stored, instructions] = await Promise.all([
    loadMessages(threadId, AI_LIMITS.historyMessages),
    buildInstructions({ campaignId, mode: thread.mode, pageId: focus && "pageId" in focus ? focus.pageId : thread.scenarioPageId, focus, caller, ...(sessionContext?.sourceNoteKeys.length && { sourceNoteSelection: { source: "session-ui", selectedKeys: sessionContext.sourceNoteKeys } }) }),
  ]);

  // Historical tool outputs predate the current transport redaction boundary.
  const history = publicToolData(compactToolOutputs(stored, { keep: { tools: AI_SCENARIO_READ_TOOLS, maxChars: AI_LIMITS.keptReadingChars } })) as UIMessage[];

  const result = streamText({
    model,
    instructions: { role: "system", content: instructions, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
    messages: await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(AI_LIMITS.maxSteps),
    abortSignal: toolSignal,
    maxRetries: 0,
    onStepFinish: async step => {
      addStepUsage(state, step.usage);
      await recordAssistantRunUsage(runId, state.usage);

      if (await isAssistantRunCancelled(runId).catch(() => true)) cancellation.abort();
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
      onError: (e) => (state.error = translateErrorBody(t, { error: aiErrorMessage(e) }).error),
      messageMetadata: ({ part }) => {
        if (part.type !== "finish") return undefined;

        state.usage = { inputTokens: part.totalUsage.inputTokens ?? null, outputTokens: part.totalUsage.outputTokens ?? null };

        return { usage: state.usage, model: thread.model } satisfies AiMessageMetadata;
      },
      onEnd: ({ responseMessage }) => persistOutcome(scope, responseMessage),
    }),
    consumeSseStream: consumeStream,
  });
}

export async function runChat(args: RunChatArgs, deps: { model?: LanguageModel } = {}): Promise<Response> {
  const { campaignId, userId, threadId, requestId, abortSignal } = args;

  const thread = await loadThread(campaignId, userId, threadId);

  if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

  const caller = chatCaller(campaignId, userId, threadId, await getRequestLocale());

  const t = await getTranslator(caller.locale);

  const claim = await claimRun(caller, args);

  if (claim instanceof Response) return claim;

  if (claim.replayed) return Response.json({ recovered: true, ...await recoveredState(caller, threadId, requestId) }, { headers: PRIVATE_NO_STORE_HEADERS });

  const runId = claim.run.id;

  caller.runId = runId;

  const cancellation = new AbortController();

  const runSignal = createRunSignal(AbortSignal.any([cancellation.signal, ...(abortSignal ? [abortSignal] : [])]), claim.run.expiresAt.getTime() - RUN_GRACE_MS - Date.now());

  const toolSignal = runSignal.signal;

  const stopPolling = startCancelPoll(runId, cancellation);

  const dispose = () => { stopPolling(); runSignal.dispose(); };

  const state: RunState = { usage: { inputTokens: null, outputTokens: null, partial: true }, error: undefined, completedSteps: 0 };

  try {
    const model = await resolveModel(deps.model, userId, thread);

    return await streamChat({ args, thread, caller, t, runId, toolSignal, cancellation, state, dispose }, model);
  } catch (e) {
    dispose();
    await finishAssistantRun(runId, { status: toolSignal.aborted ? "cancelled" : "failed", usage: state.usage, errorCode: "CHAT_FAILED" });

    return e instanceof ContentError ? errorResponse(e.message, e.status, undefined, e.params) : errorResponse(aiErrorMessage(e), 500);
  }
}
