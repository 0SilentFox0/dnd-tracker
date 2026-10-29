import type { ActionRequest, AssistantCaller } from "./types";

import "server-only";
import { assistantRequestSchema } from "@/lib/schemas/assistant";
import { parseInput } from "@/lib/server/content/errors";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";

export function identifyActionRequest(caller: AssistantCaller, raw: ActionRequest) {
  const request = parseInput(assistantRequestSchema, raw);

  return {
    request,
    originKey: requestDigest({ campaignId: caller.actor.campaignId, channel: caller.channel, threadId: caller.threadId, tokenId: caller.tokenId }),
    requestHash: requestDigest({ actionId: request.actionId, input: request.input }),
  };
}
