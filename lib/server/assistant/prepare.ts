import type { ActionRequest, AssistantCaller } from './types';

import 'server-only';
import { assistantRequestSchema } from '@/lib/schemas/assistant';
import { parseInput } from '@/lib/server/content/errors';
import { requestDigest } from '@/lib/utils/battle/store/stable-json';

export const originKeyOf = (caller: AssistantCaller) =>
    requestDigest({
        campaignId: caller.actor.campaignId,
        channel: caller.channel,
        threadId: caller.threadId,
        tokenId: caller.tokenId,
    });

export function identifyActionRequest(
    caller: AssistantCaller,
    raw: ActionRequest
) {
    const request = parseInput(assistantRequestSchema, raw);

    return {
        request,
        originKey: originKeyOf(caller),
        requestHash: requestDigest({
            actionId: request.actionId,
            input: request.input,
        }),
    };
}
