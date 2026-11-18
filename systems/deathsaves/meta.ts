import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const DEATHSAVES_META = {
    module: 'deathsaves',
    kind: 'addon',
    keys: [],
    aliases: ['deathSave'],
    requires: ['d20'],
    claims: ['combat.onZeroHp'],
    toggle: 'free',
    i18n: { rules: ['rulesDeathSaves'] },
} as const satisfies SystemMeta;
