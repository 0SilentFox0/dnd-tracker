import { createHash } from "node:crypto";

import { AI_LIMITS } from "@/lib/constants/ai";
import { buildSummaryInput, type SummaryInputPage } from "@/lib/utils/scenario/summary/input";

export function summaryInputHash(page: SummaryInputPage): string {
  const content = { ...page.content, sections: page.content.sections.map((s) => ({ ...s, played: false })) };

  return createHash("sha256").update(buildSummaryInput({ ...page, content }, AI_LIMITS.summaryInputChars).prompt).digest("hex");
}
