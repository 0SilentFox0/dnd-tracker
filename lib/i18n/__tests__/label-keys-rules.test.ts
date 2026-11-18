import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { MECHANIC_REGISTRY } from '@/lib/utils/rules';

const MODULE_OWNED = ['morale', 'heroScaling', 'deathSaves'];

const MECHANICS = Object.keys(MECHANIC_REGISTRY).filter(
    (key) => !MODULE_OWNED.includes(key)
);

describe('rules label registries have translations', () => {
    expectLabelKeys(
        'rules',
        'mechanics',
        MECHANICS.flatMap((key) => [`${key}.label`, `${key}.description`])
    );

    expectLabelKeys('rulesMorale', '', [
        'label',
        'description',
        'enabled',
        'cap',
    ]);
    expectLabelKeys('rulesDeathSaves', '', [
        'label',
        'description',
        'enabled',
        'unitsDieAtZero',
    ]);
    expectLabelKeys('rulesHeroScaling', '', [
        'label',
        'description',
        'hpBaseLevels',
        'hpConCoefficient',
        'melee',
        'ranged',
    ]);
    expectLabelKeys('rulesInspiration', '', ['label']);
});
