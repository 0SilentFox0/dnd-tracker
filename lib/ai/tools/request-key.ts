import { createHash, randomUUID } from 'node:crypto';

import { callerOf } from './assistant-caller';
import type { AiToolContext } from './define';

import 'server-only';
import { AI_LIMITS } from '@/lib/constants/ai';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { originKeyOf } from '@/lib/server/assistant/prepare';
import { ContentError } from '@/lib/server/content/errors';
import { stableStringify } from '@/lib/utils/battle/store/stable-json';

export const toolRequestKey = (runId: string, toolCallId: string) =>
    `${runId}_${createHash('sha256').update(toolCallId).digest('hex')}`;

const derivedKey = (
    tokenId: string,
    toolName: string,
    input: unknown,
    bucket: number
) =>
    `mcpd_${createHash('sha256')
        .update(stableStringify([tokenId, toolName, input ?? null, bucket]))
        .digest('hex')
        .slice(0, 48)}`;

/**
 * The server is stateless and JSON-RPC ids are not unique across clients, so a write without a
 * client requestId is keyed by token + tool + canonical args inside a fixed time bucket.
 */
export const mcpDerivedKeys = (
    tokenId: string,
    toolName: string,
    input: unknown,
    now = Date.now()
): readonly [string, string] => {
    const bucket = Math.floor(now / AI_LIMITS.mcpDedupeWindowMs);

    return [
        derivedKey(tokenId, toolName, input, bucket),
        derivedKey(tokenId, toolName, input, bucket - 1),
    ];
};

export function toolRequestId(ctx: AiToolContext, clientKey?: string): string {
    if (!ctx.caller?.runId) return clientKey ?? randomUUID();

    if (!ctx.toolCallId)
        throw new ContentError(API_ERRORS.ASSISTANT_TOOL_CALL_ID_MISSING, 409);

    return toolRequestKey(ctx.caller.runId, ctx.toolCallId);
}

/** Write key: client requestId wins, then the derived MCP key (the previous bucket's key when it is already in use, so a retry across a boundary still dedupes). */
export async function writeRequestId(
    ctx: AiToolContext,
    clientKey?: string
): Promise<string> {
    if (clientKey || ctx.caller?.runId || !ctx.requestKeys)
        return toolRequestId(ctx, clientKey);

    const [current, previous] = ctx.requestKeys;

    const caller = callerOf(ctx);

    const used = await prisma.assistantIntent.findFirst({
        where: {
            campaignId: caller.actor.campaignId,
            userId: caller.actor.userId,
            originKey: originKeyOf(caller),
            requestId: previous,
        },
        select: { id: true },
    });

    return used ? previous : current;
}
