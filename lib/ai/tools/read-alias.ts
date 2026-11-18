import { callerOf } from './assistant-caller';
import type { AiToolContext } from './define';
import { toolRequestId } from './request-key';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { dispatchAction } from '@/lib/server/assistant/execute';
import { ContentError } from '@/lib/server/content/errors';

/** Thin alias over a catalog read action; unwraps the dispatcher envelope to the legacy output shape. */
export const readAlias =
    (actionId: string) => async (ctx: AiToolContext, input: unknown) => {
        const out = await dispatchAction(
            callerOf(ctx),
            { actionId, input, requestId: toolRequestId(ctx) },
            ctx.abortSignal
        );

        if (out.kind !== 'result')
            throw new ContentError(API_ERRORS.ASSISTANT_READ_CANNOT_WRITE, 403);

        return out.result.data;
    };
