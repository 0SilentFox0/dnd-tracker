import { describe, expect, it } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { getHeroDamageDiceForLevel } from '@/lib/constants/hero-scaling';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { attackDamageParts } from '@/lib/utils/battle/damage/attack-parts';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const base = createMockParticipant();

const heroAt = (
    level: number,
    heroDice?: BattleParticipant['abilities']['heroDice']
) =>
    createMockParticipant({
        abilities: { ...base.abilities, level, heroDice },
    });

const melee: BattleAttack = {
    id: 'm',
    name: 'Меч',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d8',
    damageType: 'slashing',
};

const ranged: BattleAttack = {
    ...melee,
    id: 'r',
    name: 'Лук',
    type: AttackType.RANGED,
};

describe('кубики героя з правил кампанії', () => {
    it('без heroDice — типова прогресія', () => {
        expect(
            attackDamageParts(heroAt(5), melee, DEFAULT_RULES).extraDice
        ).toBe(getHeroDamageDiceForLevel(5, AttackType.MELEE));
    });

    it('таблиця melee діє на своєму рівні, ranged лишається типовим', () => {
        const p = heroAt(5, { melee: { 5: '2d10' } });

        expect(attackDamageParts(p, melee, DEFAULT_RULES).extraDice).toBe(
            '2d10'
        );
        expect(attackDamageParts(p, ranged, DEFAULT_RULES).extraDice).toBe(
            getHeroDamageDiceForLevel(5, AttackType.RANGED)
        );
    });

    it('часткова таблиця: рівні поза нею беруться зі стандартної прогресії', () => {
        const standard = attackDamageParts(
            heroAt(6),
            melee,
            DEFAULT_RULES
        ).extraDice;

        expect(
            attackDamageParts(
                heroAt(6, { melee: { 5: '2d10', 20: '9d4' } }),
                melee,
                DEFAULT_RULES
            ).extraDice
        ).toBe(standard);
        expect(
            attackDamageParts(
                heroAt(5, { melee: { 5: '2d10' } }),
                melee,
                DEFAULT_RULES
            ).extraDice
        ).toBe('2d10');
    });
});
