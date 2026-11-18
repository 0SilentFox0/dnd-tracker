import { describe, expect, it } from 'vitest';

import { MAIN_SKILL_ROLES } from '@/lib/constants/main-skills';
import { SKILLTREES_IMPORT_SPECS } from '@/systems/skilltrees/rules/import-specs';

const skills = SKILLTREES_IMPORT_SPECS.skills;

const field = (spec: typeof skills, key: string) =>
    spec.fields.find((f) => f.key === key);

describe('skilltrees import specs', () => {
    it('registers a spec per content kind', () => {
        expect(Object.keys(SKILLTREES_IMPORT_SPECS).sort()).toEqual([
            'main-skills',
            'skills',
        ]);
        expect(skills.kind).toBe('skills');
    });

    it('main skills: name and colour are required, role is an enum, spell group a ref', () => {
        const spec = SKILLTREES_IMPORT_SPECS['main-skills'];

        expect(field(spec, 'name')?.required).toBe(true);
        expect(field(spec, 'color')?.required).toBe(true);
        expect(field(spec, 'role')?.enumValues).toEqual(MAIN_SKILL_ROLES);
        expect(field(spec, 'spellGroupId')).toMatchObject({
            type: 'ref',
            ref: 'spell-groups',
        });
        expect(field(spec, 'name')?.labelKey).toBe(
            'contentImport.fields.main-skills.name'
        );
    });

    it('skills: references point to their content kinds', () => {
        expect(field(skills, 'mainSkillId')?.ref).toBe('main-skills');
        expect(field(skills, 'spellId')?.ref).toBe('spells');
        expect(field(skills, 'grantedSpellId')?.ref).toBe('spells');
        expect(field(skills, 'spellGroupId')?.ref).toBe('spell-groups');
    });

    it('skills toBody on create groups fields and always emits all groups', () => {
        const body = skills.toBody?.(
            {
                name: 'Bash',
                description: 'd',
                abilities: [],
                image: 'i.png',
                mainSkillId: 'm',
            },
            'create'
        );

        expect(body).toEqual({
            abilities: [],
            image: 'i.png',
            basicInfo: { name: 'Bash', description: 'd' },
            spellData: {},
            mainSkillData: { mainSkillId: 'm' },
        });
    });

    it('skills toBody on update emits only groups that have values', () => {
        const body = skills.toBody?.({ spellId: null, name: undefined }, 'update');

        expect(body).toEqual({ spellData: { spellId: null } });
    });

    it('skills toBody ignores unknown keys', () => {
        expect(skills.toBody?.({ bogus: 1 }, 'update')).toEqual({});
    });
});
