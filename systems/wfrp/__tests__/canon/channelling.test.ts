import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { mulberry32 } from '@/lib/utils/common/rng';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import { wfrpLoseChannelled } from '@/systems/wfrp/rules/combat/lose-channelled';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpChannel } from '@/systems/wfrp/rules/magic/channel';
import {
    channelShock,
    channelUpkeep,
} from '@/systems/wfrp/rules/magic/channel-loss';
import { wfrpMiscast } from '@/systems/wfrp/rules/magic/miscast';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpResetState } from '@/systems/wfrp/rules/state-parts';

const rulesOf = (preset: 'legacy' | 'canon5e'): Ruleset =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const seq = (...values: number[]) => {
    let i = 0;

    return () => values[Math.min(i++, values.length - 1)];
};

const channel = (
    p: ReturnType<typeof caster>,
    presetRoll: number,
    rules = canon,
    rng: () => number = mulberry32(1)
) => wfrpChannel(p, { rules, rng, presetRoll });

const plain = caster({ skillAdvances: {} });

describe('canon5e channelling', () => {
    bookExample(236, 'SL accumulate with no cap', () => {
        const r = channel(withWfrpState(plain, { channelledSl: 10 }), 20);

        expect(wfrpState(r.participant).channelledSl).toBe(12);
    });

    bookExample(
        236,
        'a double on a success adds Willpower Bonus SL to the pool',
        () => {
            const r = channel(plain, 22);

            expect(wfrpState(r.participant).channelledSl).toBe(2 + 4);
            expect(r.miscast).toBeNull();
            expect(r.lines[0]).toMatchObject({
                message: 'wfrpMagic.log.channelCritical',
            });
        }
    );

    bookExample(
        236,
        'a double on a failure drains 1d10 SL and is a Minor miscast',
        () => {
            const r = channel(
                withWfrpState(plain, { channelledSl: 7 }),
                55,
                canon,
                () => 0.35
            );

            expect(r.miscast).toBe('minor');
            expect(wfrpState(r.participant).channelledSl).toBe(3);
            expect(wfrpState(r.participant).miscastSl).toBe(4);
        }
    );

    bookExample(236, 'the drain cannot exceed the pool', () => {
        const r = channel(
            withWfrpState(plain, { channelledSl: 2 }),
            55,
            canon,
            () => 0.95
        );

        expect(wfrpState(r.participant).channelledSl).toBeUndefined();
        expect(wfrpState(r.participant).miscastSl).toBe(2);
    });

    bookExample(236, 'Malignant Influence makes it a Major miscast', () => {
        const r = channel(
            withWfrpState(plain, { malignant: true, channelledSl: 3 }),
            55
        );

        expect(r.miscast).toBe('major');
    });

    bookExample(
        236,
        'a wounding Minor miscast does not trigger a second Cool test or loss',
        () => {
            const wounding = RulesetSchema.parse({
                ...WFRP_RULES,
                edition: { preset: 'canon5e' },
                tables: {
                    miscastMinor: [
                        {
                            max: 100,
                            text: 'ouch',
                            effects: [{ type: 'wounds', amount: 2 }],
                        },
                    ],
                },
            });

            const p = withWfrpState(plain, { channelledSl: 5 });

            const r = wfrpMiscast([p], 'c', 'minor', {
                round: 1,
                rng: () => 0.99,
                rules: wounding,
                applyDamage: (c) =>
                    applyDamageConsequences({
                        ...c,
                        rules: wounding,
                    }),
            });

            const after = r.participants[0];

            expect(after.combatStats.currentHp).toBe(18);
            expect(wfrpState(after).channelledSl).toBe(5);
            expect(JSON.stringify(r.messages)).not.toContain('channelLost');
        }
    );

    bookExample(236, 'a plain failure leaves the pool alone', () => {
        const r = channel(withWfrpState(plain, { channelledSl: 3 }), 70);

        expect(r.miscast).toBeNull();
        expect(wfrpState(r.participant).channelledSl).toBe(3);
    });

    bookExample(
        236,
        'the miscast roll gains +10 per SL lost, then the mark is cleared',
        () => {
            const marked = withWfrpState(plain, { miscastSl: 4 });

            const r = wfrpMiscast([marked], 'c', 'minor', {
                round: 1,
                rng: mulberry32(1),
                rules: canon,
                applyDamage: applyDamageConsequences,
                presetRoll: 1,
            });

            expect(JSON.stringify(r.messages[0])).toContain(
                JSON.stringify(dynamicTextRef('wfrpMagic.miscast.minor.3'))
            );
            expect(wfrpState(r.participants[0]).miscastSl).toBeUndefined();
        }
    );

    bookExample(
        236,
        'damage while channelling: a failed Hard Cool test drains 1d10 SL',
        () => {
            const p = withWfrpState(plain, { channelledSl: 5 });

            const r = wfrpLoseChannelled(
                {
                    amount: 2,
                    rules: canon,
                    rng: seq(0.97, 0.35, 0.5),
                    round: 1,
                } as never,
                { participant: p, participants: [p], messages: [] }
            );

            expect(wfrpState(r.participant).channelledSl).toBe(1);
            expect(r.messages.length).toBeGreaterThan(1);
        }
    );

    bookExample(236, 'a passed Hard Cool test keeps the whole pool', () => {
        const p = withWfrpState(plain, { channelledSl: 5 });

        const r = wfrpLoseChannelled(
            { amount: 2, rules: canon, rng: seq(0.02), round: 1 } as never,
            { participant: p, participants: [p], messages: [] }
        );

        expect(wfrpState(r.participant).channelledSl).toBe(5);
        expect(r.messages).toEqual([]);
    });

    bookExample(236, 'momentum is still dropped by damage', () => {
        const p = withWfrpState(plain, { channelledSl: 5, momentum: true });

        const r = wfrpLoseChannelled(
            { amount: 2, rules: canon, rng: seq(0.02), round: 1 } as never,
            { participant: p, participants: [p], messages: [] }
        );

        expect(wfrpState(r.participant).momentum).toBeUndefined();
    });

    bookExample(
        236,
        'a paused pool needs an Average Endurance test each turn',
        () => {
            const p = withWfrpState(plain, { channelledSl: 5 });

            const ctx = { rules: canon, round: 1 };

            const kept = channelUpkeep([p], 'c', { ...ctx, rng: seq(0.02) });

            expect(wfrpState(kept.participants[0]).channelledSl).toBe(5);

            const lost = channelUpkeep([p], 'c', { ...ctx, rng: seq(0.98) });

            expect(
                wfrpState(lost.participants[0]).channelledSl
            ).toBeUndefined();
        }
    );

    bookExample(236, 'channelling this turn needs no upkeep test', () => {
        const r = channel(plain, 20);

        expect(wfrpState(r.participant).channelledNow).toBe(true);

        const after = channelUpkeep([r.participant], 'c', {
            rules: canon,
            round: 1,
            rng: seq(0.98),
        });

        expect(wfrpState(after.participants[0]).channelledSl).toBe(2);
        expect(
            wfrpState(wfrpResetState(r.participant, 'turn')).channelledNow
        ).toBeUndefined();
    });

    bookExample(236, 'channelShock with an empty pool does nothing', () => {
        const r = channelShock([plain], 'c', {
            rules: canon,
            round: 1,
            rng: seq(0.98),
        });

        expect(r.messages).toEqual([]);
    });
});

describe('legacy channelling is unchanged', () => {
    it('caps the pool at 10 and ignores doubles', () => {
        const r = channel(
            withWfrpState(plain, { channelledSl: 9 }),
            22,
            legacy
        );

        expect(wfrpState(r.participant).channelledSl).toBe(10);
    });

    it('damage drops the whole pool', () => {
        const p = withWfrpState(plain, { channelledSl: 5 });

        const r = wfrpLoseChannelled(
            { amount: 2, rules: legacy, rng: seq(0.02) } as never,
            { participant: p, participants: [p], messages: [] }
        );

        expect(wfrpState(r.participant).channelledSl).toBeUndefined();
    });
});
