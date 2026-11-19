import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';

const aid: CastableSpell = {
    id: 'aid',
    name: 'Aid',
    level: 2,
    groupId: 'Abjuration',
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'area', side: 'ally', maxTargets: 3 },
        resolution: { kind: 'auto' },
        effects: [
            { kind: 'maxHpBoost', amount: 5, upcastAmount: 5 },
        ] as SpellEffect[],
        raceModifiers: [],
    },
};

const castAt = (castLevel: number) => {
    const c = makeParticipant({ id: 'c' });

    const ally = makeParticipant({ id: 'a' });

    const caster = {
        ...c,
        spellcasting: {
            ...c.spellcasting,
            spellSlots: { '2': { max: 1, current: 1 }, '4': { max: 1, current: 1 } },
        },
    };

    const r = castSpell({
        rules: DEFAULT_RULES,
        caster,
        spell: aid,
        targetIds: ['a'],
        allParticipants: [caster, ally],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0.5,
        castLevel,
        slotKey: String(castLevel),
    });

    const before = ally.combatStats.maxHp;

    const after = r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'a')!;

    return after.combatStats.maxHp - before;
};

describe('Aid upcast', () => {
    it('adds 5 max HP at level 2 and 5 more per slot level above', () => {
        expect(castAt(2)).toBe(5);
        expect(castAt(4)).toBe(15);
    });
});
