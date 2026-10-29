import { publicToolData } from "@/lib/ai/tools/projection";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

export type ContextBlock = { label: string; required?: boolean; maxChars?: number } & ({ text: string; value?: never } | { value: unknown; text?: never });

const render = (b: ContextBlock) => `${b.label}:\n${typeof b.text === "string" ? publicToolData(b.text) : JSON.stringify(publicToolData(b.value))}`;

/** Required blocks are indivisible. Optional blocks are valid JSON pages, never sliced JSON. */
export function fitContext(blocks: readonly ContextBlock[], budget: number, includedLabels?: string[]): { text: string; truncated: boolean } {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new ContentError(API_ERRORS.ASSISTANT_CONTEXT_BUDGET_INVALID, 400);

  const parts = blocks.filter(b => b.required).map(render);

  if (parts.join("\n\n").length > budget) throw new ContentError(API_ERRORS.ASSISTANT_INSTRUCTIONS_TOO_LONG, 413);

  includedLabels?.push(...blocks.filter(b => b.required).map(b => b.label));

  let truncated = false;

  for (const block of blocks.filter(b => !b.required)) {
    const remaining = Math.min(block.maxChars ?? budget, budget - parts.join("\n\n").length - (parts.length ? 2 : 0));

    const full = render(block);

    if (full.length <= remaining) { parts.push(full); includedLabels?.push(block.label); continue; }

    truncated = true;

    const value = publicToolData(block.text ?? block.value);

    const entries = typeof value === "string" ? null : Array.isArray(value) ? value : value && typeof value === "object" ? Object.entries(value) : [value];

    const total = entries ? entries.length : (value as string).length;

    const page = (count: number) => `${block.label}:\n${JSON.stringify({ truncated: true, notice: "[truncated] Read the full data with a tool if needed.", ...(entries ? { items: entries.slice(0, count) } : { text: (value as string).slice(0, count) }), total, nextOffset: count })}`;

    let low = 0;

    let high = total;

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);

      if (page(mid).length <= remaining) low = mid; else high = mid - 1;
    }

    if (page(low).length <= remaining) { parts.push(page(low)); includedLabels?.push(block.label); }
    else {
      const marker = `${block.label}:\n${JSON.stringify({ truncated: true, nextOffset: 0 })}`;

      if (marker.length <= remaining) { parts.push(marker); includedLabels?.push(block.label); }
    }
  }

  return { text: parts.join("\n\n"), truncated };
}
