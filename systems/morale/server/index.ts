import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemServer } from '@/lib/server/systems/types';
import { rollDie } from '@/lib/utils/common/dice';
import { rngOf } from '@/lib/utils/common/rng';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const MORALE_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    battle: {
        'morale-check': {
            settings: {
                access: 'member',
                blockedByMode: true,
                allowWhileAwaitingDm: true,
                respond: 'wrapped',
                missing: API_ERRORS.BATTLE_MORALE_DISABLED,
            },
            serverDice: {
                placeholder: { d10Roll: 1 },
                roll: (ctx) => ({ d10Roll: rollDie(10, rngOf(ctx)) }),
            },
            load: async () => {
                const { moraleCheckSchema } = await import('./battle/schema');

                const { moraleCheckMutation } = await import(
                    './battle/morale-check-mutation'
                );

                return {
                    schema: moraleCheckSchema,
                    mutate: moraleCheckMutation,
                };
            },
        },
    },
}));
