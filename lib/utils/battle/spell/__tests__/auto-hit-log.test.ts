import { describe, expect, it, vi } from 'vitest';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { castSpell } from '@/lib/utils/battle/spell';
import { fireTrigger } from '@/lib/utils/battle/spell/zone-fire';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleMapConfig } from '@/types/battle-grid';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

const map: BattleMapConfig = {
    cols: 20,
    rows: 20,
    background: null,
    opacity: 0.3,
};

describe('a base without attack rolls', () => {
    it('logs an automatic spell hit', () => {
        const caster = makeParticipant({ id: 'c' });

        const foe = makeParticipant({
            id: 'e1',
            side: ParticipantSide.ENEMY,
            hp: 200,
            maxHp: 200,
        });

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

        const out = castSpell({
            caster,
            spell,
            targetIds: ['e1'],
            allParticipants: [caster, foe],
            currentRound: 1,
            battleId: 'b',
            diceRolls: [3, 3],
            dice: { count: 2, sides: 6 },
            rng: seq(0.5),
            rules: DEFAULT_RULES,
            map,
        });

        expect(JSON.stringify(out.messages)).toContain(
            'battleActions.spell.attackAuto'
        );
    });

    it('logs an automatic zone hit', () => {
        const owner = createMockParticipant();

        const target = createMockParticipant({
            basicInfo: {
                ...createMockParticipant().basicInfo,
                id: 'foe',
                side: ParticipantSide.ENEMY,
            },
        });

        const res = fireTrigger(
            [owner, target],
            {
                casterId: owner.basicInfo.id,
                spellId: 's',
                spellName: 'Fire',
                side: 'enemies',
                hitKey: 'k',
            },
            { attack: true, effects: [] } as never,
            'onTurnStart',
            'foe',
            { map, round: 1, rng: () => 0, rules: DEFAULT_RULES }
        );

        expect(JSON.stringify(res.messages)).toContain(
            'battleLog.spellFx.zoneAutoHit'
        );
    });
});
