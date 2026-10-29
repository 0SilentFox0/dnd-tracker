import { AI_LIMITS } from "@/lib/constants/ai";
import { windowOf } from "@/lib/utils/api/page-of";
import type { SourceDiff } from "@/types/campaigns";

export function pageSourceDiff(diff: SourceDiff, offset: number, limit: number) {
  const counts: Record<string, number> = {};

  for (const { scope } of diff.items) counts[scope] = (counts[scope] ?? 0) + 1;

  // shrink the page until the JSON fits: define.ts clipping would cut it mid-structure
  for (let n = limit; ; n = Math.max(1, Math.floor(n / 2))) {
    const page = { ...diff, ...windowOf(diff.items, offset, n), counts };

    if (n === 1 || JSON.stringify(page).length <= AI_LIMITS.toolResultChars) return page;
  }
}

