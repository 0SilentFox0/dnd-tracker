import type { McpServer } from "@modelcontextprotocol/server";
import { tool, type ToolSet } from "ai";
import type { z } from "zod";

import { type AiToolContext, type AiToolDef, runTool } from "./define";
import { listScenarioPagesTool, readScenarioPageTool, searchScenarioTool } from "./scenario-read";

import "server-only";

export const AI_TOOLS: AiToolDef[] = [listScenarioPagesTool, readScenarioPageTool, searchScenarioTool];

export function toAiSdkTools(ctx: AiToolContext): ToolSet {
  return Object.fromEntries(AI_TOOLS.map((def) => [def.name, tool({ description: def.description, inputSchema: def.input, execute: (input: unknown) => runTool(def, ctx, input) })]));
}

export function registerMcpTools(server: McpServer, ctx: AiToolContext): void {
  for (const def of AI_TOOLS) {
    server.registerTool(def.name, { title: def.title, description: def.description, inputSchema: def.input as z.ZodObject }, async (input: unknown) => ({
      content: [{ type: "text" as const, text: await runTool(def, ctx, input) }],
    }));
  }
}
