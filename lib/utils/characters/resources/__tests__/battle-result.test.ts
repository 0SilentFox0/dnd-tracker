import { describe, expect, it } from 'vitest';

import { resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    applyBattleResult,
    applyCharacterResources,
    battleResultLogData,
} from '@/lib/utils/characters/resources/battle';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';

const surge = resolved(
    {
        trigger: { event: 'action' },
        limits: { perRest: { rest: 'short', uses: 1 } },
        effects: [{ kind: 'note', text: 'x' }],
    } as never,
    { type: 'class', id: 'fighter' }
);

const hero = (
    over: {
        hp?: number;
        temp?: number;
        status?: string;
        usage?: number;
        exhaustion?: number;
    } = {}
): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        combatStats: {
            ...p.combatStats,
            maxHp: 20,
            currentHp: over.hp ?? 20,
            tempHp: over.temp ?? 0,
            status: (over.status ?? 'active') as never,
        },
        spellcasting: {
            ...p.spellcasting,
            spellSlots: {
                '1': { max: 4, current: 1 },
                '2': { max: 2, current: 2 },
                pact: { max: 2, current: 0, level: 3 },
            },
        },
        battleData: {
            ...p.battleData,
            resolvedAbilities: [surge],
            abilityUsage: over.usage
                ? { [surge.key]: { battle: over.usage, round: 0, turn: 0 } }
                : {},
            activeEffects: over.exhaustion
                ? [
                      {
                          id: 'ex',
                          name: 'Виснаження',
                          type: 'debuff',
                          duration: 99,
                          appliedAt: { round: 1, timestamp: new Date(0) },
                          effects: [
                              { type: 'exhaustion', value: over.exhaustion },
                          ],
                      } as never,
                  ]
                : [],
        },
    };
};

describe('applyBattleResult', () => {
    it('writes HP, temp HP, spent slots, used charges; closes the rest window', () => {
        expect(
            applyBattleResult(
                { shortRestOpen: true, hitDiceSpent: { fighter: 1 } },
                hero({ hp: 7, temp: 3, usage: 1 }),
                WFRP_RULES
            )
        ).toEqual({
            hp: 7,
            tempHp: 3,
            slotsSpent: { '1': 3, pact: 2 },
            hitDiceSpent: { fighter: 1 },
            charges: { [surge.key]: { used: 1, rest: 'short' } },
        });
    });

    it('full HP and nothing spent → only untouched fields remain', () => {
        const fresh = hero();

        fresh.spellcasting.spellSlots = {};

        expect(applyBattleResult({ hp: 3 }, fresh, WFRP_RULES)).toEqual({});
    });

    it('keeps charges of abilities the hero does not have, drops unused own ones', () => {
        expect(
            applyBattleResult(
                {
                    charges: {
                        other: { used: 2, rest: 'long' },
                        [surge.key]: { used: 1, rest: 'short' },
                    },
                },
                hero(),
                WFRP_RULES
            ).charges
        ).toEqual({ other: { used: 2, rest: 'long' } });
    });

    it('dead hero: dead flag and 0 HP', () => {
        expect(
            applyBattleResult({}, hero({ hp: 0, status: 'dead' }), WFRP_RULES)
        ).toMatchObject({ hp: 0, dead: true });
    });

    it('exhaustion level from effects', () => {
        expect(
            applyBattleResult({}, hero({ exhaustion: 2 }), WFRP_RULES)
                .exhaustion
        ).toBe(2);
    });

    it('log data: HP before/after', () => {
        expect(
            battleResultLogData({ hp: 15 }, hero({ hp: 7 }), 'b1')
        ).toMatchObject({
            battleId: 'b1',
            hpBefore: 15,
            hpAfter: 7,
            maxHp: 20,
            dead: false,
        });
    });
});

describe('Fortune sheet <-> battle', () => {
    it('applyCharacterResources copies fortune to battleData; absent -> no field', () => {
        expect(
            applyCharacterResources(
                hero(),
                { inspiration: null, resources: { fortune: 2 } },
                WFRP_RULES
            ).battleData.fortune
        ).toBe(2);
        expect(
            applyCharacterResources(
                hero(),
                { inspiration: null, resources: { hp: 5 } },
                WFRP_RULES
            ).battleData
        ).not.toHaveProperty('fortune');
    });

    it("applyBattleResult writes the participant's fortune back, falling back to the sheet", () => {
        const withFortune = {
            ...hero(),
            battleData: { ...hero().battleData, fortune: 1 },
        };

        expect(
            applyBattleResult({ fortune: 2 }, withFortune, WFRP_RULES).fortune
        ).toBe(1);
        expect(
            applyBattleResult({ fortune: 2 }, hero(), WFRP_RULES).fortune
        ).toBe(2);
        expect(applyBattleResult({}, hero(), WFRP_RULES)).not.toHaveProperty(
            'fortune'
        );
    });
});
