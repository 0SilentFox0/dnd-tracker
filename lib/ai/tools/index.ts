import type { McpServer } from "@modelcontextprotocol/server";
import { tool, type ToolSet } from "ai";
import type { z } from "zod";

import { getBattleStateTool } from "./battle";
import { getCampaignBriefTool } from "./campaign";
import { CONTENT_TOOLS } from "./content";
import { type AiToolContext, type AiToolDef, runTool } from "./define";
import { getPartyTool, readCharacterTool } from "./party";
import { proposeScenarioEditTool } from "./propose";
import { proposeSceneSlideTool } from "./propose-slide";
import { readReferenceTool, searchReferenceTool } from "./reference";
import { listScenarioPagesTool, readScenarioPageTool, searchScenarioTool } from "./scenario-read";
import { getShowStateTool } from "./show";

import "server-only";
import { type ApiTokenScope, hasScope } from "@/lib/constants/ai";

export const AI_TOOLS: AiToolDef[] = [getCampaignBriefTool, listScenarioPagesTool, readScenarioPageTool, searchScenarioTool,
  getPartyTool,
  readCharacterTool,
  getShowStateTool,
  getBattleStateTool,
  searchReferenceTool,
  readReferenceTool,
  proposeScenarioEditTool,
  proposeSceneSlideTool,
  ...CONTENT_TOOLS,
];

export const toolsFor = (scopes: readonly ApiTokenScope[]): AiToolDef[] => AI_TOOLS.filter((def) => def.scopes.some((s) => hasScope(scopes, s)));

export function toAiSdkTools(base: AiToolContext): ToolSet {
  const ctx = { ...base, usage: { images: 0 } };

  return Object.fromEntries(toolsFor(base.scopes).map((def) => [def.name, tool({ description: def.description, inputSchema: def.input, execute: (input: unknown) => runTool(def, ctx, input) })]));
}

export function registerMcpTools(server: McpServer, tools: readonly AiToolDef[], base: AiToolContext): void {
  const ctx = { ...base, usage: { images: 0 } };

  for (const def of tools) {
    server.registerTool(def.name, { title: def.title, description: def.description, inputSchema: def.input as z.ZodObject }, async (input: unknown) => ({
      content: [{ type: "text" as const, text: await runTool(def, ctx, input) }],
    }));
  }
}
