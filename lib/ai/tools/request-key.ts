import { createHash, randomUUID } from "node:crypto";

import type { AiToolContext } from "./define";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

export const toolRequestKey = (runId: string, toolCallId: string) => `${runId}_${createHash("sha256").update(toolCallId).digest("hex")}`;

export function toolRequestId(ctx: AiToolContext): string {
  if (!ctx.caller?.runId) return randomUUID();

  if (!ctx.toolCallId) throw new ContentError(API_ERRORS.ASSISTANT_TOOL_CALL_ID_MISSING, 409);

  return toolRequestKey(ctx.caller.runId, ctx.toolCallId);
}
