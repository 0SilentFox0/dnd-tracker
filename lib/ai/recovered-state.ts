import "server-only";
import { compactToolOutputs } from "@/lib/ai/compact";
import { loadMessages } from "@/lib/ai/threads";
import { AI_LIMITS } from "@/lib/constants/ai";
import { readAssistantRuns } from "@/lib/server/assistant/runs";
import type { AssistantCaller } from "@/lib/server/assistant/types";

type RunsState = Awaited<ReturnType<typeof readAssistantRuns>>;

export async function recoveredState(caller: AssistantCaller, threadId: string, requestId?: string, state?: RunsState, options: { statusOnly?: boolean } = {}) {
  const runs = state ?? (requestId ? await readAssistantRuns(caller, requestId) : await readAssistantRuns(caller));

  if (options.statusOnly) return runs;

  const messages = await loadMessages(threadId, AI_LIMITS.historyMessages * 2);

  return { ...runs, messages: compactToolOutputs(messages, { minChars: AI_LIMITS.slimOutputChars }) };
}
