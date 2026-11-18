import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const HEROSCALING_META = {
    module: 'heroscaling',
    kind: 'addon',
    keys: [],
    aliases: ['heroScaling'],
    requires: ['d20'],
    claims: ['progression.maxHp'],
    toggle: 'setup',
    i18n: { rules: ['rulesHeroScaling'] },
} as const satisfies SystemMeta;
