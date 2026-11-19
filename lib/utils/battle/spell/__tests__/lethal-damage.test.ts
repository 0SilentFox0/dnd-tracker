import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 20,
    rows: 20,
    background: null,
    opacity: 0.3,
};

const spell: CastableSpell = {
    id: 'pwk',
    name: 'Word of Ruin',
    level: 9,
    groupId: 'g',
    definition: {
        dice: 12,
        dieSides: 12,
        cost: 'action',
        targeting: { kind: 'enemy', range: 60 },
        resolution: { kind: 'auto' },
        effects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'psychic',
                killIfHpAtMost: 100,
            },
        ],
        raceModifiers: [],
    },
};

const cast = (hp: number) => {
    const caster = makeParticipant({ id: 'c' });

    const foe = makeParticipant({
        id: 'e1',
        side: ParticipantSide.ENEMY,
        hp,
        maxHp: 300,
    });

    const out = castSpell({
        caster,
        spell,
        targetIds: ['e1'],
        allParticipants: [caster, foe],
        currentRound: 1,
        battleId: 'b',
        diceRolls: Array(12).fill(1),
        dice: { count: 12, sides: 12 },
        rng: seq(0.5),
        rules: DEFAULT_RULES,
        map,
    });

    return out.allParticipantsUpdated?.find((p) => p.basicInfo.id === 'e1');
};

describe('killIfHpAtMost', () => {
    it('kills a target at or below the threshold regardless of the roll', () => {
        expect(cast(100)?.combatStats.currentHp).toBe(0);
    });

    it('rolls normal damage above the threshold', () => {
        expect(cast(250)?.combatStats.currentHp).toBe(238);
    });
});
