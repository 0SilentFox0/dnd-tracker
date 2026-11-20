import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';
import { canonRules, fighter, legacyRules } from './combat-fixtures';

import { castSpell } from '@/lib/utils/battle/spell';
import type {
    CastableSpell,
    CastSpellParams,
} from '@/lib/utils/battle/types/spell-process';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    SpellDefinition,
    SpellMagic,
} from '@/lib/utils/spells/model/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { caster as wfrpCaster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { OVERCAST_TABLE } from '@/systems/wfrp/rules/magic/constants';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 40,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const at = (p: BattleParticipant, x: number): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, position: { x, y: 5 } },
});

const spellOf = (
    magic: Partial<SpellMagic>,
    amount: number | string
): CastableSpell => ({
    id: 'sp',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'enemy' },
        resolution: { kind: 'auto' },
        effects: [{ kind: 'dealDamage', amount, damageType: 'fire' }],
        raceModifiers: [],
        casting: {
            magic: { cn: 2, kind: 'arcane', overcast: null, ...magic },
        },
    } as SpellDefinition,
});

const foe = (tb: number, ap: Partial<Record<string, number>> = {}) =>
    at(
        withStats(
            {
                ...fighter('f', { side: 'enemy' }),
                combatStats: {
                    ...fighter('f').combatStats,
                    currentHp: 200,
                    maxHp: 200,
                },
            },
            { tb, ap: { head: 0, arm: 0, body: 0, leg: 0, ...ap } }
        ),
        3
    );

const cast = (
    spell: CastableSpell,
    over: {
        rules?: Ruleset;
        roll: number;
        target: BattleParticipant;
        caster?: BattleParticipant;
        input?: ReturnType<typeof FORTUNE_INPUT.write>;
        rng?: () => number;
    }
) => {
    const caster = at(over.caster ?? wfrpCaster({ base: { int: 80 } }), 0);

    const params: CastSpellParams = {
        rules: over.rules ?? canonRules,
        caster,
        spell,
        targetIds: ['f'],
        allParticipants: [caster, over.target],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: over.rng ?? (() => 0.4),
        map,
        castTest: {
            roll: over.roll,
            ...(over.input && { system: over.input }),
        },
    };

    return castSpell(params);
};

const hpLost = (r: ReturnType<typeof castSpell>) =>
    200 -
    (r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'f')?.combatStats
        .currentHp ?? 0);

describe('canon5e spell damage (magic missile)', () => {
    bookExample(
        243,
        'Bolt +4, WPB 4 vs TB 3 and 1 AP on the struck location: 4 Wounds',
        () => {
            const r = cast(spellOf({ missile: { wpb: true } }, 4), {
                roll: 32,
                target: foe(3, { arm: 1, leftArm: 1 }),
            });

            expect(hpLost(r)).toBe(4);
        }
    );

    bookExample(240, 'Dart +0, WPB 2 vs TB 4: minimum 1 Wound (p164)', () => {
        const r = cast(spellOf({ missile: { wpb: true } }, 0), {
            roll: 32,
            target: foe(4),
            caster: wfrpCaster({ base: { int: 80, wp: 20 } }),
        });

        expect(hpLost(r)).toBe(1);
    });

    bookExample(240, 'touch drain ignores AP', () => {
        const target = foe(1, { arm: 3, leftArm: 3 });

        const spell = (ignore?: ('ap' | 'tb')[]) =>
            spellOf({ missile: { wpb: true, ...(ignore && { ignore }) } }, 0);

        expect(hpLost(cast(spell(), { roll: 32, target }))).toBe(1);
        expect(hpLost(cast(spell(['ap']), { roll: 32, target }))).toBe(3);
    });

    bookExample(227, 'prayer burst 1d10 ignores TB and AP', () => {
        const r = cast(
            spellOf(
                {
                    kind: 'miracle',
                    missile: { wpb: false, ignore: ['tb', 'ap'] },
                },
                '1d10'
            ),
            {
                roll: 12,
                target: foe(3, { arm: 2, body: 2, leftArm: 2 }),
            }
        );

        expect(hpLost(r)).toBe(5);
    });

    bookExample(
        235,
        'location comes from the reversed casting roll (32 becomes 23: arm)',
        () => {
            const target = foe(3, { arm: 5, leftArm: 5, body: 0 });

            const spell = spellOf({ missile: { wpb: true } }, 4);

            expect(hpLost(cast(spell, { roll: 32, target }))).toBe(1);
            expect(hpLost(cast(spell, { roll: 54, target }))).toBe(5);
        }
    );

    bookExample(
        235,
        'Critical Casting: Critical Damage adds a Critical Wound to the struck location',
        () => {
            const spell = spellOf({ missile: { wpb: true } }, 4);

            const target = foe(3);

            const plain = cast(spell, {
                roll: 22,
                target,
                input: FORTUNE_INPUT.write({
                    kind: 'sl',
                    critBonus: 'totalPower',
                }),
            });

            const crit = cast(spell, {
                roll: 22,
                target,
                input: FORTUNE_INPUT.write({
                    kind: 'sl',
                    critBonus: 'criticalDamage',
                }),
            });

            const wounds = (r: ReturnType<typeof castSpell>) =>
                r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'f')!
                    .battleData.activeEffects.length;

            expect(wounds(plain)).toBe(0);
            expect(wounds(crit)).toBeGreaterThan(0);
        }
    );

    bookExample(
        236,
        'overcast +2 Damage adds to a magic missile, not doubled by spell power',
        () => {
            const target = foe(3);

            const plain = cast(spellOf({ missile: { wpb: true } }, 4), {
                roll: 54,
                target,
            });

            const over = cast(
                spellOf({ overcast: 'dice', missile: { wpb: true } }, 4),
                { roll: 54, target }
            );

            const row = OVERCAST_TABLE.find((r) => r.sl === 2)!.damage;

            expect(hpLost(over) - hpLost(plain)).toBe(row);
        }
    );

    it('a prayer adds perSl Wounds per SL of the test', () => {
        const spell = (perSl?: number) =>
            spellOf(
                {
                    kind: 'miracle',
                    missile: { wpb: false, ...(perSl && { perSl }) },
                },
                0
            );

        const target = foe(0);

        const base = hpLost(cast(spell(), { roll: 12, target }));

        expect(base).toBe(1);
        expect(hpLost(cast(spell(1), { roll: 12, target }))).toBeGreaterThan(
            base
        );
    });

    it('legacy edition keeps the declared amount untouched', () => {
        const r = cast(spellOf({ missile: { wpb: true } }, 4), {
            rules: legacyRules,
            roll: 32,
            target: foe(3, { arm: 1 }),
        });

        expect(hpLost(r)).toBe(4);
    });

    it('a spell without missile data is not touched by the seam', () => {
        const r = cast(spellOf({}, 4), {
            roll: 32,
            target: foe(3, { arm: 1 }),
        });

        expect(hpLost(r)).toBe(4);
    });
});

describe('SpellMagic.missile schema', () => {
    it('defaults wpb to true and rejects out-of-range perSl', async () => {
        const { SpellMagicSchema } = await import(
            '@/lib/utils/spells/model/schema'
        );

        const ok = SpellMagicSchema.parse({
            cn: 1,
            kind: 'arcane',
            missile: {},
        });

        expect(ok.missile?.wpb).toBe(true);
        expect(
            SpellMagicSchema.safeParse({
                cn: 1,
                kind: 'arcane',
                missile: { perSl: 9 },
            }).success
        ).toBe(false);
    });
});
