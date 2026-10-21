import { AiToolError, defineTool } from "./define";
import { loadPageForAi } from "./scenario-read";

import "server-only";
import { createProposal } from "@/lib/ai/proposals";
import { proposeScenarioEditSchema } from "@/lib/schemas/ai";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

export const proposeScenarioEditTool = defineTool({
  name: "propose_scenario_edit",
  title: "Запропонувати правку сценарію",
  description:
    "Propose edits to a scenario page; the DM reviews and applies them. Never paste full rewritten rows into the chat — use this tool. Ops: replaceRow (story and/or notes), insertRow (afterRowId omitted = top of section), addSection (afterSectionId omitted = top of page), renameSection. Text uses the scenario markdown dialect: **bold**, _italic_, ||DM secret||, - lists, ### heading, :::read … ::: (read aloud), :::say … :::, :::callout kind=\"check\" tag=\"Перевірка\" … :::, [@Name](character:id) mentions, {{token:red}}. Read the page first to get section and row ids.",
  input: proposeScenarioEditSchema,
  handler: async (ctx, { pageId, summary, ops }) => {
    const page = await loadPageForAi(ctx.campaignId, pageId);

    const resolved = resolveAiOps(page.content, ops);

    if (!resolved.ok) throw new AiToolError(resolved.error);

    const proposal = await createProposal(ctx, page.id, summary, resolved.ops);

    return { proposalId: proposal.id, status: "pending", note: "ДМ побачить картку пропозиції і застосує або відхилить її" };
  },
});
