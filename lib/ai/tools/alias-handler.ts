import { callerOf } from "./assistant-caller";
import type { AiToolContext } from "./define";
import { toolRequestId } from "./request-key";

import { dispatchContentAlias } from "@/lib/server/assistant/actions/content-aliases";
import { dispatchAction } from "@/lib/server/assistant/execute";

export const aliasHandler = (name: string) => (ctx: AiToolContext, input: Record<string, unknown>) =>
  dispatchContentAlias((caller, request) => dispatchAction(caller, request, ctx.abortSignal), callerOf(ctx), name, input, toolRequestId(ctx));
