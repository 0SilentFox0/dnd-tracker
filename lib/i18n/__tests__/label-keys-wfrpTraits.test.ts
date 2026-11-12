import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { TRAIT_RECIPES } from '@/systems/wfrp/rules/traits/recipes';

describe('wfrp trait recipes have translations', () => {
    for (const r of TRAIT_RECIPES) {
        const prefix = r.textKey?.replace(/^wfrpTraits\./, '') ?? r.id;

        expectLabelKeys('wfrpTraits', prefix, ['label', 'hint', 'defaultName']);
        expectLabelKeys(
            'wfrpTraits',
            `${prefix}.params`,
            r.params.map((p) => p.key)
        );

        for (const p of r.params)
            if (p.options)
                expectLabelKeys(
                    'wfrpTraits',
                    `${prefix}.options.${p.key}`,
                    p.options
                );
    }
});
