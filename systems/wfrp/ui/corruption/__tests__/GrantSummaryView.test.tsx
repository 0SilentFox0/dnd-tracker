// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GrantSummaryView } from '../GrantSummaryView';
import { MutationEffects } from '../MutationEffects';

import { render } from '@/lib/i18n/test/render-uk';
import type { GrantSummary } from '@/systems/wfrp/rules/corruption/types';

vi.unmock('next-intl');

const summary = (over: Partial<GrantSummary> = {}): GrantSummary => ({
    points: 1,
    total: 3,
    threshold: 5,
    ...over,
});

describe('GrantSummaryView', () => {
    afterEach(cleanup);

    it('shows points and that no test was needed', () => {
        render(<GrantSummaryView summary={summary()} />);
        expect(
            screen.getByText('Пункти порчі: 3 / поріг 5')
        ).toBeInTheDocument();
        expect(screen.getByText('Тест не потрібен')).toBeInTheDocument();
        expect(screen.queryByText('Нова мутація')).toBeNull();
    });

    it.each([
        ['success', 'пройдено'],
        ['critical', 'пройдено'],
        ['failure', 'провалено'],
        ['fumble', 'провалено'],
    ] as const)('marks a %s test as %s', (outcome, label) => {
        render(
            <GrantSummaryView
                summary={summary({
                    test: { roll: 20, target: 40, sl: 2, outcome },
                })}
            />
        );
        expect(
            screen.getByText(/Тест Витривалості: 20 проти 40, SL 2/)
        ).toHaveTextContent(label);
        expect(screen.queryByText('Тест не потрібен')).toBeNull();
    });

    it('shows the cap flags', () => {
        render(
            <GrantSummaryView
                summary={summary({ pointsCapped: true, capped: true })}
            />
        );
        expect(screen.getByText('Пункти обмежено')).toBeInTheDocument();
        expect(screen.getByText('Досягнуто ліміт мутацій')).toBeInTheDocument();
    });

    it('renders a mutation with kind, type roll, text and effects', () => {
        render(
            <GrantSummaryView
                summary={summary({
                    mutation: {
                        kind: 'physical',
                        typeRoll: 17,
                        roll: 55,
                        text: 'Зайві пальці',
                        effects: [{ type: 'move', amount: -1 }],
                    },
                })}
            />
        );
        expect(screen.getByText(/Нова мутація · Тіло/)).toBeInTheDocument();
        expect(screen.getByText('Вид (d100): 17')).toBeInTheDocument();
        expect(screen.getByText('Зайві пальці')).toBeInTheDocument();
        expect(screen.getByText(/Рух/)).toBeInTheDocument();
    });
});

describe('MutationEffects', () => {
    afterEach(cleanup);

    it('formats characteristic, move and maxWounds effects with signs', () => {
        render(
            <MutationEffects
                effects={[
                    { type: 'characteristic', key: 'ws', amount: 5 },
                    { type: 'maxWounds', amount: -2 },
                ]}
            />
        );

        const items = screen.getAllByRole('listitem');

        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent(/\+5/);
        expect(items[1]).toHaveTextContent(/Макс\. Wounds .*2/);
    });
});
