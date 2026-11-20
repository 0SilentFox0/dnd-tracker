import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { bonus } from '@/systems/wfrp/rules/characteristics/derive';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics/keys';
import { CANON_ENDEAVOURS_MAX } from '@/systems/wfrp/rules/downtime/constants';
import { resolveEndeavour } from '@/systems/wfrp/rules/downtime/endeavours';
import {
    healEndeavourWounds,
    rollDailyRecovery,
} from '@/systems/wfrp/rules/downtime/heal';
import {
    type PeriodHero,
    type PeriodInput,
    planPeriod,
} from '@/systems/wfrp/rules/downtime/plan-period';
import type {
    DowntimeState,
    Endeavour,
} from '@/systems/wfrp/rules/downtime/types';

const rng = () => 0.5;

const charm: Endeavour = { kind: 'earn', params: { skill: 'charm' } };

const chars = (
    skillAdvances: Record<string, number> = {}
): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    skillAdvances,
});

const earn = (presetRoll: number, status: string, edition = CANON) =>
    resolveEndeavour(charm, {
        characteristics: chars(),
        status,
        rng,
        presetRoll,
        edition,
    });

describe('canon Income endeavour', () => {
    bookExample(
        199,
        'a failed Income test still pays, halved: Brass 3 rolls 6d10, 36 halves to 18',
        () => {
            const r = earn(83, 'Brass 3');

            expect(r.test?.outcome).toBe('failure');
            expect(r.coins).toEqual({ coin: 'cp', amount: 18 });
        }
    );

    bookExample(199, 'a passed test pays the full dice by Status tier', () => {
        expect(earn(15, 'Brass 3').coins).toEqual({ coin: 'cp', amount: 36 });
        expect(earn(15, 'Silver 2').coins).toEqual({ coin: 'sp', amount: 12 });
        expect(earn(15, 'Gold 4').coins).toEqual({ coin: 'gp', amount: 4 });
    });

    bookExample(
        199,
        'a failure on Gold pays half the crowns, rounding down',
        () => {
            expect(earn(83, 'Gold 3').coins).toEqual({ coin: 'gp', amount: 1 });
            expect(earn(83, 'Gold 1').coins).toBeUndefined();
        }
    );

    bookExample(
        199,
        'the Income test is Average (+2 SL): roll 40 against 30 passes',
        () => {
            expect(earn(40, 'Brass 1').test?.outcome).toBe('success');
            expect(earn(40, 'Brass 1', LEGACY).test?.outcome).toBe('failure');
        }
    );
});

const hero = (
    id: string,
    downtime?: DowntimeState,
    over: Partial<PeriodHero> = {},
    skillAdvances: Record<string, number> = {}
): PeriodHero => ({
    id,
    resources: {},
    characteristics: {
        ...chars(skillAdvances),
        ...(downtime ? { downtime } : {}),
    },
    maxHp: 12,
    ...over,
});

const run = (heroes: PeriodHero[], presets: PeriodInput['presets'] = {}) =>
    planPeriod({
        heroes,
        days: 7,
        rules: {
            tables: {},
            edition: { preset: 'canon5e' },
        } as unknown as PeriodInput['rules'],
        rng,
        periodId: 'p1',
        now: '2026-11-20',
        presets,
    });

const noEvent = { endeavour: 15, event: 5 };

describe('canon downtime period', () => {
    bookExample(196, 'up to three Endeavours per period of downtime', () => {
        expect(CANON_ENDEAVOURS_MAX).toBe(3);

        const d: DowntimeState = {
            ailments: [],
            endeavour: charm,
            endeavours: Array.from({ length: 5 }, () => charm),
        };

        const [r] = run([hero('a', d)], { a: noEvent });

        expect(r.summary.endeavours).toHaveLength(3);
        // the DM preset roll (15) covers slot 1 only; slots 2-3 roll by rng (fail, halved)
        expect(r.coins).toEqual({ coin: 'cp', amount: 12 + 2 * 6 });
    });

    bookExample(190, 'characters recover all Wounds during downtime', () => {
        const [r] = run([hero('a', undefined, { resources: { hp: 2 } })], {
            a: { event: 5 },
        });

        expect(r.resources.hp).toBeUndefined();
        expect(r.summary.healed).toBe(10);
    });

    bookExample(
        170,
        'a patient benefits from one Heal roll per incident',
        () => {
            const tend: DowntimeState = {
                ailments: [],
                endeavour: { kind: 'tend', params: { patientId: 'p' } },
            };

            const patient = hero('p', {
                ailments: [
                    { id: 'd1', kind: 'disease', daysLeft: 20, label: 'd' },
                ],
            });

            const [, , p] = run(
                [
                    hero('h1', tend, {}, { heal: 5 }),
                    hero('h2', tend, {}, { heal: 5 }),
                    patient,
                ],
                { h1: noEvent, h2: noEvent, p: { event: 5 } }
            );

            const single = run([hero('h1', tend, {}, { heal: 5 }), patient], {
                h1: noEvent,
                p: { event: 5 },
            })[1];

            expect(p.characteristics.downtime?.ailments[0].daysLeft).toBe(
                single.characteristics.downtime?.ailments[0].daysLeft
            );
        }
    );
});

describe('canon recovery and Heal', () => {
    bookExample(
        170,
        'a passed daily Endurance test (+2 SL) recovers SL + TB Wounds',
        () => {
            const r = rollDailyRecovery({
                endurance: 40,
                tb: 3,
                rested: false,
                rng,
                presetRoll: 30,
            });

            expect(r.test.sl).toBe(3);
            expect(r.healed).toBe(3 + 3);
        }
    );

    bookExample(
        170,
        'a restful day adds TB even when the Endurance test fails',
        () => {
            const failed = rollDailyRecovery({
                endurance: 40,
                tb: 3,
                rested: true,
                rng,
                presetRoll: 90,
            });

            expect(failed.healed).toBe(3);
            expect(
                rollDailyRecovery({
                    endurance: 40,
                    tb: 3,
                    rested: false,
                    rng,
                    presetRoll: 90,
                }).healed
            ).toBe(0);
        }
    );

    bookExample(
        170,
        'a successful Heal test recovers Intelligence Bonus + SL Wounds',
        () => {
            expect(healEndeavourWounds(3, 2)).toBe(5);

            const r = resolveEndeavour(
                { kind: 'tend', params: { patientId: 'p' } },
                {
                    characteristics: chars({ heal: 5 }),
                    rng,
                    presetRoll: 15,
                    edition: CANON,
                }
            );

            expect(r.tend?.heal).toBe(
                bonus(chars(), 'int') + (r.test?.sl ?? 0)
            );
        }
    );
});
