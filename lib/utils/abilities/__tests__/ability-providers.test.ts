import { describe, expect, it } from 'vitest';

import { collectCharacterAbilities } from '@/lib/utils/abilities/build/collect';
import {
    ABILITY_VARIABLES,
    variableNamesOf,
} from '@/lib/utils/abilities/engine/core/variables';
import { RECIPES, recipesOf } from '@/lib/utils/abilities/templates';
import { CORE_RECIPES } from '@/lib/utils/abilities/templates/catalog';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { composition } from '@/lib/utils/rules/systems/catalog';

const BARE = composition({ key: 'dnd5e' });

const HOMM = composition({ key: 'homm' });

const skill = {
    id: 's1',
    name: 'Skill',
    abilities: [
        {
            id: 'a',
            name: 'A',
            trigger: { event: 'passive' },
            effects: [{ kind: 'modifyStat', stat: 'armor', flat: 1 }],
        },
    ],
};

const input = {
    skills: [
        {
            row: skill,
            mainSkillId: 'm',
            level: 'basic',
            mainSkillSpellGroupId: null,
        },
    ],
    race: null,
    artifacts: [],
    completedSets: [{ id: 'set', name: 'Set', abilities: skill.abilities }],
};

describe('ability variables by owner', () => {
    it('d20 owns *_mod and prof, morale owns morale', () => {
        expect(variableNamesOf(BARE).sort()).toEqual([
            'cells_moved',
            'cha_mod',
            'class_level',
            'con_mod',
            'dex_mod',
            'hero_level',
            'int_mod',
            'lost_hp_percent',
            'prof',
            'str_mod',
            'wis_mod',
        ]);
        expect(variableNamesOf(HOMM)).toContain('morale');
    });

    it('registry-wide dictionary still evaluates every name', () => {
        expect(Object.keys(ABILITY_VARIABLES)).toContain('morale');
        expect(ABILITY_VARIABLES.str_mod(createMockParticipant())).toEqual(
            expect.any(Number)
        );
    });
});

describe('recipes by owner', () => {
    it('morale and condition recipes are not core', () => {
        expect(CORE_RECIPES.map((r) => r.id)).not.toContain('morale');
        expect(recipesOf(BARE).map((r) => r.id)).toContain('condition');
        expect(recipesOf(BARE).map((r) => r.id)).not.toContain('morale');
        expect(recipesOf(HOMM).map((r) => r.id)).toContain('morale');
        expect(RECIPES.map((r) => r.id)).toContain('morale');
    });
});

describe('ability sources by owner', () => {
    it('skills need skilltrees and completed sets need artifactsets', () => {
        expect(collectCharacterAbilities(input, BARE)).toEqual([]);
        expect(
            collectCharacterAbilities(input, HOMM).map((a) => a.source.type)
        ).toEqual(['skill', 'artifactSet']);
    });
});
