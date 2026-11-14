import type { Owned } from './owned';

import type { AbilityVariables } from '@/lib/utils/abilities/engine/core/variables';
import { installedAbilityModules, onAbilityInstall } from '@/lib/utils/abilities/registry/install';

const owners: Owned<AbilityVariables>[] = [];

export const SYSTEM_ABILITY_VARIABLES: readonly Owned<AbilityVariables>[] =
    owners;

onAbilityInstall(() => {
    owners.length = 0;
    owners.push(
        ...installedAbilityModules().flatMap(([system, m]) =>
            m.variables ? [{ system, items: m.variables }] : []
        )
    );
});
