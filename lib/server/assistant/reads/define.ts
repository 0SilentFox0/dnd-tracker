import type { z } from 'zod';

import type { AssistantActionDef, AssistantCaller } from '../types';

import 'server-only';
import type { ActionScope } from '@/lib/constants/ai';
import type { Locale } from '@/lib/i18n/config';
import { jsonContent } from '@/lib/utils/common/json';

export type ReadScope = {
    campaignId: string;
    userId: string;
    locale: Locale;
};

export const readScopeOf = (caller: AssistantCaller): ReadScope => ({
    campaignId: caller.actor.campaignId,
    userId: caller.actor.userId,
    locale: caller.locale,
});

export function readAction<S extends z.ZodType>(def: {
    id: string;
    title: string;
    description: string;
    scope: ActionScope;
    input: S;
    run(scope: ReadScope, input: z.infer<S>): Promise<unknown>;
}): AssistantActionDef {
    return {
        id: def.id,
        title: def.title,
        description: def.description,
        input: def.input,
        need: { access: 'dm', scope: def.scope },
        effect: 'read',
        execute: async (caller, input) => ({
            data: jsonContent(
                await def.run(readScopeOf(caller), input as z.infer<S>)
            ),
            affected: [],
            warnings: [],
        }),
    };
}
