import type { AssistantWriteAction } from "../types";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/translator";
import { proposeScenarioEditSchema } from "@/lib/schemas/ai";
import { applyProposal,createProposal } from "@/lib/server/assistant/proposals";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { scenarioFingerprint, scenarioResult, scenarioState } from "@/lib/server/scenario/action-service";
import { readContentStrict } from "@/lib/server/scenario/page-store";
import { jsonContent } from "@/lib/utils/common/json";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

/** Both proposal aliases and generic actions use T6's sole proposal writer. */
export const SCENARIO_EDIT_ACTION: AssistantWriteAction = {
  id: "scenario.propose-edit", title: "Edit scenario", description: "Edits the scenario through the existing proposal writer after review", input: proposeScenarioEditSchema,
  need: { access: "dm", scope: "scenario:write" }, effect: "write", confirmation: "always",
  prepare: (caller, raw) => withCampaignContentWrite(caller.actor.campaignId, async () => {
    const input = proposeScenarioEditSchema.parse(raw);

    const state = await scenarioState(caller.actor, input.pageId);

    const page = state.page;

    if (!page) throw new ContentError(API_ERRORS.SCENARIO_PAGE_NOT_FOUND, 404);

    if (input.ops.some((o) => o.op === "createAcquaintance") && !(await prisma.campaign.findUnique({ where: { id: caller.actor.campaignId }, select: { acquaintancesEnabled: true } }))?.acquaintancesEnabled) throw new ContentError(API_ERRORS.ACQUAINTANCES_DISABLED, 403);

    const resolved = resolveAiOps(readContentStrict(page.content), input.ops, await getTranslator(caller.locale, "assistant"));

    if (!resolved.ok) throw new ContentError(resolved.error.message, 422, undefined, resolved.error.params);

    const target = { domain: "scenario", id: input.pageId, name: page.title };

    return { summary: input.summary, targets: [target], changes: [{ target, path: "ops", before: jsonContent(state.page), after: jsonContent(resolved.ops) }], warnings: [], preconditions: { fingerprint: scenarioFingerprint(state) }, effects: [{ kind: "update", targets: [target], description: input.summary }] };
  }),
  execute: async (ctx, raw) => {
    const input = proposeScenarioEditSchema.parse(raw);

    const state = await scenarioState(ctx.caller.actor, input.pageId);

    const page = state.page;

    if (!page) throw new ContentError(API_ERRORS.SCENARIO_PAGE_NOT_FOUND, 404);

    const resolved = resolveAiOps(readContentStrict(page.content), input.ops, await getTranslator(ctx.caller.locale, "assistant"));

    if (!resolved.ok) throw new ContentError(resolved.error.message, 422, undefined, resolved.error.params);

    const proposal = await createProposal({ campaignId: ctx.caller.actor.campaignId, threadId: ctx.caller.threadId }, input.pageId, input.summary, resolved.ops);

    const result = await applyProposal(ctx.caller.actor.campaignId, ctx.caller.actor.userId, proposal.id, ctx.intentId, ctx.caller.locale);

    if (!result.ok) throw new ContentError(result.error, result.status);

    return scenarioResult("page" in result ? { page: result.page } : { deck: result.deck }, undefined, ctx.caller.locale);
  },
};
