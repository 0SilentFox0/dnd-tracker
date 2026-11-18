// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PeriodSummaryView } from '../PeriodSummaryView';

import { render } from '@/lib/i18n/test/render-uk';
import type { PeriodSummary } from '@/systems/wfrp/rules/downtime/types';

vi.unmock('next-intl');

const summary = (over: Partial<PeriodSummary> = {}): PeriodSummary => ({
    healed: 0,
    ailments: [],
    ...over,
});

describe('PeriodSummaryView', () => {
    afterEach(cleanup);

    it('renders nothing for an empty period', () => {
        render(<PeriodSummaryView summary={summary()} />);
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it.each([
        ['dead', 'Мертвий: період пропущено'],
        ['incapacitated', 'Непритомний: заняття пропущено'],
    ] as const)('shows the %s skip reason', (skipped, text) => {
        render(<PeriodSummaryView summary={summary({ skipped })} />);
        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('lists healing, endeavour test, discount and an absent patient', () => {
        render(
            <PeriodSummaryView
                summary={summary({
                    healed: 2,
                    endeavour: {
                        kind: 'train',
                        discount: 5,
                        test: {
                            roll: 12,
                            target: 40,
                            sl: 2,
                            outcome: 'success',
                        },
                    },
                })}
            />
        );
        expect(screen.getByText('Вилікувано Ран: 2')).toBeInTheDocument();
        expect(
            screen.getByText(/12 проти 40 · успіх, РУ 2/)
        ).toBeInTheDocument();
        expect(screen.getByText('Знижка на навчання: -5')).toBeInTheDocument();
    });

    it('shows patientAbsent and hides a zero coin payout', () => {
        render(
            <PeriodSummaryView
                summary={summary({
                    endeavour: {
                        kind: 'tend',
                        skipped: 'patientAbsent',
                        coins: { coin: 'gp', amount: 0 },
                    },
                })}
            />
        );
        expect(
            screen.getByText('Пацієнта немає серед героїв періоду')
        ).toBeInTheDocument();
        expect(screen.queryByText(/Дохід/)).toBeNull();
    });

    it('shows coins earned', () => {
        render(
            <PeriodSummaryView
                summary={summary({
                    endeavour: {
                        kind: 'earn',
                        coins: { coin: 'gp', amount: 7 },
                    },
                })}
            />
        );
        expect(screen.getByText(/Дохід: 7 /)).toBeInTheDocument();
    });

    it('renders ailments: expired, days left with test and wounds', () => {
        render(
            <PeriodSummaryView
                summary={summary({
                    ailments: [
                        {
                            id: 'a1',
                            label: 'Fever',
                            kind: 'disease',
                            daysLeft: 0,
                            expired: true,
                        },
                        {
                            id: 'a2',
                            label: 'Wound rot',
                            kind: 'festering',
                            daysLeft: 3,
                            wounds: 1,
                            test: {
                                roll: 80,
                                target: 35,
                                sl: -4,
                                outcome: 'failure',
                            },
                        },
                    ],
                })}
            />
        );
        expect(screen.getByText('Fever: минула')).toBeInTheDocument();

        const rot = screen.getByText(/Wound rot: лишилось днів 3/);

        expect(rot).toHaveTextContent('80 проти 35 · провал, РУ -4');
        expect(rot).toHaveTextContent('Втрачено Ран: 1');
    });

    it('renders the random event with its text', () => {
        render(
            <PeriodSummaryView
                summary={summary({
                    event: {
                        roll: 42,
                        index: 3,
                        text: 'Бійка в таверні',
                        conditions: [],
                    },
                })}
            />
        );
        expect(
            screen.getByText('Подія (42): Бійка в таверні')
        ).toBeInTheDocument();
    });
});
