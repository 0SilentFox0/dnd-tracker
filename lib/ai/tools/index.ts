import type { McpServer } from '@modelcontextprotocol/server';
import { tool, type ToolSet } from 'ai';
import type { z } from 'zod';

import { ASSISTANT_TOOLS } from './assistant';
import { getBattleStateTool } from './battle';
import { getCampaignBriefTool } from './campaign';
import { CONTENT_TOOLS } from './content';
import {
    type AiToolContext,
    type AiToolDef,
    runTool,
    runToolResult,
    toolOutputSchema,
} from './define';
import { getPartyTool, readCharacterTool } from './party';
import { proposeScenarioEditTool } from './propose';
import { readReferenceTool, searchReferenceTool } from './reference';
import { mcpRequestKey } from './request-key';
import {
    findScenarioMentionsTool,
    listScenarioPagesTool,
    outlineScenarioPageTool,
    readScenarioPageTool,
    searchScenarioTool,
} from './scenario-read';
import { getShowStateTool } from './show';
import { WORLD_TOOLS } from './world';

import 'server-only';
import { type ApiTokenScope, hasScope } from '@/lib/constants/ai';

export const AI_TOOLS: AiToolDef[] = [
    getCampaignBriefTool,
    listScenarioPagesTool,
    readScenarioPageTool,
    outlineScenarioPageTool,
    findScenarioMentionsTool,
    searchScenarioTool,
    getPartyTool,
    readCharacterTool,
    getShowStateTool,
    ...WORLD_TOOLS,
    getBattleStateTool,
    searchReferenceTool,
    readReferenceTool,
    proposeScenarioEditTool,
    ...CONTENT_TOOLS,
    ...ASSISTANT_TOOLS,
];

export const toolsFor = (scopes: readonly ApiTokenScope[]): AiToolDef[] =>
    AI_TOOLS.filter((def) => def.scopes.some((s) => hasScope(scopes, s)));

export function toAiSdkTools(base: AiToolContext): ToolSet {
    const ctx = { ...base, usage: { images: 0 } };

    return Object.fromEntries(
        toolsFor(base.scopes).map((def) => [
            def.name,
            tool({
                description: def.description,
                inputSchema: def.input,
                execute: (input: unknown, options) =>
                    runTool(
                        def,
                        { ...ctx, toolCallId: options.toolCallId },
                        input
                    ),
            }),
        ])
    );
}

export function registerMcpTools(
    server: McpServer,
    tools: readonly AiToolDef[],
    base: AiToolContext
): void {
    const ctx = { ...base, usage: { images: 0 } };

    for (const def of tools) {
        server.registerTool(
            def.name,
            {
                title: def.title,
                description: def.description,
                inputSchema: def.input as z.ZodObject,
                outputSchema: toolOutputSchema,
            },
            async (input: unknown, extra) => {
                const tokenId = base.caller?.tokenId;

                const result = await runToolResult(
                    def,
                    {
                        ...ctx,
                        ...(tokenId && extra?.mcpReq
                            ? {
                                  requestKey: mcpRequestKey(
                                      tokenId,
                                      extra.mcpReq.id,
                                      def.name,
                                      input
                                  ),
                              }
                            : {}),
                    },
                    input
                );

                return {
                    content: [
                        { type: 'text' as const, text: JSON.stringify(result) },
                    ],
                    structuredContent: result,
                    isError: result.kind === 'error',
                };
            }
        );
    }
}
