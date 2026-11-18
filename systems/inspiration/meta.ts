import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const INSPIRATION_META = {
    module: 'inspiration',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: { campaign: ['inspiration'], rules: ['rulesInspiration'] },
    vocab: {
        characterLogTypes: [{ id: 'inspiration', toggle: true }],
    },
} as const satisfies SystemMeta;
