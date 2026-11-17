import { createHash, randomUUID } from 'node:crypto';

import type { AiToolContext } from './define';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';

export const toolRequestKey = (runId: string, toolCallId: string) =>
    `${runId}_${createHash('sha256').update(toolCallId).digest('hex')}`;

/** Stable per retry: the same token, JSON-RPC id, tool and arguments map to one key. */
export const mcpRequestKey = (
    tokenId: string,
    rpcId: string | number,
    toolName: string,
    input: unknown
) =>
    `mcp_${createHash('sha256')
        .update(JSON.stringify([tokenId, rpcId, toolName, input ?? null]))
        .digest('hex')
        .slice(0, 48)}`;

export function toolRequestId(ctx: AiToolContext, clientKey?: string): string {
    if (!ctx.caller?.runId) return clientKey ?? ctx.requestKey ?? randomUUID();

    if (!ctx.toolCallId)
        throw new ContentError(API_ERRORS.ASSISTANT_TOOL_CALL_ID_MISSING, 409);

    return toolRequestKey(ctx.caller.runId, ctx.toolCallId);
}
