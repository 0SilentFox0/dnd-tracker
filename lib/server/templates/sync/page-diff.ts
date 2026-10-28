import { AI_LIMITS } from "@/lib/constants/ai";
import type { SourceDiff } from "@/types/campaigns";

export function pageSourceDiff(diff: SourceDiff, offset: number, limit: number) {
  const total = diff.items.length;

  const counts: Record<string, number> = {};

  for (const { scope } of diff.items) counts[scope] = (counts[scope] ?? 0) + 1;

  // shrink the page until the JSON fits: define.ts clipping would cut it mid-structure
  for (let n = limit; ; n = Math.max(1, Math.floor(n / 2))) {
    const end = Math.min(offset + n, total);

    const page = { ...diff, total, offset, items: diff.items.slice(offset, end), counts, nextOffset: end < total ? end : null };

    if (n === 1 || JSON.stringify(page).length <= AI_LIMITS.toolResultChars) return page;
  }
}

