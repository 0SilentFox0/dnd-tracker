import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { type Ruleset } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { canonDefence } from '@/systems/wfrp/rules/combat/defence';
import { wfrpInitiative } from '@/systems/wfrp/rules/combat/initiative';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { qualityList } from '@/systems/wfrp/rules/equipment/guard';
import type { QualityRef } from '@/systems/wfrp/rules/equipment/qualities';
import { WfrpItemStatsSchema } from '@/systems/wfrp/rules/equipment/stats';
import { canonEngageCells } from '@/systems/wfrp/rules/equipment/weapon-profile';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT, type WfrpAttackSlot } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = {
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
} as unknown as Ruleset;

const weapon = (
    id: string,
    slot: Partial<WfrpAttackSlot> & { qualities?: QualityRef[] } = {}
): BattleAttack => ({
    id,
    name: id,
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '',
    damageType: 'physical',
    system: ATTACK_SLOT.write({ qualities: [], flaws: [], ...slot }),
});

const fighter = (
    attacks: BattleAttack[],
    gear?: { shield?: number }
): BattleParticipant => {
    const p = makeParticipant({ id: 'd', hp: 30, maxHp: 30 });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
                ap: { head: 0, arm: 0, body: 0, leg: 0 },
                ...gear,
            }),
        },
        battleData: { ...p.battleData, attacks },
    };
};

const defend = (
    defenderWeapons: BattleAttack[],
    incoming: BattleAttack = weapon('in'),
    gear?: { shield?: number }
) => canonDefence(fighter(defenderWeapons, gear), incoming, CANON);

describe('canon: defensive qualities and shields (p300, p304-306)', () => {
    bookExample(
        304,
        'p304 Defensive gives +1 SL to the defending Melee Test',
        () => {
            expect(
                defend([weapon('w', { qualities: [{ key: 'defensive' }] })]).sl
                    .parry
            ).toBe(1);
        }
    );

    bookExample(304, 'p304 Unbalanced takes precedence over Defensive', () => {
        expect(
            defend([
                weapon('w', {
                    qualities: [{ key: 'defensive' }],
                    flaws: [{ key: 'unbalanced' }],
                }),
            ]).sl.parry
        ).toBe(-1);
    });

    bookExample(305, 'p305 Unbalanced costs 1 SL when defending', () => {
        expect(
            defend([weapon('w', { flaws: [{ key: 'unbalanced' }] })]).sl.parry
        ).toBe(-1);
    });

    bookExample(
        305,
        'p305 Wrap: Melee Tests opposing the weapon take -1 SL',
        () => {
            const wrap = weapon('wrap', { qualities: [{ key: 'wrap' }] });

            const d = defend([weapon('w')], wrap, { shield: 2 });

            expect(d.sl.parry).toBe(0);
            expect(d.sl.dodge).toBe(1);
        }
    );

    bookExample(306, 'p306 a shield gives +1 SL to Dodge and Melee', () => {
        const d = defend([weapon('w')], weapon('in'), { shield: 2 });

        expect(d.sl).toEqual({ parry: 1, dodge: 1 });
    });

    bookExample(306, 'p306 a shield does not stack with Defensive', () => {
        const d = defend(
            [weapon('w', { qualities: [{ key: 'defensive' }] })],
            weapon('in'),
            { shield: 2 }
        );

        expect(d.sl.parry).toBe(1);
    });

    bookExample(
        300,
        'p300 a longer weapon gives +1 SL to the defending Melee Test',
        () => {
            const d = defend(
                [weapon('spear', { reach: 'long' })],
                weapon('in', { reach: 'average' })
            );

            expect(d.sl.parry).toBe(1);
            expect(
                defend(
                    [weapon('sword', { reach: 'average' })],
                    weapon('in', { reach: 'average' })
                ).sl.parry
            ).toBe(0);
        }
    );

    bookExample(166, 'p166 a weapon in the off hand defends at -2 SL', () => {
        expect(defend([weapon('w', { hand: 'off' })]).sl.parry).toBe(-2);
    });

    bookExample(304, 'p304 Parry weapons ignore the off-hand penalty', () => {
        expect(
            defend([
                weapon('w', { hand: 'off', qualities: [{ key: 'parry' }] }),
            ]).sl.parry
        ).toBe(0);
    });

    bookExample(
        166,
        'the better defending weapon is chosen over the main hand',
        () => {
            const d = defend([
                weapon('main', { hand: 'off' }),
                weapon('dagger', {
                    hand: 'off',
                    qualities: [{ key: 'parry' }],
                }),
            ]);

            expect(d.weapon?.id).toBe('dagger');
        }
    );
});

describe('canon: Parry second attack, Fast, reach and Inflict', () => {
    bookExample(
        304,
        'p304 an unopposed attack rolls no defence and hits on a pass',
        () => {
            const r = resolveOpposed({
                attackerTarget: 90,
                defenderTargets: [{ kind: 'parry', target: 99 }],
                unopposed: true,
                edition: CANON,
                rng: () => 0.3,
                presetRolls: { attacker: 40 },
            });

            expect(r.isHit).toBe(true);
            expect(r.netSl).toBe(r.attacker.sl);
            expect(r.defender.roll).toBe(0);
        }
    );

    bookExample(
        304,
        'p304 Fast adds 2 to Combat Initiative, not with two weapons',
        () => {
            const init = (attacks: BattleAttack[]) =>
                wfrpInitiative(
                    {
                        ...fighter(attacks),
                        abilities: { baseInitiative: 30, initiative: 0 },
                    } as BattleParticipant,
                    {
                        rules: {
                            initiative: { mode: 'roll' },
                            edition: { preset: 'canon5e' },
                        } as never,
                        rng: () => 0.45,
                    }
                ).total;

            const fast = weapon('rapier', { qualities: [{ key: 'fast' }] });

            const base = init([weapon('sword')]);

            expect(init([fast])).toBe(base + 2);
            expect(init([fast, weapon('dagger', { hand: 'off' })])).toBe(base);
        }
    );

    bookExample(
        300,
        'p300 Very Long engages at 4 yd, Massive at 6 yd (a cell is 2 yd)',
        () => {
            expect(canonEngageCells('average')).toBe(1);
            expect(canonEngageCells('long')).toBe(1);
            expect(canonEngageCells('very-long')).toBe(2);
            expect(canonEngageCells('massive')).toBe(3);
        }
    );

    bookExample(
        304,
        'p304 Inflict (Condition) applies the named Condition on a hit',
        () => {
            const target = fighter([]);

            const result = mitigateWfrpDamage({
                attacker: fighter([]),
                target,
                weapon: 6,
                amount: 6,
                margin: 2,
                attackRoll: 24,
                location: 'body',
                crit: false,
                rng: () => 0.5,
                rules: RULES,
                attack: weapon('net', {
                    qualities: [
                        { key: 'inflict', value: 1, condition: 'prone' },
                    ],
                }),
            });

            expect(
                conditionLevel(result.afterHit!(target, 1).participant, 'prone')
            ).toBe(1);
        }
    );

    bookExample(
        304,
        'p304 only Inflict carries a Condition, which stays optional',
        () => {
            expect(
                qualityList([{ key: 'inflict', value: 1, condition: 'ablaze' }])
            ).toEqual([{ key: 'inflict', value: 1, condition: 'ablaze' }]);
            expect(qualityList([{ key: 'inflict', value: 1 }])).toEqual([
                { key: 'inflict', value: 1 },
            ]);
            expect(
                qualityList([{ key: 'damaging', condition: 'prone' }])
            ).toBeNull();
            expect(
                qualityList([{ key: 'inflict', value: 1, condition: 'nope' }])
            ).toBeNull();

            const base = {
                type: 'weapon',
                group: 'basic',
                reach: 'average',
                damage: { addSb: true, flat: 4 },
                flaws: [],
                twoHanded: false,
                weight: 1,
                price: 1,
            };

            expect(
                WfrpItemStatsSchema.safeParse({
                    ...base,
                    qualities: [
                        { key: 'inflict', value: 1, condition: 'prone' },
                    ],
                }).success
            ).toBe(true);
            expect(
                WfrpItemStatsSchema.safeParse({
                    ...base,
                    qualities: [{ key: 'inflict', value: 1 }],
                }).success
            ).toBe(true);
        }
    );
});
