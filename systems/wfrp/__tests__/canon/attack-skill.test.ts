import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { CharacteristicsSchema } from '@/systems/wfrp/rules/characteristics/schema';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { wfrpAttackTarget } from '@/systems/wfrp/rules/combat/resolve-attack';
import { weaponSkillTarget } from '@/systems/wfrp/rules/edition/attack-skill';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

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

describe('canon: attack target label in the UI (p166)', () => {
    const attacker = (): BattleParticipant => {
        const base = makeParticipant({ id: 'a' });

        return {
            ...base,
            abilities: { ...base.abilities, ...wfrpAbilitiesOf(chars) },
        };
    };

    const sword = (group: string): BattleAttack => ({
        id: 's',
        name: 'Sword',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '1d6',
        damageType: 'slashing',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [], group }),
    });

    const canon = RulesetSchema.parse({
        ...WFRP_RULES,
        edition: { preset: 'canon5e' },
    });

    bookExample(166, 'canon shows the weapon skill and its target', () => {
        const r = wfrpAttackTarget(attacker(), sword('fencing'), canon);

        expect(r.target).toBe(45);
        expect(JSON.stringify(r.label)).toContain('gameTerms.wfrpSkills.melee');
        expect(JSON.stringify(r.label)).toContain(
            'gameTerms.wfrpSpecs.melee.fencing'
        );
    });

    bookExample(166, 'the legacy edition keeps the characteristic', () => {
        const r = wfrpAttackTarget(attacker(), sword('fencing'), WFRP_RULES);

        expect(r.target).toBe(40);
        expect(r.label).toEqual(
            textRef('gameTerms.characteristics.ws.label')
        );
    });
});
