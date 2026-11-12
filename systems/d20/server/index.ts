import { D20_BALANCE } from './balance';
import { D20_OPERATIONS } from './operations';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemServer } from '@/lib/server/systems/types';

export const D20_MODULE_SERVER: SystemServer = {
    schemas: {},
    balance: D20_BALANCE,
    operations: D20_OPERATIONS,
    routes: {
        character: {
            'level-up': { POST: { operation: 'level-up' } },
            'hit-dice': { POST: { operation: 'hit-dice' } },
            'arcane-recovery': { POST: { operation: 'arcane-recovery' } },
        },
    },
    battle: {
        'crit-choice': {
            settings: {
                access: 'dm',
                allowWhileAwaitingDm: true,
                allowWhileCritPending: true,
                respond: 'wrapped',
                missing: API_ERRORS.CRIT_CHOICE_NONE,
            },
            load: async (deps) => {
                const { critChoiceSchema } = await import('@/lib/schemas');

                const { createCritChoiceMutation } = await import(
                    './battle/crit-choice-mutation'
                );

                return {
                    schema: critChoiceSchema,
                    mutate: createCritChoiceMutation(deps),
                };
            },
        },
    },
};
