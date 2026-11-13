import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemServer } from '@/lib/server/systems/types';
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
            load: async () => {
                const { moraleCheckSchema } = await import('@/lib/schemas');

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
