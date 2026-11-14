import { describe, expect, it } from 'vitest';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { critRulesOf } from '@/lib/utils/battle/attack/crit-rules';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { parseRules } from '@/lib/utils/rules/schema';

const wfrp = parseRules({ system: { key: 'wfrp' } });

const spell: CastableSpell = {
    id: 'sp',
    name: 'Bolt',
    level: 0,
    groupId: 'g',
    definition: {
        dice: 2,
        cost: 'action',
        targeting: { kind: 'enemy', range: 60 },
        resolution: { kind: 'attack' },
        effects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'fire',
            },
        ],
        raceModifiers: [],
    },
};

const cast = (roll: number) => {
    const caster = makeParticipant({ id: 'c' });

    const foe = makeParticipant({
        id: 'e1',
        side: ParticipantSide.ENEMY,
        hp: 200,
        maxHp: 200,
    });

    const out = castSpell({
        caster,
        spell,
        targetIds: ['e1'],
        allParticipants: [caster, foe],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [3, 3],
        dice: { count: 2, sides: 6 },
        attackRolls: [{ participantId: 'e1', roll }],
        rng: seq(0.5),
        rules: wfrp,
    });

    const e = out.allParticipantsUpdated.find((p) => p.basicInfo.id === 'e1')!;

    return {
        hp: e.combatStats.currentHp,
        effects: e.battleData.activeEffects.map((x) => x.id),
        messages: JSON.stringify(out.messages),
        success: out.success,
        reason: out.reason,
    };
};

describe('wfrp spell attack outcome around the crit fallback', () => {
    it.each([20, 1, 10])('roll %i', (roll) => {
        expect(cast(roll)).toMatchSnapshot();
    });

    it('wfrp has no crit hook: fallback effects true before E4, false after (owner-approved fix)', () => {
        expect(critRulesOf(wfrp)).toEqual({
            critOn: 20,
            disabledFail: [],
            disabledSuccess: [],
            doubleDice: false,
            effects: false,
            fumbleOn: 1,
        });
    });
});
