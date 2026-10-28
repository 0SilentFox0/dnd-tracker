import type { AssistantWriteAction } from "../types";

import { applyProposal,createProposal } from "@/lib/ai/proposals";
import { proposeScenarioEditSchema } from "@/lib/schemas/ai";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { scenarioFingerprint, scenarioResult, scenarioState } from "@/lib/server/scenario/action-service";
import { readContentStrict } from "@/lib/server/scenario/page-store";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

/** Both proposal aliases and generic actions use T6's sole proposal writer. */
export const SCENARIO_EDIT_ACTION: AssistantWriteAction = {
  id: "scenario.propose-edit", title: "Правка сценарію", description: "Правка сценарію через чинний T6 proposal writer після перегляду", input: proposeScenarioEditSchema,
  need: { access: "dm", scope: "scenario:write" }, effect: "write", confirmation: "always",
  prepare: (caller, raw) => withCampaignContentWrite(caller.actor.campaignId, async () => {
    const input = proposeScenarioEditSchema.parse(raw);

    const state = await scenarioState(caller.actor, input.pageId);

    const page = state.page;

    if (!page) throw new ContentError("Сторінку не знайдено", 404);

    const resolved = resolveAiOps(readContentStrict(page.content), input.ops);

    if (!resolved.ok) throw new ContentError(resolved.error, 422);

    const target = { domain: "scenario", id: input.pageId, name: page.title };

    return { summary: input.summary, targets: [target], changes: [{ target, path: "ops", before: scenarioResult(state.page).data, after: scenarioResult(resolved.ops).data }], warnings: [], preconditions: { fingerprint: scenarioFingerprint(state) }, effects: [{ kind: "update", targets: [target], description: input.summary }] };
  }),
  execute: async (ctx, raw) => {
    const input = proposeScenarioEditSchema.parse(raw);

    const state = await scenarioState(ctx.caller.actor, input.pageId);

    const page = state.page;

    if (!page) throw new ContentError("Сторінку не знайдено", 404);

    const resolved = resolveAiOps(readContentStrict(page.content), input.ops);

    if (!resolved.ok) throw new ContentError(resolved.error, 422);

    const proposal = await createProposal({ campaignId: ctx.caller.actor.campaignId, userId: ctx.caller.actor.userId, threadId: ctx.caller.threadId, scopes: ctx.caller.actor.scopes ?? [], caller: ctx.caller }, input.pageId, input.summary, resolved.ops);

    const result = await applyProposal(ctx.caller.actor.campaignId, ctx.caller.actor.userId, proposal.id, ctx.intentId);

    if (!result.ok) throw new ContentError(result.error, result.status);

    return scenarioResult("page" in result ? { page: result.page } : { deck: result.deck });
  },
};
