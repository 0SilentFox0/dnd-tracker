import { ASSISTANT_ACTIONS } from './action-definitions';
import type { AssistantActionDef } from './types';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { operationInComposition } from '@/lib/server/systems/registry';
import type { Actor } from '@/lib/utils/api/actor';
import { needFailure } from '@/lib/utils/api/need';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { contentKindsOf } from '@/lib/utils/rules/systems/catalog';

export function createActionCatalog(
    definitions: readonly AssistantActionDef[]
) {
    const actions = new Map<string, AssistantActionDef>();

    for (const def of definitions) {
        if (
            !/^[a-z][a-z-]*(?:\.[a-z][a-z-]*)+$/.test(def.id) ||
            actions.has(def.id)
        )
            throw new ContentError(API_ERRORS.ASSISTANT_ACTION_ID_INVALID, 500);

        actions.set(def.id, def);
    }

    return {
        getAction(id: string): AssistantActionDef {
            const action = actions.get(id);

            if (!action)
                throw new ContentError(
                    API_ERRORS.ASSISTANT_ACTION_UNAVAILABLE,
                    404
                );

            return action;
        },
        listActions(
            actor: Actor,
            rules?: Pick<Ruleset, 'system'>
        ): AssistantActionDef[] {
            if (!actor.isDM || (actor.via === 'token' && !actor.scopes))
                return [];

            // sessionOnly restricts execution, not preparing a proposal for session review.
            return [...actions.values()].filter(
                (def) =>
                    !needFailure(actor, {
                        ...def.need,
                        sessionOnly: undefined,
                    }) &&
                    (!rules ||
                        ((!def.systemOperation ||
                            operationInComposition(
                                rules,
                                def.systemOperation
                            )) &&
                            (!def.contentKind ||
                                contentKindsOf(rules.system).has(
                                    def.contentKind
                                ))))
            );
        },
    };
}

// Domain adapters are connected only after the guarded executor is ready.
export const assistantCatalog = createActionCatalog(ASSISTANT_ACTIONS);

export const getAction = assistantCatalog.getAction;
