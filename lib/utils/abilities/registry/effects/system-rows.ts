import { MODULE_EFFECT_ROWS } from './module-effect-rows';
import type { EffectOwnership } from './ownership';
import { SYSTEM_FLAG_OWNERS } from './system-flag-rows';
import { ownedBy, type SystemEffectRow } from './system-row';

import { installedAbilityModules, onAbilityInstall } from '@/lib/utils/abilities/registry/install';

const rows: SystemEffectRow[] = [];

export const SYSTEM_EFFECT_ROWS: readonly SystemEffectRow[] = rows;

export const SYSTEM_EFFECT_DEFAULTS: Record<string, Record<string, unknown>> =
    {};

const kinds: Record<string, string> = {};

const flags: Record<string, string> = {};

export const isSystemEffectKind = (kind: string): boolean =>
    Object.hasOwn(SYSTEM_EFFECT_DEFAULTS, kind);

export const SYSTEM_EFFECT_OWNERSHIP: EffectOwnership = { kinds, flags };

onAbilityInstall(() => {
    rows.length = 0;
    rows.push(
        ...installedAbilityModules().flatMap(([id, m]) =>
            ownedBy(id, m.effectRows ?? [])
        )
    );

    for (const r of rows) SYSTEM_EFFECT_DEFAULTS[r.kind] = r.defaults;

    for (const r of [...rows, ...MODULE_EFFECT_ROWS]) kinds[r.kind] = r.system;

    Object.assign(flags, SYSTEM_FLAG_OWNERS);
});
