import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { assertWfrpAction } from '@/systems/wfrp/rules/combat/assert-action';
import { rollCrit } from '@/systems/wfrp/rules/combat/crit-table';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { armourAp, WFRP_EQUIPMENT } from '@/systems/wfrp/rules/equipment';
import { parseWfrpStats } from '@/systems/wfrp/rules/equipment/armour';
import { carriedLoad } from '@/systems/wfrp/rules/equipment/carried';
import { encumbrance } from '@/systems/wfrp/rules/equipment/encumbrance';
import {
    qualityInflicts,
    qualityToHit,
} from '@/systems/wfrp/rules/equipment/quality-effects';
import { WfrpItemStatsSchema } from '@/systems/wfrp/rules/equipment/stats';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { ROUNDS_DICE } from '@/systems/wfrp/rules/tables/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const chars = (over: Record<string, unknown> = {}) => ({
    ...DEFAULT_CHARACTERISTICS,
    ...over,
});

const fighter = (id: string, wp = 20): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...chars(),
                base: { ...DEFAULT_CHARACTERISTICS.base, wp },
            }),
        },
    };
};

const attack = (
    type: AttackType,
    system: Parameters<typeof ATTACK_SLOT.write>[0]
) =>
    ({
        id: 'w',
        name: 'w',
        type,
        system: ATTACK_SLOT.write(system),
    }) as unknown as BattleAttack;

describe('W8 tails: Precise in an opposed test', () => {
    const base = {
        attackerTarget: 50,
        defenderTargets: [{ kind: 'dodge' as const, target: 50 }],
        edition: CANON,
        rng: () => 0.5,
        presetRolls: { attacker: 45, defender: 33 },
    };

    bookExample(
        305,
        'Precise adds 1 SL to the passed test before the winner is decided',
        () => {
            const without = resolveOpposed(base);

            const precise = resolveOpposed({ ...base, attackerSlOnSuccess: 1 });

            expect(without.attackerWon).toBe(false);
            expect(precise.attackerWon).toBe(true);
            expect(precise.attacker.sl).toBe(without.attacker.sl + 1);
        }
    );

    bookExample(305, 'Precise does nothing on a failed test', () => {
        const r = resolveOpposed({
            ...base,
            presetRolls: { attacker: 80, defender: 33 },
            attackerSlOnSuccess: 1,
        });

        expect(r.attacker.sl).toBeLessThanOrEqual(0);
        expect(r.attackerWon).toBe(false);
    });
});

describe('W8 tails: no Accurate/Slow in 5e', () => {
    const refs = {
        qualities: [{ key: 'accurate' as const }],
        flaws: [{ key: 'slow' as const }],
    };

    bookExample(304, 'canon ignores the legacy +10/-10 to hit', () => {
        expect(qualityToHit(refs, 'canon')).toBe(0);
        expect(qualityToHit(refs, 'legacy')).toBe(0);
        expect(
            qualityToHit(
                { qualities: [{ key: 'accurate' }], flaws: [] },
                'legacy'
            )
        ).toBe(10);
    });
});

describe('W8 tails: forbidden ranged group', () => {
    const sling = attack(AttackType.RANGED, {
        qualities: [],
        flaws: [],
        group: 'sling',
    });

    const ctx = (rules?: typeof canon) => ({
        kind: 'attack' as const,
        actor: fighter('a'),
        attack: sling,
        targets: [fighter('t')],
        participants: [],
        rules,
    });

    bookExample(
        302,
        'an untrained ranged group is rejected before ammo is spent',
        () => {
            expect(() => assertWfrpAction(ctx(canon))).toThrow();
        }
    );

    bookExample(302, 'legacy and a rules-less call stay unrestricted', () => {
        expect(() => assertWfrpAction(ctx())).not.toThrow();
        expect(() =>
            assertWfrpAction(ctx(RulesetSchema.parse(WFRP_RULES)))
        ).not.toThrow();
    });
});

describe('W8 tails: one shield counts', () => {
    const shield = (x: number) => ({
        slot: 'shield',
        systemStats: {
            type: 'gear',
            weight: 1,
            price: 1,
            qualities: [{ key: 'shield', value: x }],
        },
    });

    bookExample(300, 'only the best shield adds AP under canon', () => {
        const rows = [shield(2), shield(1)];

        expect(armourAp(rows, { singleShield: true }).shield).toBe(2);
        expect(armourAp(rows).shield).toBe(3);
        expect(WFRP_EQUIPMENT.armourAp(rows, canon).shield).toBe(2);
    });
});

describe('W8 tails: Blackpowder shock log', () => {
    bookExample(304, 'the Cool test of the shocked target is logged', () => {
        const gun = attack(AttackType.RANGED, {
            qualities: [{ key: 'blackpowder' }],
            flaws: [],
        });

        const t = fighter('t', 5);

        const r = resolveWfrpAttack({
            attacker: fighter('a'),
            target: t,
            attack: gun,
            participants: [fighter('a'), t],
            rules: canon,
            rng: () => 0.99,
            manualRoll: 99,
        });

        expect(JSON.stringify(r.lines)).toContain(
            'battleWfrp.log.blackpowderFail'
        );
    });
});

describe('W8 tails: Inflict on a hit location (Bolas)', () => {
    const refs = {
        qualities: [
            {
                key: 'inflict' as const,
                value: 1,
                condition: 'prone' as const,
                location: 'leg' as const,
            },
        ],
        flaws: [],
    };

    bookExample(303, 'the condition lands only on a leg hit', () => {
        expect(qualityInflicts(refs, 'canon', 'leg')).toEqual([{ key: 'prone' }]);
        expect(qualityInflicts(refs, 'canon', 'body')).toEqual([]);
        expect(qualityInflicts(refs, 'canon')).toEqual([]);
    });

    bookExample(303, 'a location-less Inflict always lands', () => {
        const any = {
            qualities: [
                {
                    key: 'inflict' as const,
                    value: 1,
                    condition: 'prone' as const,
                },
            ],
            flaws: [],
        };

        expect(qualityInflicts(any, 'canon', 'head')).toEqual([{ key: 'prone' }]);
    });

    bookExample(303, 'the item schema accepts location only on Inflict', () => {
        const stats = (q: object) => ({
            type: 'gear',
            weight: 1,
            price: 1,
            qualities: [q],
        });

        expect(
            WfrpItemStatsSchema.safeParse(stats(refs.qualities[0])).success
        ).toBe(true);
        expect(
            WfrpItemStatsSchema.safeParse(
                stats({ key: 'blast', value: 2, location: 'leg' })
            ).success
        ).toBe(false);
        expect(parseWfrpStats(stats(refs.qualities[0]))).not.toBeNull();
        expect(
            parseWfrpStats(stats({ key: 'blast', value: 2, location: 'leg' }))
        ).toBeNull();
    });

    bookExample(303, 'mitigation applies the location filter', () => {
        const target = fighter('t');

        const prone = (location: 'leg' | 'body') =>
            conditionLevel(
                mitigateWfrpDamage({
                    attacker: fighter('a'),
                    target,
                    weapon: 4,
                    amount: 4,
                    margin: 2,
                    attackRoll: 30,
                    location,
                    crit: false,
                    rng: () => 0.5,
                    rules: canon,
                    attack: attack(AttackType.RANGED, refs),
                }).afterHit?.(target, 1).participant ?? target,
                'prone'
            );

        expect(prone('leg')).toBe(1);
        expect(prone('body')).toBe(0);
    });
});

describe('W8 tails: Bulky and Lightweight', () => {
    const item = (weight: number, key?: 'bulky' | 'lightweight') => ({
        systemStats: {
            type: 'gear',
            weight,
            price: 1,
            qualities: key ? [{ key }] : [],
        },
    });

    const total = (
        items: ReturnType<typeof item>[],
        worn = false,
        canonOn = true
    ) =>
        encumbrance(
            items.map((i) => ({ ...i, worn })),
            {
                base: DEFAULT_CHARACTERISTICS.base,
                advances: DEFAULT_CHARACTERISTICS.advances,
            },
            { canon: canonOn }
        ).carried;

    bookExample(298, 'Lightweight reduces Encumbrance by 1', () => {
        expect(total([item(3, 'lightweight')])).toBe(2);
        expect(total([item(3, 'lightweight')], false, false)).toBe(3);
    });

    bookExample(299, 'Bulky adds 1 and stays Enc 1 when worn', () => {
        expect(total([item(3, 'bulky')])).toBe(4);
        expect(total([item(3, 'bulky')], true)).toBe(1);
        expect(total([item(3)], true)).toBe(2);
    });

    bookExample(
        299,
        'carriedLoad passes the canon flag; legacy ignores the flags',
        () => {
            const input = {
                artifacts: [{ slot: 'bag', ...item(3, 'bulky') }],
                specials: [],
                coins: 0,
            };

            expect(
                carriedLoad(input, DEFAULT_CHARACTERISTICS, true).carried
            ).toBe(4);
            expect(
                carriedLoad(input, DEFAULT_CHARACTERISTICS, false).carried
            ).toBe(3);
        }
    );

    bookExample(299, 'oversized items (Enc 4+) are counted', () => {
        expect(
            encumbrance([item(4), item(5)], DEFAULT_CHARACTERISTICS, {
                canon: true,
            }).oversized
        ).toBe(2);
    });
});

describe('W8 tails: rolled crit marker duration', () => {
    const rulesWith = (effect: object) =>
        ({
            tables: {
                critBody: [{ max: 100, text: 't', effects: [effect] }],
            },
        }) as unknown as Parameters<typeof rollCrit>[1];

    bookExample(171, 'roundsDice rolls the duration, min 1 round', () => {
        const r = rollCrit(
            'body',
            rulesWith({ type: 'marker', key: 'winded', roundsDice: '1d10' }),
            () => 0.5,
            50
        );

        expect(r.markerRounds?.winded).toBeGreaterThanOrEqual(1);
        expect(r.markerRounds?.winded).toBeLessThanOrEqual(10);
    });

    bookExample(
        171,
        'TB offset is subtracted and the result never drops under 1',
        () => {
            const r = rollCrit(
                'body',
                rulesWith({
                    type: 'marker',
                    key: 'winded',
                    roundsDice: '1d10-TB',
                }),
                () => 0,
                50,
                0,
                undefined,
                9
            );

            expect(r.markerRounds?.winded).toBe(1);
        }
    );

    bookExample(
        171,
        'the pattern accepts only dice with a flat or TB offset',
        () => {
            expect(ROUNDS_DICE.test('1d10-TB')).toBe(true);
            expect(ROUNDS_DICE.test('2d10+3')).toBe(true);
            expect(ROUNDS_DICE.test('banana')).toBe(false);
        }
    );
});
