import { z } from "zod";

import { authorizeDiscovery,callerOf } from "./assistant-caller";
import { defineTool } from "./define";
import { project } from "./projection";

import { API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { authorizeAssistant } from "@/lib/server/assistant/authorize";
import { assistantCatalog } from "@/lib/server/assistant/catalog";
import { rejectIntent } from "@/lib/server/assistant/execute";
import { getIntent, intentOwner, listIntents } from "@/lib/server/assistant/intent-store";
import { stageLegacyProposals } from "@/lib/server/assistant/legacy-proposals";
import { readReceipt } from "@/lib/server/assistant/receipts";
import { ContentError } from "@/lib/server/content/errors";

export const assistantStatusTool = defineTool({
  name: "assistant_status", scopes: API_TOKEN_SCOPES.filter(scope => scope !== "ai"), title: "Стан пропозицій", description: "Стан власних пропозицій і квитанцій; не підтверджує та не виконує зміни.",
  input: z.strictObject({ path: z.array(z.string().max(200)).max(30).default([]), offset: z.number().int().min(0).max(1000000).default(0), intentId: z.string().min(1).max(100).optional(), cursor: z.string().max(1000).optional(), limit: z.number().int().min(1).max(20).default(10) }),
  handler: async (ctx, input) => {
    const caller = callerOf(ctx);

    await authorizeDiscovery(caller);

    // List/detail helpers enforce ownership; action authorization is repeated before output.
    if (input.intentId) {
      let intent = null;

      try { intent = await getIntent(caller, input.intentId); }
      catch (error) { if (!(error instanceof ContentError) || ![404, 410].includes(error.status)) throw error; }

      if (intent) await authorizeAssistant(caller, assistantCatalog.getAction(intent.actionId).need, "prepare");
      else {
        const ref = await prisma.assistantReceipt.findFirst({ where: { intentId: input.intentId, ...intentOwner(caller) }, select: { actionId: true } });

        if (!ref) throw new ContentError(API_ERRORS.ASSISTANT_RECEIPT_NOT_FOUND, 404);

        await authorizeAssistant(caller, assistantCatalog.getAction(ref.actionId).need, "prepare");
      }

      let receipt = null;

      try { receipt = await readReceipt(caller, input.intentId); }
      catch (error) { if (!(error instanceof ContentError) || error.status !== 404) throw error; }

      // Internal preconditions may contain trusted run identity; never serialize them.
      const visibleIntent = intent ? { ...intent, preview: { summary: intent.preview.summary, targets: intent.preview.targets, changes: intent.preview.changes, warnings: intent.preview.warnings, effects: intent.preview.effects } } : null;

      return project({ intent: visibleIntent, receipt }, input);
    }

    if (caller.actor.via === "session") await stageLegacyProposals(caller);

    const page = await listIntents(caller, { cursor: input.cursor, limit: input.limit });

    const items = [];

    for (const intent of page.items) {
      await authorizeAssistant(caller, assistantCatalog.getAction(intent.actionId).need, "prepare");
      items.push(intent);
    }

    return project({ ...page, items }, input);
  },
});

export const assistantRejectTool = defineTool({
  name: "assistant_reject", scopes: API_TOKEN_SCOPES.filter(scope => scope !== "ai"), title: "Відхилити пропозицію", description: "Відхилити власну пропозицію без виконання доменної зміни; підтвердження лише у UI.",
  input: z.strictObject({ intentId: z.string().min(1).max(100) }),
  handler: (ctx, input) => rejectIntent(callerOf(ctx), input.intentId),
});
