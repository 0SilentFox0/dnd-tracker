import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { recipeOptionKey } from '@/components/abilities/recipes/RecipeForm';
import { CONDITION_REGISTRY } from '@/lib/utils/abilities/registry/conditions';
import { EFFECT_REGISTRY } from '@/lib/utils/abilities/registry/effects';
import { TARGET_KEYS } from '@/lib/utils/abilities/registry/labels';
import { TRIGGER_REGISTRY } from '@/lib/utils/abilities/registry/triggers';
import {
    DAMAGE_FILTER_KINDS,
    STAT_KEYS,
} from '@/lib/utils/abilities/schema/kinds';
import { RECIPES } from '@/lib/utils/abilities/templates';

const keys = <T extends object>(o: T) => Object.keys(o);

describe('ability registry labels have translations', () => {
    expectLabelKeys('abilityRegistry', 'stats', [...STAT_KEYS]);
    expectLabelKeys('abilityRegistry', 'targets', [...TARGET_KEYS]);
    expectLabelKeys('abilityRegistry', 'damageFilters', [
        ...DAMAGE_FILTER_KINDS,
    ]);

    for (const [prefix, registry] of [
        ['effects', EFFECT_REGISTRY],
        ['triggers', TRIGGER_REGISTRY],
        ['conditionTypes', CONDITION_REGISTRY],
    ] as const) {
        expectLabelKeys(
            'abilityRegistry',
            prefix,
            keys(registry).map((id) => `${id}.label`)
        );
    }

    expectLabelKeys(
        'abilityRegistry',
        '',
        RECIPES.flatMap((r) =>
            r.params.flatMap((p) =>
                (p.options ?? [])
                    .map((o) => recipeOptionKey(p, String(o)))
                    .filter((k): k is string => k !== null)
            )
        )
    );
});
