import type { LogLine } from "@/types/text";

/** Events written before the structured log: segments joined by " | ", the first one is the headline. */
export function legacyLines(resultText: string): string[] {
   
  return resultText.split(" | ").map((s) => s.trim()).filter(Boolean);
}

/** Legacy trigger rows: «Тригери <when>: a; b» — one headline and the items as lines. */
export function splitLegacyTriggers(lines: readonly LogLine[]): { headline: LogLine; lines: LogLine[]; isTrigger: boolean } {
  const [first = "", ...rest] = lines;

   
  const triggers = typeof first === "string" ? /^(Тригери [^:]+):\s*(.+)$/.exec(first) : null;

  if (!triggers) return { headline: first, lines: rest, isTrigger: false };

  return { headline: triggers[1], lines: [...triggers[2].split("; ").filter(Boolean), ...rest], isTrigger: true };
}
