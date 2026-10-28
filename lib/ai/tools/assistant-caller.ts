import type { AiToolContext } from "./define";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { authorizeAssistant } from "@/lib/server/assistant/authorize";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";

export function callerOf(ctx: AiToolContext): AssistantCaller {
  const caller = ctx.caller;

  if (!caller || caller.actor.campaignId !== ctx.campaignId || caller.actor.userId !== ctx.userId || caller.threadId !== ctx.threadId) throw new ContentError(API_ERRORS.ASSISTANT_AUTH_CALL_REQUIRED, 403);

  if (caller.actor.via === "session" && (caller.channel !== "chat" || caller.tokenId !== null || caller.actor.scopes !== null)) throw new ContentError(API_ERRORS.ASSISTANT_BAD_SESSION, 403);

  if (caller.actor.via === "token" && (caller.channel !== "mcp" || !caller.tokenId || !caller.actor.scopes)) throw new ContentError(API_ERRORS.ASSISTANT_BAD_TOKEN, 403);

  return caller;
}
export async function authorizeDiscovery(caller: AssistantCaller) {
  const scope = caller.actor.scopes?.find(scope => scope !== "ai") ?? "campaign:read";

  await authorizeAssistant(caller, { access: "dm", scope }, "prepare");
}
