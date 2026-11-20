import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { bonus } from '@/systems/wfrp/rules/characteristics/derive';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics/keys';
import {
    burdenOfPower,
    effectiveStatus,
    regainStanding,
} from '@/systems/wfrp/rules/downtime/career-duty';
import { CANON_ENDEAVOURS_MAX } from '@/systems/wfrp/rules/downtime/constants';
import { resolveEndeavour } from '@/systems/wfrp/rules/downtime/endeavours';
import {
    healEndeavourWounds,
    healFumbleWounds,
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

const career = (tier: 1 | 2 | 3 | 4, standingLoss?: number) => ({
    state: {
        careerId: 'c',
        tier,
        ticks: [],
        ...(standingLoss ? { standingLoss } : {}),
    },
    statuses: ['Brass 1', 'Silver 1', 'Gold 1', 'Gold 3'],
    earningSkill: 'stealth',
});

const lowFel = (): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, ag: 60, fel: 10 },
});

describe('canon Income uses the career Earning Skill', () => {
    bookExample(
        199,
        'the Income test rolls the Earning Skill of the career, not Charm',
        () => {
            const c = lowFel();

            const common = {
                characteristics: c,
                status: 'Brass 1',
                rng,
                presetRoll: 40,
                edition: CANON,
            };

            expect(resolveEndeavour(charm, common).test?.outcome).toBe(
                'failure'
            );
            expect(
                resolveEndeavour(charm, { ...common, earningSkill: 'stealth' })
                    .test?.outcome
            ).toBe('success');
        }
    );
});

describe('canon Heal fumble', () => {
    const tend: DowntimeState = {
        ailments: [],
        endeavour: { kind: 'tend', params: { patientId: 'p' } },
    };

    bookExample(
        170,
        'a fumbled Heal inflicts 1d10 Wounds but never takes the patient below 1',
        () => {
            expect(healFumbleWounds(10, 12)).toBe(10);
            expect(healFumbleWounds(10, 4)).toBe(3);
            expect(healFumbleWounds(10, 1)).toBe(0);
        }
    );

    bookExample(
        170,
        'a fumbled Heal test (failed double) hurts the patient',
        () => {
            const high = () => 0.99;

            const plan = (maxHp: number) =>
                planPeriod({
                    heroes: [
                        hero('h', tend, {}, { heal: 5 }),
                        hero('p', undefined, { maxHp }),
                    ],
                    days: 1,
                    rules: {
                        tables: {},
                        edition: { preset: 'canon5e' },
                    } as unknown as PeriodInput['rules'],
                    rng: high,
                    periodId: 'p1',
                    now: '2026-11-20',
                    presets: { h: { endeavour: 99 }, p: { event: 5 } },
                });

            const [healer, patient] = plan(12);

            expect(healer.summary.endeavour?.test?.outcome).toBe('fumble');
            expect(healer.summary.endeavour?.fumbleWounds).toBe(10);
            expect(patient.resources.hp).toBeLessThan(12);

            expect(plan(1)[1].resources.hp).toBeUndefined();
        }
    );
});

describe('canon daily recovery in the period', () => {
    bookExample(
        170,
        'wounds lost during the period come back through the daily Endurance tests',
        () => {
            const d: DowntimeState = {
                ailments: [
                    { id: 'a', kind: 'festering', daysLeft: 3, label: 'f' },
                ],
                endeavour: { kind: 'rest', params: {} },
            };

            const [r] = run([hero('a', d)], {
                a: { event: 5, ailments: [99] },
            });

            expect(r.summary.ailments[0].wounds).toBeGreaterThan(0);
            expect(r.summary.recovered).toBeGreaterThan(0);
        }
    );
});

describe('canon Hardly Working and Burdens of Power', () => {
    const noIncome = (over: Partial<PeriodHero>) =>
        run([hero('a', undefined, over)], { a: { event: 5 } })[0];

    bookExample(
        199,
        'skipping Income leaves a single coin of the Status tier',
        () => {
            const silver = noIncome({ status: 'Silver 3' });

            expect(silver.coins).toEqual({ coin: 'sp', amount: 1 });
            expect(silver.summary.hardlyWorking).toBe(true);
            expect(noIncome({ status: 'Gold 2' }).coins).toEqual({
                coin: 'gp',
                amount: 1,
            });
        }
    );

    bookExample(199, 'taking Income is not Hardly Working', () => {
        const [r] = run(
            [
                hero(
                    'a',
                    { ailments: [], endeavour: charm },
                    { status: 'Brass 1' }
                ),
            ],
            { a: noEvent }
        );

        expect(r.summary.hardlyWorking).toBeUndefined();
    });

    bookExample(
        196,
        'a failed Earning Test at the top level costs one Standing',
        () => {
            const r = noIncome({ status: 'Gold 3', career: career(4) });

            expect(r.summary.burden?.lost).toBe('standing');
            expect(r.characteristics.career?.standingLoss).toBe(1);
        }
    );

    bookExample(
        196,
        'a passed Earning Test at the top level loses nothing and earns nothing',
        () => {
            const r = planPeriod({
                heroes: [
                    hero('a', undefined, {
                        status: 'Gold 3',
                        career: career(4),
                    }),
                ],
                days: 7,
                rules: {
                    tables: {},
                    edition: { preset: 'canon5e' },
                } as unknown as PeriodInput['rules'],
                rng: () => 0.05,
                periodId: 'p1',
                now: '2026-11-20',
                presets: { a: { event: 5 } },
            })[0];

            expect(r.summary.burden?.lost).toBeUndefined();
            expect(r.characteristics.career?.standingLoss).toBeUndefined();
        }
    );

    bookExample(
        196,
        'Standing falling to 0 drops a Career Level for free',
        () => {
            const { state, result } = burdenOfPower(
                { ...career(4), statuses: ['x', 'x', 'x', 'Gold 1'] },
                lowFel(),
                () => 0.99
            );

            expect(result.lost).toBe('tier');
            expect(state.tier).toBe(3);
        }
    );

    bookExample(196, 'each Income Endeavour regains one lost Standing', () => {
        expect(regainStanding(career(4, 2).state).standingLoss).toBe(1);
        expect(regainStanding(career(4, 1).state).standingLoss).toBeUndefined();
        expect(effectiveStatus('Gold 3', 1)).toEqual({
            tier: 'gold',
            level: 2,
        });

        const [r] = run(
            [
                hero(
                    'a',
                    { ailments: [], endeavour: charm },
                    {
                        status: 'Gold 3',
                        career: career(4, 2),
                    }
                ),
            ],
            { a: noEvent }
        );

        expect(r.characteristics.career?.standingLoss).toBe(1);
        expect(r.summary.burden).toBeUndefined();
    });

    it('the period snapshot remembers the career so the period can be undone', () => {
        const r = noIncome({ status: 'Gold 3', career: career(4) });

        const snapshot = r.characteristics.downtime?.lastPeriod;

        expect(snapshot?.before.career?.tier).toBe(4);
        expect(snapshot?.after.career).toMatchObject({
            tier: 4,
            standingLoss: 1,
        });
        expect(snapshot?.after.career?.careerId).toBe(
            snapshot?.before.career?.careerId
        );
    });
});
