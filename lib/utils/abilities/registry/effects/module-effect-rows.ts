import { ownedBy, type SystemEffectRow } from './system-row';

import { installedAbilityModules, onAbilityInstall } from '@/lib/utils/abilities/registry/install';

const rows: SystemEffectRow[] = [];

export const MODULE_EFFECT_ROWS: readonly SystemEffectRow[] = rows;

export const MODULE_EFFECT_DEFAULTS: Record<string, Record<string, unknown>> =
    {};

onAbilityInstall(() => {
    rows.length = 0;
    rows.push(
        ...installedAbilityModules().flatMap(([id, m]) =>
            ownedBy(id, m.moduleEffectRows ?? [])
        )
    );

    for (const r of rows) MODULE_EFFECT_DEFAULTS[r.kind] = r.defaults;
});
