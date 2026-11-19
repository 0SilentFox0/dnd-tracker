import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { CharacteristicsSchema } from '@/systems/wfrp/rules/characteristics/schema';
import { weaponSkillTarget } from '@/systems/wfrp/rules/edition/attack-skill';

const chars = CharacteristicsSchema.parse({
    base: { ws: 40, bs: 30 },
    skillAdvances: {
        'melee:fencing': 5,
        'ranged:bow': 10,
        'melee:two-handed': 3,
    },
});

describe('canon: weapon skill targets (p39, p166)', () => {
    bookExample(
        166,
        'an attack with Advances in the group tests Weapon Skill plus Advances',
        () => {
            expect(weaponSkillTarget(chars, 'melee', 'fencing')).toBe(45);
            expect(weaponSkillTarget(chars, 'ranged', 'bow')).toBe(40);
        }
    );

    bookExample(
        166,
        'a group without Advances tests the bare characteristic',
        () => {
            expect(weaponSkillTarget(chars, 'melee', 'flail')).toBe(40);
            expect(weaponSkillTarget(chars, 'ranged', 'crossbow')).toBe(30);
        }
    );

    bookExample(39, 'Melee (Basic) is trained with no Advances', () => {
        expect(weaponSkillTarget(chars, 'melee', 'basic')).toBe(40);
    });

    bookExample(
        166,
        'the two-handed weapon group maps to its skill speciality',
        () => {
            expect(weaponSkillTarget(chars, 'melee', 'twohanded')).toBe(43);
        }
    );

    bookExample(166, 'no group means no skill', () => {
        expect(weaponSkillTarget(chars, 'melee', undefined)).toBeUndefined();
    });
});
