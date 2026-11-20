import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import type {
    SpellEffect,
    SpellMagic,
    SpellTargeting,
} from '@/lib/utils/spells/model/schema';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { WFRP_TESTED_MAGIC } from '@/systems/wfrp/rules/magic/index';
import {
    blessingExtension,
    maxExtensionOf,
    overcastDirections,
    overcastRowOf,
    spendOvercast,
} from '@/systems/wfrp/rules/magic/overcast';
import { prayerOvercast } from '@/systems/wfrp/rules/magic/prayer-overcast';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';

const rulesOf = (preset: 'legacy' | 'canon5e'): Ruleset =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const ranged: SpellTargeting = { kind: 'enemy', range: 60 };

const burst: SpellTargeting = {
    kind: 'template',
    shape: 'circle',
    size: 10,
    side: 'enemy',
    maxTargets: 4,
    range: 60,
};

const lasting = [
    { kind: 'buff', duration: { rounds: 4 } },
] as unknown as SpellEffect[];

const magicOf = (over: Partial<SpellMagic> = {}): SpellMagic => ({
    cn: 2,
    kind: 'arcane',
    overcast: null,
    ...over,
});

const spellOf = (
    targeting: SpellTargeting,
    effects: SpellEffect[] = []
): CastTestCtx['spell'] =>
    ({
        id: 's',
        name: 'Bolt',
        level: 1,
        groupId: null,
        definition: { targeting, effects },
    }) as unknown as CastTestCtx['spell'];

const input = (data: Record<string, unknown>) =>
    WfrpFortuneInputSchema.parse({
        system: { key: 'wfrp', data: { kind: 'none', ...data } },
    });

const cast = (
    presetRoll: number,
    opts: {
        magic?: Partial<SpellMagic>;
        targeting?: SpellTargeting;
        effects?: SpellEffect[];
        plan?: Record<string, number>;
        data?: Record<string, unknown>;
        who?: Parameters<typeof caster>[0];
        rules?: Ruleset;
    } = {}
) =>
    wfrpCastTest({
        caster: caster(opts.who),
        spell: spellOf(opts.targeting ?? ranged, opts.effects),
        magic: magicOf(opts.magic),
        rules: opts.rules ?? canon,
        rng: mulberry32(1),
        presetRoll,
        ...((opts.plan || opts.data) && {
            system: input({
                ...(opts.plan && { overcast: opts.plan }),
                ...opts.data,
            }),
        }),
    });

describe('overcast table (p236)', () => {
    bookExample(
        236,
        '2 SL buy +1 target or x2 range or +2 Damage; split 2 range + 1 damage',
        () => {
            const row = overcastRowOf(2);

            expect(row).toMatchObject({ targets: 1, rangeMul: 2, damage: 2 });

            const split = spendOvercast(
                3,
                { range: 2, damage: 1 },
                ['range', 'damage', 'targets']
            );

            expect(split.spent).toEqual({ range: 2, damage: 1 });
            expect(split.extension.rangeMul).toBe(2);
            expect(split.damage).toBe(1);
        }
    );

    bookExample(
        236,
        'bonus is read from the SL spent on that column: 5 SL on damage = +4',
        () => {
            const all = spendOvercast(5, { damage: 5 }, ['damage']);

            expect(all.damage).toBe(4);

            const part = spendOvercast(5, { damage: 3, range: 2 }, [
                'damage',
                'range',
            ]);

            expect(part.damage).toBe(3);
            expect(part.extension.rangeMul).toBe(2);
        }
    );

    bookExample(
        236,
        'a plan beyond the budget is cut, a missing plan puts it all into Damage',
        () => {
            const cut = spendOvercast(3, { targets: 2, range: 2, damage: 5 }, [
                'targets',
                'range',
                'damage',
            ]);

            expect(cut.spent).toEqual({ targets: 2, range: 1 });
            expect(cut.extension.targets).toBe(1);
            expect(cut.extension.rangeMul).toBe(1);

            expect(
                spendOvercast(5, undefined, ['damage', 'range']).spent
            ).toEqual({ damage: 5 });
            expect(spendOvercast(5, undefined, ['range']).spent).toEqual({});
        }
    );

    bookExample(
        236,
        'Touch range and Instant duration cannot be extended; no area, no AoE bonus',
        () => {
            const touch = overcastDirections(
                magicOf(),
                { kind: 'enemy', range: 5 },
                []
            );

            expect(touch).not.toContain('range');
            expect(touch).not.toContain('duration');
            expect(touch).not.toContain('aoe');

            const far = overcastDirections(magicOf(), ranged, lasting);

            expect(far).toEqual(['targets', 'range', 'duration']);

            expect(overcastDirections(magicOf(), burst, [])).toContain('aoe');
            expect(
                overcastDirections(magicOf(), { kind: 'self' }, lasting)
            ).toEqual(['duration']);
        }
    );

    bookExample(236, 'Petty spells cannot be overcast', () => {
        expect(
            overcastDirections(magicOf({ kind: 'petty' }), ranged, lasting)
        ).toEqual([]);

        const r = cast(22, {
            magic: { kind: 'petty', missile: { wpb: true } },
            plan: { damage: 3 },
        });

        expect(r.overcastDamage).toBe(0);
        expect(r.extension).toBeUndefined();
    });

    bookExample(236, 'only a magic missile adds Damage', () => {
        expect(overcastDirections(magicOf(), ranged, [])).not.toContain(
            'damage'
        );
        expect(
            overcastDirections(magicOf({ missile: { wpb: true } }), ranged, [])
        ).toContain('damage');
    });
});

describe('canon5e cast with an overcast plan', () => {
    const strong = { base: { int: 50, wp: 50 } };

    bookExample(
        236,
        'overcast budget is capped at IB + WPB and spent as planned',
        () => {
            const r = cast(5, {
                who: strong,
                magic: { cn: 1, missile: { wpb: true } },
                plan: { targets: 2, range: 2, damage: 9 },
            });

            const details = ACTION_SLOT.read(r.details)?.cast;

            expect(r.success).toBe(true);
            expect(details?.overcast).toEqual({
                targets: 2,
                range: 2,
                damage: 1,
            });
            expect(r.extension).toMatchObject({ targets: 1, rangeMul: 2 });
            expect(r.overcastDamage).toBe(1);
        }
    );

    bookExample(
        235,
        'Total Power adds the tens digit to the overcast budget',
        () => {
            const plain = cast(33, {
                who: { base: { int: 80, wp: 80 } },
                magic: { cn: 2, missile: { wpb: true } },
                data: { critBonus: 'unstoppableForce' },
                plan: { damage: 20 },
            });

            const power = cast(33, {
                who: { base: { int: 80, wp: 80 } },
                magic: { cn: 2, missile: { wpb: true } },
                data: { critBonus: 'totalPower' },
                plan: { damage: 20 },
            });

            expect(
                (power.overcastSteps ?? 0) - (plain.overcastSteps ?? 0)
            ).toBe(3);
        }
    );

    it('a failed cast overcasts nothing', () => {
        const r = cast(90, { plan: { damage: 3, range: 2 } });

        expect(r.success).toBe(false);
        expect(r.extension).toBeUndefined();
    });

    it('legacy keeps its own overcast and never reports an extension', () => {
        const r = cast(5, {
            rules: legacy,
            magic: { overcast: 'dice', cn: 1 },
            plan: { range: 2 },
        });

        expect(r.extension).toBeUndefined();
        expect(r.overcastDamage).toBeUndefined();
    });

    it('the pre-roll maximum follows the plan and is empty without one', () => {
        const ctx = {
            caster: caster({ base: { int: 50, wp: 50 } }),
            magic: magicOf(),
            targeting: ranged,
            effects: lasting,
            rules: canon,
        };

        expect(maxExtensionOf(ctx)).toMatchObject({
            targets: 0,
            rangeMul: 1,
            durationMul: 1,
        });

        expect(
            maxExtensionOf({
                ...ctx,
                system: input({ overcast: { range: 3, duration: 3 } }),
            })
        ).toMatchObject({ rangeMul: 2, durationMul: 2 });

        expect(
            maxExtensionOf({
                ...ctx,
                rules: legacy,
                system: input({ overcast: { range: 3 } }),
            }).rangeMul
        ).toBe(1);

        expect(WFRP_TESTED_MAGIC.maxExtension).toBe(maxExtensionOf);
    });

    it('the plan travels through the input slot and drops junk', () => {
        const slot = input({ overcast: { range: 2, damage: 0 } });

        expect(FORTUNE_INPUT.read(slot)?.overcast).toEqual({ range: 2 });
    });
});

describe('blessing overcast', () => {
    bookExample(
        220,
        'blessing +2 SL: +6 yards range applied to reach',
        () => {
            const ext = blessingExtension(prayerOvercast('blessing', 1));

            expect(ext.rangeAddFt).toBe(18);
            expect(ext.targets).toBe(0);

            const targets = blessingExtension(
                prayerOvercast('blessing', 2, 'targets')
            );

            expect(targets.targets).toBe(2);

            const rounds = blessingExtension(
                prayerOvercast('blessing', 1, 'durationRounds')
            );

            expect(rounds.durationAddRounds).toBe(6);
        }
    );

    it('a cast Blessing reports its extension', () => {
        const r = cast(12, {
            who: { base: { fel: 60 } },
            magic: { kind: 'blessing', cn: 0 },
            data: { blessing: 'targets' },
        });

        expect(r.extension?.targets).toBe(2);
    });
});
