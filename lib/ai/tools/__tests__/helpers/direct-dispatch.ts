import type { AiToolContext } from '@/lib/ai/tools/define';
import { AI_READ_ACTIONS } from '@/lib/server/assistant/reads';
import type { AssistantCaller } from '@/lib/server/assistant/types';

/** Executes catalog read actions directly (no DB authorization) so tool logic tests stay unit-level. */
export const directDispatchModule = () => ({
    dispatchAction: async (
        caller: AssistantCaller,
        request: { actionId: string; input: unknown }
    ) => {
        const action = AI_READ_ACTIONS.find((a) => a.id === request.actionId);

        if (!action || action.effect !== 'read')
            throw new Error(`no read action ${request.actionId}`);

        return {
            kind: 'result' as const,
            result: await action.execute(
                caller,
                action.input.parse(request.input)
            ),
        };
    },
});

export const chatToolCtx = (
    over: Partial<AiToolContext> = {}
): AiToolContext => {
    const campaignId = over.campaignId ?? 'camp1';

    const userId = over.userId ?? 'dm';

    const locale = over.locale ?? 'uk';

    return {
        campaignId,
        userId,
        scopes: ['scenario:read'],
        threadId: null,
        locale,
        caller: {
            actor: {
                campaignId,
                userId,
                isDM: true,
                via: 'session',
                scopes: null,
            },
            channel: 'chat',
            threadId: null,
            tokenId: null,
            locale,
        },
        ...over,
    };
};
