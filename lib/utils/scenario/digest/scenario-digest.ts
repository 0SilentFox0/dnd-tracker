import { type DigestLevel, type DigestPage, pageLine } from "./build-lines";

import { fitLines } from "@/lib/utils/scenario/summary/digest";

const LEVELS: DigestLevel[] = [0, 1, 2, 3];

export function scenarioDigest(pages: DigestPage[], opts: { maxChars: number }): string {
  const sorted = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);

  if (!sorted.length) return "";

  for (const level of LEVELS) {
    const text = sorted.map((p) => pageLine(p, level)).join("\n");

    if (text.length <= opts.maxChars) return text;
  }

  return fitLines(
    sorted.map((p) => pageLine(p, 3)),
    opts.maxChars,
  );
}
