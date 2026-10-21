import { APICallError, convertToModelMessages, createUIMessageStreamResponse, isStepCount, type LanguageModel, streamText, toUIMessageStream, type UIMessage } from "ai";

import "server-only";
import { buildInstructions } from "@/lib/ai/context/prompt";
import { loadApiKey } from "@/lib/ai/credentials";
import { aiErrorMessage } from "@/lib/ai/errors";
import { createModel } from "@/lib/ai/providers";
import { appendMessage, loadMessages, loadThread } from "@/lib/ai/threads";
import { toAiSdkTools } from "@/lib/ai/tools";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import type { AiChatMessage, AiFocus, AiMessageMetadata } from "@/types/ai";

const COMPACTED = "[результат інструменту стиснуто]";

const isToolPart = (p: unknown): p is { type: string; output?: unknown } => !!p && typeof p === "object" && String((p as { type?: string }).type).startsWith("tool-");

export function compactHistory(messages: AiChatMessage[]): AiChatMessage[] {
  const keepFrom = messages.length - AI_LIMITS.fullToolResultsInLast;

  return messages.map((m, i) => (i >= keepFrom ? m : { ...m, parts: m.parts.map((p) => (isToolPart(p) && "output" in p ? { ...p, output: COMPACTED } : p)) }));
}

type RunChatArgs = { campaignId: string; userId: string; threadId: string; text: string; focus?: AiFocus; abortSignal?: AbortSignal };

export async function runChat({ campaignId, userId, threadId, text, focus, abortSignal }: RunChatArgs, deps: { model?: LanguageModel } = {}): Promise<Response> {
  const thread = await loadThread(campaignId, userId, threadId);

  if (!thread) return errorResponse(API_ERRORS.AI_THREAD_NOT_FOUND, 404);

  let model = deps.model;

  if (!model) {
    const apiKey = await loadApiKey(userId, thread.provider);

    if (!apiKey) return errorResponse(API_ERRORS.AI_KEY_MISSING, 400);

    model = createModel(thread.provider, apiKey, thread.model);
  }

  const userMessage = { id: crypto.randomUUID(), role: "user" as const, parts: [{ type: "text" as const, text }] };

  await appendMessage(threadId, userMessage);

  const stored = await loadMessages(threadId, AI_LIMITS.historyMessages);

  const history = compactHistory(stored.some((m) => m.id === userMessage.id) ? stored : [...stored, userMessage]) as unknown as UIMessage[];

  const tools = toAiSdkTools({ campaignId, userId, threadId });

  const instructions = await buildInstructions({ campaignId, mode: thread.mode, pageId: focus?.pageId ?? thread.scenarioPageId, focus });

  const result = streamText({
    model,
    instructions: { role: "system", content: instructions, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
    messages: await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(AI_LIMITS.maxSteps),
    abortSignal,
    onError: ({ error: e }) => console.error("[ai chat]", APICallError.isInstance(e) ? e.statusCode : e instanceof Error ? e.name : "unknown"),
  });

  let usage: AiMessageMetadata["usage"];

  let error: string | undefined;

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: history,
      generateMessageId: () => crypto.randomUUID(),
      onError: (e) => (error = aiErrorMessage(e)),
      messageMetadata: ({ part }) => {
        if (part.type !== "finish") return undefined;

        usage = { inputTokens: part.totalUsage.inputTokens ?? 0, outputTokens: part.totalUsage.outputTokens ?? 0 };

        return { usage, model: thread.model } satisfies AiMessageMetadata;
      },
      onEnd: async ({ responseMessage }) => {
        if (responseMessage.role !== "assistant" || responseMessage.parts.length === 0) return;

        await appendMessage(threadId, { id: responseMessage.id, role: "assistant", parts: responseMessage.parts, metadata: { usage, model: thread.model, ...(error && { error }) } });
      },
    }),
  });
}
