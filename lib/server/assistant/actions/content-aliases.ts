import type { ActionRequest, AssistantCaller, DispatchResult } from '../types';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { systemContent } from '@/lib/server/systems/registry';

/** Trusted transport supplies caller and stable requestId; never model fields. */
export async function dispatchContentAlias(
    dispatch: (
        caller: AssistantCaller,
        request: ActionRequest
    ) => Promise<DispatchResult>,
    caller: AssistantCaller,
    alias: string,
    input: Record<string, unknown>,
    requestId: string
): Promise<DispatchResult> {
    const kind = String(input.kind);

    let actionId: string;

    let payload: unknown;

    switch (alias) {
        case 'content_kinds':
            actionId = 'content.kinds';
            payload = {};
            break;
        case 'content_schema':
            actionId = 'content.schema';
            payload = input;
            break;
        case 'content_list':
            actionId = `content.${kind}.list`;
            payload = input;
            break;
        case 'content_get':
            actionId = `content.${kind}.get`;
            payload = { id: input.id };
            break;
        case 'get_rules':
            actionId = 'rules.get';
            payload = {};
            break;
        case 'source_diff':
            actionId = 'source.diff';
            payload = {
                query: { scope: input.scope },
                offset: input.offset,
                limit: input.limit,
            };
            break;
        default: {
            const contributed = systemContent('aliases')[alias];

            if (!contributed)
                throw new ContentError(
                    API_ERRORS.ASSISTANT_UNKNOWN_CONTENT_ALIAS,
                    404
                );

            actionId = contributed.actionId;
            payload = contributed.payload(input);
        }
    }

    return dispatch(caller, { actionId, input: payload, requestId });
}
