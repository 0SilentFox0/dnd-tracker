import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const MORALE_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    battle: {
        'morale-check': {
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
