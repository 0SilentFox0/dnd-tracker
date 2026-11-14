import type { FlagDefinition } from './flag-kit';

import { installedAbilityModules, onAbilityInstall } from '@/lib/utils/abilities/registry/install';
import type { FlagKey } from '@/lib/utils/abilities/schema';

export const SYSTEM_FLAG_ROWS = {} as {
    [K in FlagKey]?: FlagDefinition<K>;
};

export const SYSTEM_FLAG_OWNERS: Record<string, string> = {};

onAbilityInstall(() => {
    for (const [system, m] of installedAbilityModules())
        for (const [flag, row] of Object.entries(m.flagRows ?? {})) {
            (SYSTEM_FLAG_ROWS as Record<string, unknown>)[flag] = row;
            SYSTEM_FLAG_OWNERS[flag] = system;
        }
});
