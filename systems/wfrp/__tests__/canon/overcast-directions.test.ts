import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import {
    wfrpCastTest,
    wfrpDeclaredExtension,
} from '@/systems/wfrp/rules/magic/cast-test';
import {
    overcastDamage,
    overcastExtension,
    overcastValue,
    trimOvercast,
} from '@/systems/wfrp/rules/magic/overcast';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const canon: Ruleset = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const spell = {
    id: 's',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {},
} as unknown as CastTestCtx['spell'];

const cast = (
    overcast: Record<string, number> | undefined,
    magic: Partial<SpellMagic> = {}
) =>
    wfrpCastTest({
        caster: caster({
            base: { int: 80, wp: 80 },
            skillAdvances: { 'language:magick': 10 },
        }),
        spell,
        magic: {
            cn: 1,
            kind: 'arcane',
            overcast: 'dice',
            missile: true,
            ...magic,
        },
        rules: canon,
        rng: mulberry32(1),
        presetRoll: 10,
        ...(overcast && {
            system: FORTUNE_INPUT.write({ kind: 'none', overcast }),
        }),
    });

describe('canon5e overcast by direction', () => {
    bookExample(236, 'each direction reads its own column of the table', () => {
        expect(overcastValue('damage', 4)).toBe(3);
        expect(overcastValue('damage', 5)).toBe(4);
        expect(overcastValue('range', 2)).toBe(2);
        expect(overcastValue('duration', 3)).toBe(2);
        expect(overcastValue('aoe', 5)).toBe(2);
        expect(overcastValue('targets', 2)).toBe(1);
        expect(overcastValue('targets', 1)).toBe(0);
        expect(overcastValue('range', 1)).toBe(1);
    });

    bookExample(236, 'SL are spent per direction, not pooled', () => {
        const spread = { damage: 1, targets: 2 };

        expect(overcastDamage(spread)).toBe(1);
        expect(overcastExtension(spread)).toMatchObject({
            extraTargets: 1,
            rangeMul: 1,
            durationMul: 1,
            areaMul: 1,
        });
        expect(overcastExtension({ range: 2 }).rangeMul).toBe(2);
        expect(overcastExtension({ duration: 3 }).durationMul).toBe(2);
        expect(overcastExtension({ aoe: 5 }).areaMul).toBe(2);
    });

    bookExample(
        236,
        'a declared spread the roll cannot pay is cut in order',
        () => {
            const cut = trimOvercast({ damage: 2, duration: 1, targets: 2 }, 3);

            expect(cut).toEqual({ duration: 1, targets: 2 });
            expect(trimOvercast({ damage: 5 }, 2)).toEqual({ damage: 2 });
            expect(trimOvercast({ aoe: 3, range: 3 }, 4)).toEqual({
                range: 3,
                aoe: 1,
            });
        }
    );

    bookExample(
        236,
        'a cast pays the declared spread and reports the extension',
        () => {
            const r = cast({ damage: 2, targets: 2 });

            expect(r.overcastSteps).toBe(2);
            expect(r.extension?.extraTargets).toBe(1);
            expect(r.extension?.rangeMul).toBe(1);
        }
    );

    bookExample(236, 'no declaration keeps the whole budget in damage', () => {
        const r = cast(undefined);

        expect(r.extension).toBeUndefined();
        expect(r.overcastSteps).toBeGreaterThan(0);
    });

    bookExample(236, 'damage is only a magic missile direction', () => {
        const r = cast(
            { damage: 3, range: 2 },
            { overcast: 'targets', missile: false }
        );

        expect(r.overcastSteps).toBe(0);
        expect(r.extension?.rangeMul).toBe(2);
    });

    bookExample(
        236,
        'a spell without a listed overcast column can still be overcast',
        () => {
            const r = cast({ range: 2 }, { overcast: null, missile: false });

            expect(r.extension?.rangeMul).toBe(2);
            expect(r.overcastSteps).toBe(0);
            expect(
                cast(undefined, { overcast: null, missile: false })
                    .overcastSteps
            ).toBe(0);
        }
    );

    bookExample(236, 'Petty spells cannot be overcast', () => {
        const r = cast({ range: 2 }, { kind: 'petty', cn: 0 });

        expect(r.extension).toBeUndefined();
        expect(
            wfrpDeclaredExtension({
                system: FORTUNE_INPUT.write({
                    kind: 'none',
                    overcast: { range: 2 },
                }),
                magic: { cn: 0, kind: 'petty', overcast: 'dice' } as SpellMagic,
                rules: canon,
            })
        ).toBeUndefined();
    });

    bookExample(
        236,
        'the declared extension is what targets are validated against',
        () => {
            const declared = wfrpDeclaredExtension({
                system: FORTUNE_INPUT.write({
                    kind: 'none',
                    overcast: { range: 8, targets: 2 },
                }),
                magic: {
                    cn: 1,
                    kind: 'arcane',
                    overcast: 'dice',
                } as SpellMagic,
                rules: canon,
            });

            expect(declared).toMatchObject({ rangeMul: 3, extraTargets: 1 });
            expect(
                wfrpDeclaredExtension({
                    system: FORTUNE_INPUT.write({
                        kind: 'none',
                        overcast: { range: 8 },
                    }),
                    magic: {
                        cn: 1,
                        kind: 'arcane',
                        overcast: 'dice',
                    } as SpellMagic,
                    rules: RulesetSchema.parse({
                        ...WFRP_RULES,
                        edition: { preset: 'legacy' },
                    }),
                })
            ).toBeUndefined();
        }
    );
});
