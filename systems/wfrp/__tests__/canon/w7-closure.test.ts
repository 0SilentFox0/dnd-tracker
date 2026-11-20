import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics';
import { assertWfrpInput } from '@/systems/wfrp/rules/combat/input';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { applyWfrpConditionShocking } from '@/systems/wfrp/rules/conditions/apply-shock';
import { readCorruption } from '@/systems/wfrp/rules/corruption/read';
import { planCorruptionUndo } from '@/systems/wfrp/rules/corruption/undo';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpResetState } from '@/systems/wfrp/rules/state-parts';
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

describe('W7 closure: channelled SL', () => {
    bookExample(
        236,
        'channelled SL rescues an ordinary failed roll',
        () => {
            const bare = run(canon, 56);

            const banked = run(canon, 56, {}, { channelledSl: 3 });

            expect(bare.success).toBe(false);
            expect(banked.success).toBe(true);
        }
    );

    bookExample(235, 'channelled SL never prevents a fumble', () => {
        const r = run(canon, 55, {}, { channelledSl: 9 });

        expect(r.success).toBe(false);
        expect(castOf(r)?.outcome).toBe('fumble');
        expect(r.miscast).toBe('minor');
    });
});

describe('W7 closure: overcast damage', () => {
    bookExample(236, 'canon overcast adds flat damage, not dice steps', () => {
        const r = run(canon, 12);

        expect(r.overcastDamage).toBe(2);
    });

    it('legacy overcast keeps dice steps and no flat damage', () => {
        const r = run(legacy, 12);

        expect(r.overcastDamage).toBeUndefined();
        expect(r.overcastSteps).toBeGreaterThan(0);
    });

    bookExample(217, 'a Blessing adds no damage and records the chosen dimension', () => {
        const r = run(
            canon,
            12,
            { kind: 'blessing', overcast: null },
            {},
            FORTUNE_INPUT.write({ kind: 'none', blessing: 'targets' })
        );

        expect(r.overcastDamage).toBe(0);
        expect(castOf(r)?.prayerOvercast?.bonus).toEqual({
            targets: castOf(r)?.prayerOvercast?.steps,
        });
    });
});

describe('W7 closure: Critical Casting bonus without a spend', () => {
    it('accepts a no-spend input and keeps the bonus', () => {
        const parsed = WfrpFortuneInputSchema.parse({
            system: {
                key: 'wfrp',
                data: { kind: 'none', critBonus: 'criticalDamage' },
            },
        });

        const r = run(canon, 22, {}, {}, parsed);

        expect(castOf(r)?.critBonus).toBe('criticalDamage');
        expect(castOf(r)?.fortune).toBeUndefined();
    });

    it('a no-spend input needs no Fortune or Fate', () => {
        const slot = FORTUNE_INPUT.write({ kind: 'none' });

        expect(() =>
            assertWfrpInput(slot, {
                actor: caster(),
                kind: 'cast',
                tested: true,
                free: false,
            } as unknown as Parameters<typeof assertWfrpInput>[1])
        ).not.toThrow();
    });
});

describe('W7 closure: castApAll gate', () => {
    const gear = {
        ap: { head: 1, arm: 3, body: 1, leg: 1 },
        armourOnly: { head: 1, arm: 3, body: 1, leg: 1 },
    };

    it('is stored only under canon5e', () => {
        const slotOf = (rules: Ruleset) =>
            JSON.stringify(
                wfrpAbilitiesOf(
                    DEFAULT_CHARACTERISTICS,
                    { ...gear, armourOnly: { ...gear.armourOnly, arm: 2 } },
                    rules
                ).system
            );

        expect(slotOf(legacy)).not.toContain('castApAll');
        expect(slotOf(canon)).toContain('castApAll');
    });
});

describe('W7 closure: Condition while channelling', () => {
    const seq = (...values: number[]) => {
        let i = 0;

        return () => values[Math.min(i++, values.length - 1)];
    };

    const apply = (rules: Ruleset, held: number | undefined, rng: () => number) => {
        const p = withWfrpState(caster({ skillAdvances: {} }), {
            channelledSl: held,
        });

        return applyWfrpConditionShocking([p], 'c', {
            key: 'prone',
            round: 1,
            rules,
            rng,
            sourceName: 'x',
        });
    };

    bookExample(236, 'a new Condition on a channelling caster triggers the Cool test', () => {
        const out = apply(canon, 5, seq(0.95));

        expect(JSON.stringify(out.messages)).toContain('channelLost');
    });

    it('does nothing without channelled SL', () => {
        const out = apply(canon, undefined, seq(0.95));

        expect(JSON.stringify(out.messages)).not.toContain('channelLost');
    });

    it('legacy never shocks', () => {
        const out = apply(legacy, 5, seq(0.95));

        expect(JSON.stringify(out.messages)).not.toContain('channelLost');
    });
});

describe('W7 closure: last cast for a reactive Dispel', () => {
    it('is stored on a passed canon cast and cleared at the caster turn', () => {
        const r = run(canon, 12);

        const after = r.casterUpdate?.(caster());

        expect(after && wfrpState(after).lastCast).toMatchObject({
            spell: 'Bolt',
        });

        const cleared = after && wfrpResetState(after, 'turn');

        expect(cleared && wfrpState(cleared).lastCast).toBeUndefined();
    });

    it('legacy stores nothing', () => {
        const r = run(legacy, 12);

        const after = r.casterUpdate?.(caster());

        expect(after && wfrpState(after).lastCast).toBeUndefined();
    });
});

describe('W7 closure: soul lost', () => {
    it('reads and keeps the flag; undo of the grant that caused it clears it', () => {
        const state = {
            points: 3,
            mutations: [],
            soulLost: 'mental' as const,
        };

        expect(readCorruption(state)?.soulLost).toBe('mental');
        expect(readCorruption({ points: 1 })?.soulLost).toBeUndefined();

        const lost = {
            ...state,
            last: {
                id: 'g',
                at: 'x',
                reason: 'r',
                before: { points: 1 },
                after: { points: 3 },
                summary: {
                    points: 2,
                    total: 3,
                    threshold: 1,
                    soulLost: 'mental' as const,
                },
            },
        };

        const undone = planCorruptionUndo(lost, 'g');

        expect(undone.ok && undone.state.soulLost).toBeUndefined();
    });
});
