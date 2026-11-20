import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import {
    inDispelRange,
    wfrpDispel,
    wfrpDispelPersistent,
} from '@/systems/wfrp/rules/magic/dispel';
import { prayerOvercast } from '@/systems/wfrp/rules/magic/prayer-overcast';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import { dispelMutation } from '@/systems/wfrp/server/battle/dispel-mutation';

const rulesOf = (preset: 'legacy' | 'canon5e'): Ruleset =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const dispeller = caster();

const foe = caster();

const dispel = (
    presetRoll: number,
    castSl: number,
    over: Partial<Parameters<typeof wfrpDispel>[0]> = {}
) =>
    wfrpDispel({
        dispeller,
        caster: foe,
        spellName: 'Bolt',
        castSl,
        rules: canon,
        rng: mulberry32(1),
        presetRoll,
        ...over,
    });

describe('canon5e dispelling', () => {
    bookExample(237, 'the dispeller wins the opposed test: no effect', () => {
        const r = dispel(10, 1);

        expect(r.dispelled).toBe(true);
        expect(r.reason).toBe('dispelled');
    });

    bookExample(237, 'the caster wins with the casting SL', () => {
        const r = dispel(10, 9);

        expect(r.dispelled).toBe(false);
        expect(r.reason).toBe('caster');
    });

    it('a failed test never dispels', () => {
        const r = dispel(95, 0);

        expect(r.dispelled).toBe(false);
        expect(r.reason).toBe('failed');
    });

    bookExample(
        237,
        'the higher SL wins even when the dispeller fails the test',
        () => {
            const r = dispel(95, -9);

            expect(r.dispelled).toBe(true);
            expect(r.reason).toBe('dispelled');
        }
    );

    bookExample(237, 'Unstoppable Force cannot be dispelled', () => {
        const r = dispel(1, 0, { critBonus: 'unstoppableForce' });

        expect(r.dispelled).toBe(false);
        expect(r.reason).toBe('unstoppable');
    });

    it('is inert under the legacy edition', () => {
        expect(dispel(1, 0, { rules: rulesOf('legacy') }).reason).toBe(
            'unsupported'
        );
    });

    bookExample(237, 'reaches targets within WP yards', () => {
        expect(inDispelRange(dispeller, 40)).toBe(true);
        expect(inDispelRange(dispeller, 41)).toBe(false);
    });

    bookExample(
        237,
        'persistent: SL accumulates against CN, own spell adds +1 SL',
        () => {
            const step = (progress: number, ownSpell: boolean) =>
                wfrpDispelPersistent({
                    dispeller,
                    spellName: 'Bolt',
                    progress,
                    cn: 6,
                    ownSpell,
                    rules: canon,
                    rng: mulberry32(1),
                    presetRoll: 30,
                });

            const other = step(0, false);

            const own = step(0, true);

            expect(own.progress).toBe(other.progress + 1);
            expect(other.done).toBe(false);
            expect(step(5, true).done).toBe(true);
        }
    );
});

describe('canon5e prayer overcast', () => {
    bookExample(
        218,
        'Blessing: each +2 SL is +6 yards, +1 target or +6 rounds',
        () => {
            expect(prayerOvercast('blessing', 2).bonus).toEqual({
                rangeYards: 12,
            });
            expect(prayerOvercast('blessing', 1, 'targets').bonus).toEqual({
                targets: 1,
            });
            expect(
                prayerOvercast('blessing', 3, 'durationRounds').bonus
            ).toEqual({ durationRounds: 18 });
        }
    );

    bookExample(220, 'Miracle: steps only, no dimension', () => {
        expect(prayerOvercast('miracle', 2)).toEqual({ steps: 2, bonus: {} });
    });
});

const withLastCast = (p: ReturnType<typeof caster>) =>
    withWfrpState(p, { lastCast: { spell: 'Bolt', sl: 1 } as never });

describe('reactive Dispel off the dispeller turn', () => {
    const withId = (
        p: ReturnType<typeof caster>,
        id: string,
        user?: string
    ) => ({
        ...p,
        basicInfo: {
            ...p.basicInfo,
            id,
            controlledBy: user ?? p.basicInfo.controlledBy,
        },
    });

    const run = (mode: 'reactive' | 'persistent') => {
        const c = context({
            participants: [
                withLastCast(withId(foe, 'foe', 'dm')),
                withId(dispeller, 'hero', 'user-1'),
            ],
            rng: () => 0.5,
        });

        return dispelMutation(
            { ...c, meta: { ...c.meta, rules: canon } },
            { participantId: 'hero', targetId: 'foe', mode, serverRoll: true }
        );
    };

    it('lets the controlling player dispel a spell cast on another turn', () => {
        expect(() => run('reactive')).not.toThrow();
    });

    it('keeps persistent dispel to the own turn', () => {
        expect(() => run('persistent')).toThrow();
    });
});
