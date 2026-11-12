import {
    ABILITY_OPTIONS,
    flagSeg,
    listParams,
    PROFICIENCY_OPTIONS,
    SKILL_OPTIONS,
} from '@/lib/utils/abilities/registry/effects/flag-kit';
import type { SystemFlagRows } from '@/lib/utils/abilities/registry/effects/system-flag-row';
import { seg } from '@/lib/utils/abilities/segments';

export const D20_FLAG_ROWS: SystemFlagRows<
    'saveProficiency' | 'skillProficiency' | 'skillExpertise' | 'proficiency'
> = {
    saveProficiency: {
        fields: [
            {
                name: 'abilities',
                input: 'multiselect',
                options: ABILITY_OPTIONS,
            },
        ],
        defaults: { abilities: ['wisdom'] },
        describe: (e) => [
            flagSeg('saveProficiency', listParams('abilities', e.abilities)),
        ],
    },
    skillProficiency: {
        fields: [
            { name: 'skills', input: 'multiselect', options: SKILL_OPTIONS },
        ],
        defaults: { skills: ['perception'] },
        describe: (e) => [
            flagSeg('skillProficiency', listParams('skills', e.skills)),
        ],
    },
    skillExpertise: {
        fields: [
            { name: 'skills', input: 'multiselect', options: SKILL_OPTIONS },
        ],
        defaults: { skills: ['stealth'] },
        describe: (e) => [
            flagSeg('skillExpertise', listParams('skills', e.skills)),
        ],
    },
    proficiency: {
        fields: [
            {
                name: 'kinds',
                input: 'multiselect',
                options: PROFICIENCY_OPTIONS,
            },
        ],
        defaults: { kinds: ['heavy'] },
        describe: (e) => [
            flagSeg('proficiency', {
                list: {
                    join: ', ',
                    items: e.kinds.map((k) => seg(`options.kinds.${k}`)),
                },
            }),
        ],
    },
};
