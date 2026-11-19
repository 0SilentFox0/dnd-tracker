import { describe, expect, it } from 'vitest';

import {
    CombatStatus,
    ParticipantSide,
    ParticipantSourceType,
} from '@/lib/constants/battle';
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

const cast = (hp: number, hero = false, rules = DEFAULT_RULES) => {
    const base = makeParticipant({ id: 'c' });

    const caster = {
        ...base,
        spellcasting: {
            ...base.spellcasting,
            spellSlots: { '9': { max: 1, current: 1 } },
        },
    };

    const plain = makeParticipant({
        id: 'e1',
        side: ParticipantSide.ENEMY,
        hp,
        maxHp: 300,
    });

    const foe = hero
        ? {
              ...plain,
              basicInfo: {
                  ...plain.basicInfo,
                  sourceType: ParticipantSourceType.CHARACTER,
              },
          }
        : plain;

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
        rules,
        map,
    });

    return out.allParticipantsUpdated?.find((p) => p.basicInfo.id === 'e1');
};

describe('killIfHpAtMost', () => {
    it('kills a target at or below the threshold regardless of the roll', () => {
        expect(cast(100)?.combatStats.currentHp).toBe(0);
    });

    it('drops a monster to 0 HP and out of the fight', () => {
        const foe = cast(100);

        expect(foe?.combatStats.currentHp).toBe(0);
        expect(foe?.combatStats.status).not.toBe(CombatStatus.ACTIVE);
    });

    it('kills a hero outright instead of starting death saves', () => {
        const rules = {
            ...DEFAULT_RULES,
            deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true },
        };

        expect(cast(100, true, rules)?.combatStats.status).toBe(
            CombatStatus.DEAD
        );
    });

    it('rolls normal damage above the threshold', () => {
        expect(cast(250)?.combatStats.currentHp).toBe(238);
    });
});
