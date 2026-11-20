import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import spells from '@/data/templates/grim-d100/spells.json';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import type { SpellPowerSource } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { unlistedPowerIssues } from '@/scripts/templates/systems/wfrp/spell-damage';
import { spellIssues } from '@/scripts/templates/systems/wfrp/spells';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { WFRP_MAGIC } from '@/systems/wfrp/rules/magic/index';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'legacy' | 'canon5e'): Ruleset =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const spellOf = (
    magic: Partial<SpellMagic>,
    damageBonus?: number,
    kind = 'dealDamage'
): SpellPowerSource => ({
    name: 'Bolt',
    definition: {
        ...(damageBonus !== undefined && { damageBonus }),
        casting: {
            magic: { cn: 4, kind: 'arcane', overcast: 'dice', ...magic },
        },
        effects: [{ kind }],
    },
});

const target = (
    over: {
        t?: number;
        ap?: Partial<Record<'head' | 'arm' | 'body' | 'leg', number>>;
        ward?: number;
    } = {}
): BattleParticipant => {
    const characteristics: Characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, t: over.t ?? 30 },
    };

    const p = makeParticipant({ id: 't', hp: 30, maxHp: 30 });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(characteristics, {
                ap: { head: 0, arm: 0, body: 0, leg: 0, ...over.ap },
            } as Parameters<typeof wfrpAbilitiesOf>[1]),
        },
    };
};

const castDetails = (roll: number, critBonus?: 'criticalDamage') =>
    wfrpCastTest({
        caster: caster(),
        spell: {
            id: 's',
            name: 'Bolt',
            level: 1,
            groupId: null,
            definition: {},
        } as never,
        magic: { cn: 2, kind: 'arcane', overcast: 'dice' },
        rules: canon,
        rng: mulberry32(1),
        presetRoll: roll,
        ...(critBonus && {
            system: FORTUNE_INPUT.write({ kind: 'sl', critBonus }),
        }),
    }).details;

const power = (spell: SpellPowerSource, overcastDamage = 0, rules = canon) =>
    WFRP_MAGIC.spellPower?.({ caster: caster(), spell, overcastDamage, rules });

const soak = (
    spell: SpellPowerSource,
    amount: number,
    victim: BattleParticipant,
    roll?: number,
    critBonus?: 'criticalDamage'
) =>
    WFRP_MAGIC.soakSpellDamage?.({
        caster: caster(),
        target: victim,
        amount,
        spell,
        castDetails:
            roll === undefined ? undefined : castDetails(roll, critBonus),
        rules: canon,
        rng: mulberry32(7),
    });

const stepOf = (r: ReturnType<typeof soak>, key: string) =>
    r?.steps.find((s) => s.key === key)?.value;

describe('spell damage (magic missile)', () => {
    bookExample(
        235,
        'Damage +4 and WPB 4 against TB 3 and Body AP 2 deals 3; overcast +2 makes it 5',
        () => {
            const spell = spellOf({ missile: true }, 4);

            const hit = target({ t: 30, ap: { body: 2 } });

            const flat = power(spell);

            expect(flat?.damage).toBe(8);
            expect(soak(spell, flat!.damage, hit, 54)?.amount).toBe(3);

            const over = power(spell, 2);

            expect(over?.damage).toBe(10);
            expect(soak(spell, over!.damage, hit, 54)?.amount).toBe(5);
        }
    );

    bookExample(
        164,
        'the reversed cast roll picks the location whose AP applies',
        () => {
            const spell = spellOf({ missile: true }, 4);

            const hit = target({ t: 30, ap: { body: 2, leg: 1 } });

            const r = soak(spell, 8, hit, 54);

            expect(stepOf(r, 'ap')).toBe(-2);

            const leg = soak(spell, 8, hit, 98);

            expect(stepOf(leg, 'ap')).toBe(-1);
            expect(leg?.amount).toBe(4);
        }
    );

    bookExample(
        235,
        'a spell that is not a magic missile strikes the Body whatever the roll',
        () => {
            const spell = spellOf({}, 7);

            const hit = target({ t: 30, ap: { body: 2, leg: 0 } });

            expect(soak(spell, 7, hit, 98)?.amount).toBe(2);
            expect(power(spell)?.damage).toBe(7);
        }
    );

    bookExample(164, 'damage never drops below 1', () => {
        const spell = spellOf({ missile: true }, 0);

        const tough = target({ t: 60, ap: { body: 5 } });

        expect(soak(spell, 5, tough, 54)?.amount).toBe(1);
    });

    bookExample(
        235,
        'a spell that ignores TB and AP deals its full amount',
        () => {
            const spell = spellOf({ missile: true, ignore: 'tbAp' }, 9);

            const tough = target({ t: 60, ap: { body: 5 } });

            expect(soak(spell, 13, tough, 54)?.amount).toBe(13);
        }
    );

    bookExample(235, 'ignoring armour still leaves Toughness', () => {
        const spell = spellOf({ missile: true, ignore: 'ap' }, 4);

        const hit = target({ t: 30, ap: { body: 2 } });

        expect(soak(spell, 8, hit, 54)?.amount).toBe(5);
    });

    bookExample(
        235,
        'Critical Damage adds a Critical Wound to the struck location',
        () => {
            const spell = spellOf({ missile: true }, 4);

            const hit = target({ t: 30, ap: { body: 2 } });

            expect(soak(spell, 8, hit, 54)?.afterHit).toBeUndefined();

            const crit = soak(spell, 8, hit, 54, 'criticalDamage');

            expect(crit?.afterHit).toBeTypeOf('function');
        }
    );

    it('a flat heal scales with the listed characteristic bonus and has no dice', () => {
        const heal = spellOf({ scale: 'int', overcast: null }, 0, 'heal');

        expect(power(heal)).toMatchObject({ heal: 4, damage: 4 });
        expect(power(spellOf({ overcast: null }, 1, 'heal'))?.heal).toBe(1);
    });

    it('the scaling bonus adds to a missile (Damage = TB)', () => {
        expect(power(spellOf({ missile: true, scale: 't' }, 0))?.damage).toBe(
            7
        );
    });

    it('a dice spell (no damageBonus) keeps the dice model but is still soaked', () => {
        const spell = spellOf({ ignore: 'tbAp' });

        expect(power(spell)).toBeUndefined();
        expect(soak(spell, 6, target({ t: 60, ap: { body: 5 } }))?.amount).toBe(
            6
        );
    });

    it('legacy magic keeps the dice and the generic resistance path', () => {
        const spell = spellOf({ missile: true }, 4);

        expect(power(spell, 0, legacy)).toBeUndefined();
        expect(
            WFRP_MAGIC.soakSpellDamage?.({
                caster: caster(),
                target: target(),
                amount: 8,
                spell,
                rules: legacy,
                rng: mulberry32(1),
            })
        ).toBeUndefined();
    });
});

describe('grim spells: listed power', () => {
    const rows = spells as Array<Record<string, unknown>>;

    it('every row passes the spell checks', () => {
        for (const row of rows)
            expect(spellIssues(row), String(row.name)).toEqual([]);
    });

    it('a native damage spell with a bonus carries no dice and a native heal either', () => {
        const flat = rows.filter((r) => r.damageBonus !== undefined);

        expect(flat.length).toBeGreaterThan(20);

        for (const row of flat) {
            expect(row.dice, String(row.name)).toBe(0);
            expect(row.executionMode, String(row.name)).toBeUndefined();
        }
    });

    it('the book missiles are native with their listed Damage', () => {
        const byName = new Map(rows.map((r) => [String(r.name), r]));

        const bolt = byName.get('Lance Bolt') as {
            damageBonus: number;
            casting: { magic: SpellMagic };
        };

        expect(bolt.damageBonus).toBe(4);
        expect(bolt.casting.magic.missile).toBe(true);
        expect(byName.get('Soul Draw')?.executionMode).toBeUndefined();
    });

    it('a manual row that lists a Damage is rejected', () => {
        const bolt = rows.find((r) => r.name === 'Lance Bolt')!;

        const issues = spellIssues({
            ...bolt,
            executionMode: 'manual',
            dice: 0,
            damageBonus: undefined,
            spellEffects: [],
        });

        expect(issues.join('\n')).toContain('must be native');
    });

    it('a native damage spell outside the table is rejected', () => {
        const bolt = rows.find((r) => r.name === 'Lance Bolt')!;

        expect(
            unlistedPowerIssues({ ...bolt, name: 'Mystery Bolt' }, 'dealDamage')
        ).toHaveLength(1);
        expect(unlistedPowerIssues(bolt, 'dealDamage')).toEqual([]);
    });

    it('every native damage or heal row is listed', () => {
        for (const row of rows) {
            const effects = row.spellEffects as Array<{ kind: string }>;

            expect(
                unlistedPowerIssues(row, effects[0]?.kind ?? null),
                String(row.name)
            ).toEqual([]);
        }
    });
});
