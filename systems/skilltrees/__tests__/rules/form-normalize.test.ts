import { describe, expect, it } from 'vitest';

import { initialSkillFormValues } from '@/systems/skilltrees/rules/form/normalize';
import type { Skill } from '@/types/skills';

describe('initialSkillFormValues', () => {
    it('gives empty defaults for a new skill', () => {
        expect(initialSkillFormValues(undefined)).toEqual({
            name: '',
            description: '',
            icon: '',
            abilities: [],
            spellId: null,
            spellGroupId: null,
            grantedSpellId: null,
            mainSkillId: null,
        });
    });

    it('copies stored values and turns missing ones into form defaults', () => {
        const skill = {
            name: 'Bash',
            description: null,
            icon: 'x.png',
            abilities: undefined,
            spellId: 'sp',
            spellGroupId: '',
            grantedSpellId: 'g',
            mainSkillId: 'm',
        } as unknown as Skill;

        expect(initialSkillFormValues(skill)).toEqual({
            name: 'Bash',
            description: '',
            icon: 'x.png',
            abilities: [],
            spellId: 'sp',
            spellGroupId: null,
            grantedSpellId: 'g',
            mainSkillId: 'm',
        });
    });
});
