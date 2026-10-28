import { AI_LIMITS, AI_TOOL_OUTPUT_COMPACTED } from "@/lib/constants/ai";
import type { AiChatMessage } from "@/types/ai";

const compactPart = (p: unknown, minChars?: number) => {
  if (!p || typeof p !== "object" || !("output" in p)) return p;

  const { output } = p as { output: unknown };

  if (minChars !== undefined && !(typeof output === "string" && output.length > minChars)) return p;

  return { ...p, output: AI_TOOL_OUTPUT_COMPACTED };
};

export function compactToolOutputs(messages: AiChatMessage[], { minChars }: { minChars?: number } = {}): AiChatMessage[] {
  const keepFrom = messages.length - AI_LIMITS.fullToolResultsInLast;

  return messages.map((m, i) => (i >= keepFrom ? m : { ...m, parts: m.parts.map((p) => compactPart(p, minChars)) }));
}
