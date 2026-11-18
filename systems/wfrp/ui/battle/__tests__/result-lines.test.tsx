// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CastResultLines } from '../CastResultLines';
import { PercentileResultLines } from '../PercentileResultLines';

import { render } from '@/lib/i18n/test/render-uk';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from '@/systems/wfrp/rules/percentile/details';

vi.unmock('next-intl');

const cast = (
    over: Partial<PercentileCastDetails> = {}
): PercentileCastDetails => ({
    roll: 30,
    target: 45,
    sl: 1,
    cn: 4,
    channelled: 0,
    armourSl: 0,
    doubles: false,
    outcome: 'success',
    overcastSteps: 0,
    miscast: null,
    ...over,
});

const attack = (
    over: Partial<PercentileAttackDetails> = {}
): PercentileAttackDetails => ({
    roll: 22,
    target: 40,
    sl: 2,
    netSl: 1,
    location: 'arm',
    doubles: false,
    ...over,
});

describe('CastResultLines', () => {
    afterEach(cleanup);

    it('shows the outcome title and the roll line only for a plain cast', () => {
        render(<CastResultLines cast={cast()} />);
        expect(screen.getByText('Каст вдався')).toBeInTheDocument();
        expect(
            screen.getByText('30 / 45 · РУ 1 проти СН 4')
        ).toBeInTheDocument();
        expect(screen.queryByText(/Оверкаст/)).toBeNull();
        expect(screen.queryByText(/збій/)).toBeNull();
    });

    it('joins channel and armour modifiers and shows overcast and miscast', () => {
        render(
            <CastResultLines
                cast={cast({
                    outcome: 'fumble',
                    channelled: 2,
                    armourSl: 1,
                    overcastSteps: 3,
                    miscast: 'major',
                })}
            />
        );
        expect(screen.getByText('Провал касту')).toBeInTheDocument();
        expect(
            screen.getByText('Накопичено +2 РУ · броня −1')
        ).toBeInTheDocument();
        expect(screen.getByText('Оверкаст ×3')).toBeInTheDocument();
        expect(screen.getByText('Великий збій магії')).toBeInTheDocument();
    });

    it.each([
        [{ kind: 'sl' as const }, 'Витрачено Удачу: +1 РУ'],
        [
            { kind: 'reroll' as const, firstRoll: 77 },
            'Витрачено Удачу: перекидання (перший кидок 77)',
        ],
        [{ kind: 'reroll' as const }, 'Удача: Перекинути'],
    ])('describes fortune %j', (fortune, text) => {
        render(<CastResultLines cast={cast({ fortune })} />);
        expect(screen.getByText(text)).toBeInTheDocument();
    });
});

describe('PercentileResultLines', () => {
    afterEach(cleanup);

    it('shows net SL only when the defender is hidden, and a miss has no location', () => {
        render(<PercentileResultLines p={attack()} hit={false} />);
        expect(screen.getByText('Кидок 22 проти 40')).toBeInTheDocument();
        expect(screen.getByText('РУ 1')).toBeInTheDocument();
        expect(screen.queryByText(/Локація/)).toBeNull();
        expect(screen.queryByText('Momentum отримано')).toBeNull();
    });

    it('shows defender SL, location and momentum gained on an opposed hit', () => {
        render(
            <PercentileResultLines
                p={attack({
                    defender: { kind: 'dodge', roll: 50, sl: 0, target: 30 },
                })}
                hit
            />
        );
        expect(
            screen.getByText('РУ 2 · захист 0 · чистий 1')
        ).toBeInTheDocument();
        expect(screen.getByText('Локація: рука')).toBeInTheDocument();
        expect(screen.getByText('Momentum отримано')).toBeInTheDocument();
    });

    it('opposed flag keeps momentum gain without a visible defender; spent is shown', () => {
        render(
            <PercentileResultLines
                p={attack({ opposed: true, momentumUsed: true })}
                hit
            />
        );
        expect(screen.getByText('Momentum отримано')).toBeInTheDocument();
        expect(screen.getByText('Momentum витрачено')).toBeInTheDocument();
    });

    it('describes a fortune reroll', () => {
        render(
            <PercentileResultLines
                p={attack({ fortune: { kind: 'reroll', firstRoll: 91 } })}
                hit={false}
            />
        );
        expect(
            screen.getByText('Витрачено Удачу: перекидання (перший кидок 91)')
        ).toBeInTheDocument();
    });
});
