import { z } from "zod";

import { legacyPreview } from "../legacy-proposals";
import type { AssistantWriteAction } from "../types";

import "server-only";
import { applyProposal } from "@/lib/server/assistant/proposals";
import { ContentError } from "@/lib/server/content/errors";
import { scenarioResult } from "@/lib/server/scenario/action-service";

const need = { access: "dm" as const, scope: "scenario:write" as const, sessionOnly: true as const };

export const LEGACY_PROPOSAL_ACTION: AssistantWriteAction = {
  id: "scenario.legacy-proposal", title: "Existing proposal", description: "The single legacy apply path", input: z.object({ proposalId: z.string().min(1).max(40) }), need, effect: "write", confirmation: "standard",
  prepare: (caller, input) => legacyPreview(caller, (input as { proposalId: string }).proposalId),
  execute: async (ctx, input) => {
    const result = await applyProposal(ctx.caller.actor.campaignId, ctx.caller.actor.userId, (input as { proposalId: string }).proposalId, ctx.intentId, ctx.caller.locale);

    if (!result.ok) throw new ContentError(result.error, result.status);

    return scenarioResult("page" in result ? { page: result.page } : { deck: result.deck }, undefined, ctx.caller.locale);
  },
};
