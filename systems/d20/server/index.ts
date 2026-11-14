import { z } from 'zod';

import type { CoreActionBody } from '../rules/actions/schema';
import { backgroundsResource } from './content/backgrounds';
import { classesResource } from './content/classes';
import { D20_BALANCE } from './balance';
import { D20_OPERATIONS } from './operations';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemServer } from '@/lib/server/systems/types';
import type { LegendaryActionBody } from '@/lib/utils/battle/actions/schema';

type CoreActionRouteBody = CoreActionBody | LegendaryActionBody;

export const D20_MODULE_SERVER: SystemServer = {
    schemas: {},
    balance: D20_BALANCE,
    operations: D20_OPERATIONS,
    contentKinds: {
        classes: { resource: classesResource },
        backgrounds: { resource: backgroundsResource },
    },
    routes: {
        character: {
            'level-up': { POST: { operation: 'level-up' } },
            'hit-dice': { POST: { operation: 'hit-dice' } },
            'arcane-recovery': { POST: { operation: 'arcane-recovery' } },
        },
    },
    battle: {
        'core-action': {
            settings: {
                access: 'member',
                blockedByMode: true,
                missing: API_ERRORS.BATTLE_CORE_ACTIONS_DISABLED,
            },
            load: async (deps) => {
                const { coreActionSchema } = await import(
                    '../rules/actions/schema'
                );

                const { legendaryActionSchema } = await import(
                    '@/lib/utils/battle/actions/schema'
                );

                const { coreActionMutation } = await import(
                    './battle/core-action-mutation'
                );

                return {
                    schema: z.union([coreActionSchema, legendaryActionSchema]),
                    mutate: (ctx, body: CoreActionRouteBody) =>
                        body.action === 'legendary'
                            ? deps.legendary(ctx, body)
                            : coreActionMutation(ctx, body),
                };
            },
        },
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
