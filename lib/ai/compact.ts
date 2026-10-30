import { AI_LIMITS, AI_TOOL_OUTPUT_COMPACTED } from "@/lib/constants/ai";
import type { AiChatMessage } from "@/types/ai";

type Keep = { tools: readonly string[]; maxChars: number };

const outputSize = (output: unknown) => (typeof output === "string" ? output.length : JSON.stringify(output ?? null).length);

const compactPart = (p: unknown, minChars?: number) => {
  if (!p || typeof p !== "object" || !("output" in p)) return p;

  const { output } = p as { output: unknown };

  if (minChars !== undefined && !(typeof output === "string" && output.length > minChars)) return p;

  return { ...p, output: AI_TOOL_OUTPUT_COMPACTED };
};

const isKeptType = (p: unknown, keep: Keep) => !!p && typeof p === "object" && "output" in p && keep.tools.some((n) => (p as { type?: string }).type === `tool-${n}`);

export function compactToolOutputs(messages: AiChatMessage[], { minChars, keep }: { minChars?: number; keep?: Keep } = {}): AiChatMessage[] {
  const keepFrom = messages.length - AI_LIMITS.fullToolResultsInLast;

  let budget = keep?.maxChars ?? 0;

  const result = [...messages];

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];

    const recent = i >= keepFrom;

    if (recent && !keep) continue;

    const parts = [...m.parts];

    for (let j = parts.length - 1; j >= 0; j--) {
      const p = parts[j];

      if (keep && isKeptType(p, keep)) {
        const size = outputSize((p as { output: unknown }).output);

        if (recent || size <= budget) {
          budget -= size;

          continue;
        }
      }

      if (!recent) parts[j] = compactPart(p, minChars) as never;
    }

    result[i] = { ...m, parts };
  }

  return result;
}
