import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { armourSl } from '@/systems/wfrp/rules/magic/armour';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { OVERCAST_TABLE } from '@/systems/wfrp/rules/magic/constants';
import { WFRP_TESTED_MAGIC } from '@/systems/wfrp/rules/magic/index';
import { wfrpMiscast } from '@/systems/wfrp/rules/magic/miscast';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';

const rulesOf = (preset: 'legacy' | 'canon5e'): Ruleset =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const spell = {
    id: 's',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: { targeting: { kind: 'enemy' }, effects: [] },
} as unknown as CastTestCtx['spell'];

const run = (
    rules: Ruleset,
    presetRoll: number,
    magic: Partial<SpellMagic> = {},
    over: Parameters<typeof caster>[0] = {},
    system?: CastTestCtx['system']
) =>
    wfrpCastTest({
        caster: caster(over),
        spell,
        magic: { cn: 2, kind: 'arcane', overcast: 'dice', ...magic },
        rules,
        rng: mulberry32(1),
        presetRoll,
        ...(system && { system }),
    });

const castOf = (r: ReturnType<typeof run>) => ACTION_SLOT.read(r.details)?.cast;

describe('canon5e casting', () => {
    bookExample(
        235,
        'Petty Spell: CN 0, no Critical Casting, no miscast on doubles',
        () => {
            const r = run(canon, 22, { kind: 'petty', cn: 3, overcast: null });

            expect(r.success).toBe(true);
            expect(castOf(r)?.cn).toBe(0);
            expect(castOf(r)?.outcome).toBe('success');
            expect(r.miscast).toBeNull();
            expect(r.overcastSteps).toBe(0);
        }
    );

    bookExample(
        235,
        'Critical Casting: Minor miscast and a bonus, Total Power by default',
        () => {
            const r = run(canon, 22);

            expect(castOf(r)?.outcome).toBe('critical');
            expect(r.miscast).toBe('minor');
            expect(castOf(r)?.critBonus).toBe('totalPower');
            expect(r.overcastSteps).toBe(3);
        }
    );

    bookExample(
        235,
        'Critical Casting on a passed test below CN: miscast and bonus, the spell still fails',
        () => {
            const r = run(canon, 22, { cn: 9 });

            expect(r.success).toBe(false);
            expect(castOf(r)?.outcome).toBe('failure');
            expect(r.miscast).toBe('minor');
            expect(castOf(r)?.critBonus).toBe('totalPower');
            expect(r.overcastSteps).toBe(0);
        }
    );

    it('legacy cast details carry no critBonus', () => {
        const r = run(legacy, 22);

        expect(castOf(r)?.critBonus).toBeUndefined();
    });

    bookExample(235, 'Critical Casting: the chosen bonus is kept', () => {
        const r = run(
            canon,
            22,
            {},
            {},
            FORTUNE_INPUT.write({ kind: 'sl', critBonus: 'criticalDamage' })
        );

        expect(castOf(r)?.critBonus).toBe('criticalDamage');
    });

    bookExample(
        235,
        'a fumble is a Minor miscast and channelled SL does not save the test',
        () => {
            const r = run(canon, 55, {}, { channelledSl: 3 });

            expect(r.success).toBe(false);
            expect(castOf(r)?.outcome).toBe('fumble');
            expect(r.miscast).toBe('minor');
        }
    );

    bookExample(237, 'Major miscast only under a Malignant Influence', () => {
        expect(run(canon, 97).miscast).toBeNull();
        expect(run(canon, 22).miscast).toBe('minor');
    });

    bookExample(237, 'Malignant Influence turns Minor into Major', () => {
        const malignant = withWfrpState(caster(), { malignant: true });

        expect(wfrpState(malignant).malignant).toBe(true);

        const r = wfrpCastTest({
            caster: malignant,
            spell,
            magic: { cn: 2, kind: 'arcane', overcast: null },
            rules: canon,
            rng: mulberry32(1),
            presetRoll: 22,
        });

        expect(r.miscast).toBe('major');
    });

    bookExample(
        236,
        'overcast budget follows the table and is capped at IB + WPB',
        () => {
            expect(OVERCAST_TABLE.map((r) => r.sl)).toEqual([
                1, 2, 3, 5, 8, 13, 18,
            ]);
            expect(OVERCAST_TABLE.map((r) => r.damage)).toEqual([
                1, 2, 3, 4, 5, 6, 7,
            ]);

            const wide = run(
                canon,
                10,
                { cn: 1 },
                {
                    base: { int: 80, wp: 80 },
                    skillAdvances: { 'language:magick': 10 },
                }
            );

            expect(wide.overcastSteps).toBeGreaterThan(0);

            const weak = run(
                canon,
                2,
                { cn: 1 },
                {
                    base: { int: 20, wp: 10 },
                    skillAdvances: { 'language:magick': 40 },
                }
            );

            expect(weak.overcastSteps).toBe(3);
        }
    );

    bookExample(
        237,
        'armour repels the winds on the best-protected location',
        () => {
            const heavy = caster({ ap: { head: 1, arm: 4, body: 2, leg: 3 } });

            expect(armourSl(heavy, { magicModel: 'canon5e' })).toBe(4);
            expect(armourSl(heavy, { magicModel: 'legacy' })).toBe(2);
        }
    );

    bookExample(235, 'an ingredient lowers the miscast one step', () => {
        const who = { name: 'A', spell: 'B' };

        const minor = run(canon, 22);

        expect(WFRP_TESTED_MAGIC.avertMiscast(minor, who).miscast).toBeNull();

        const major = {
            ...minor,
            miscast: 'major',
        };

        const lowered = WFRP_TESTED_MAGIC.avertMiscast(major, who);

        expect(lowered.miscast).toBe('minor');
        expect(ACTION_SLOT.read(lowered.details)?.cast?.miscast).toBe('minor');
    });

    bookExample(217, 'a Miracle needs no CN', () => {
        const r = run(
            canon,
            32,
            { kind: 'miracle', cn: 5, overcast: null },
            { base: { fel: 50 } }
        );

        expect(castOf(r)?.cn).toBe(0);
        expect(r.success).toBe(true);
    });

    bookExample(
        218,
        'Wrath: units die at or below Sin even on a success, or a fumble',
        () => {
            const prayer = { kind: 'blessing' as const, cn: 0, overcast: null };

            const sinful = run(canon, 32, prayer, {
                base: { fel: 50 },
                sin: 2,
            });

            expect(sinful.success).toBe(true);
            expect(sinful.miscast).toBe('wrath');

            expect(
                run(canon, 36, prayer, { base: { fel: 50 }, sin: 2 }).miscast
            ).toBeNull();
            expect(run(canon, 77, prayer, { base: { fel: 50 } }).miscast).toBe(
                'wrath'
            );
        }
    );

    bookExample(
        218,
        'Wrath table roll gets +10 per Sin and Sin drops by one',
        () => {
            const c = caster({ sin: 2 });

            const ctx = {
                round: 1,
                rng: mulberry32(1),
                rules: canon,
                applyDamage: applyDamageConsequences,
            };

            const r = wfrpMiscast([c], 'c', 'wrath', {
                ...ctx,
                presetRoll: 10,
            });

            const expected = DEFAULT_TABLES.wrath.find((row) => 30 <= row.max);

            expect(r.messages[0]).toMatchObject({
                params: {
                    effect: {
                        message: `wfrpMagic.miscast.wrath.${DEFAULT_TABLES.wrath.indexOf(expected!) + 1}`,
                    },
                },
            });
            expect(wfrpState(r.participants[0]).sin).toBe(1);
        }
    );
});

describe('legacy casting is unchanged', () => {
    it('keeps Major on 99/100, petty CN and the 2-SL overcast step', () => {
        expect(run(legacy, 99).miscast).toBe('major');
        expect(run(legacy, 22).miscast).toBe('minor');
        expect(castOf(run(legacy, 22, { kind: 'petty', cn: 3 }))?.cn).toBe(3);
        expect(castOf(run(legacy, 22))?.stepAvert).toBeUndefined();
    });

    it('an ingredient cancels any miscast', () => {
        const major = { ...run(legacy, 99), miscast: 'major' };

        expect(
            WFRP_TESTED_MAGIC.avertMiscast(major, { name: 'A', spell: 'B' })
                .miscast
        ).toBeNull();
    });
});

describe('canon5e prayer overcast and armour', () => {
    const fel = { base: { fel: 60 } };

    bookExample(
        218,
        'a Blessing overcasts per +2 SL; legacy never does',
        () => {
            const blessing = {
                kind: 'blessing' as const,
                cn: 0,
                overcast: null,
            };

            const r = run(canon, 12, blessing, fel);

            expect(r.success).toBe(true);
            expect(r.overcastSteps).toBe(2);
            expect(run(legacy, 12, blessing, fel).overcastSteps).toBe(0);
        }
    );

    it('armour-only AP counts over all locations under canon5e', () => {
        const ap = { head: 0, arm: 3, body: 0, leg: 0 };

        const abilities = wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
            ap,
            armourOnly: ap,
        });

        const wearer = {
            ...caster(),
            abilities: { ...caster().abilities, ...abilities },
        };

        expect(armourSl(wearer, { magicModel: 'canon5e' })).toBe(3);
        expect(armourSl(wearer, { magicModel: 'legacy' })).toBe(0);
    });

    it('passes critBonus through the cast input schema', () => {
        const parsed = WfrpFortuneInputSchema.parse({
            system: {
                key: 'wfrp',
                data: { kind: 'sl', critBonus: 'unstoppableForce' },
            },
        });

        expect(FORTUNE_INPUT.read(parsed)?.critBonus).toBe('unstoppableForce');
    });
});
