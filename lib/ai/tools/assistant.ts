import { z } from "zod";

import { authorizeDiscovery, callerOf } from "./assistant-caller";
import { assistantRejectTool, assistantStatusTool } from "./assistant-status";
import { defineTool } from "./define";
import { project } from "./projection";
import { toolRequestId } from "./request-key";

import { API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { authorizeAssistant } from "@/lib/server/assistant/authorize";
import { assistantCatalog } from "@/lib/server/assistant/catalog";
import { dispatchAction } from "@/lib/server/assistant/execute";
import { ContentError } from "@/lib/server/content/errors";
import { inputJsonSchema } from "@/lib/server/content/json-schema";
import { windowOf } from "@/lib/utils/api/page-of";

export const assistantScopes = API_TOKEN_SCOPES.filter(scope => scope !== "ai");

const actionId = z.string().min(1).max(120);

const page = { path: z.array(z.string().max(200)).max(30).default([]), offset: z.number().int().min(0).max(1000000).default(0), limit: z.number().int().min(1).max(20).default(20) };

const request = z.strictObject({ actionId, input: z.unknown() });

export const assistantCapabilitiesTool = defineTool({
  name: "assistant_capabilities", scopes: assistantScopes, title: "Можливості асистента", description: "Єдиний каталог доступних дій кампанії з типом результату та вимогами перегляду.",
  input: z.strictObject({ offset: page.offset, limit: page.limit }),
  handler: async (ctx, { offset, limit }) => {
    const caller = callerOf(ctx);

    await authorizeDiscovery(caller);

    const actions = assistantCatalog.listActions(caller.actor);

    const { items: selected, ...window } = windowOf(actions, offset, limit);

    for (const action of selected) await authorizeAssistant(caller, action.need, "prepare");

    return { items: selected.map(({ id, title, effect, need }) => ({ id, title, effect, sessionOnly: !!need.sessionOnly })), total: window.total, nextOffset: window.nextOffset };
  },
});
export const assistantSchemaTool = defineTool({
  name: "assistant_schema", scopes: assistantScopes, title: "Схема дії", description: "Схема входу канонічної дії; великі схеми читаються сторінками за path/offset.",
  input: z.strictObject({ actionId, ...page }),
  handler: async (ctx, input) => {
    const caller = callerOf(ctx);

    const action = assistantCatalog.getAction(input.actionId);

    await authorizeAssistant(caller, action.need, "prepare");

    return project(inputJsonSchema(action.input), input);
  },
});
export const assistantReadTool = defineTool({
  name: "assistant_read", scopes: assistantScopes, title: "Читання кампанії", description: "Виконує лише read або UI handoff; запис через цей інструмент заборонений. Дані мають пагінацію.",
  input: request.extend(page),
  handler: async (ctx, input) => {
    const caller = callerOf(ctx);

    const action = assistantCatalog.getAction(input.actionId);

    if (action.effect !== "read" && action.effect !== "handoff") throw new ContentError(API_ERRORS.ASSISTANT_READ_CANNOT_WRITE, 403);

    const result = await dispatchAction(caller, { actionId: input.actionId, input: input.input, requestId: toolRequestId(ctx) }, ctx.abortSignal);

    return result.kind === "result" ? { ...result, result: { ...result.result, data: project(result.result.data, input) } } : result;
  },
});
export const assistantActionTool = defineTool({
  name: "assistant_action", scopes: assistantScopes, title: "Підготувати дію", description: "Виклик єдиного dispatcher з review/auto policy. Pending і handoff не означають виконану зміну; підтвердження лише людиною у UI.",
  input: request,
  handler: (ctx, input) => dispatchAction(callerOf(ctx), { ...input, requestId: toolRequestId(ctx) }, ctx.abortSignal),
});
export const ASSISTANT_TOOLS = [assistantCapabilitiesTool, assistantSchemaTool, assistantReadTool, assistantActionTool, assistantStatusTool, assistantRejectTool];
