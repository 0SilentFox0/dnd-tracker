// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StatsStep } from '../StatsStep';
import type { WfrpDraftFormState } from '../types';

import { render } from '@/lib/i18n/test/render-uk';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const N = CHARACTERISTIC_KEYS.length;

type StatsOver = Partial<WfrpDraftFormState['stats']>;

const makeForm = (
    stats: StatsOver = {},
    over: { profile?: { mods: Record<string, number> }; xp?: unknown } = {}
) => {
    const actions = {
        setMode: vi.fn(),
        roll: vi.fn(),
        swap: vi.fn(),
        setPoint: vi.fn(),
    };

    const form = {
        stats: {
            mode: 'rolled',
            rolls: [],
            arranged: [],
            points: Array(N).fill(10),
            budget: 100,
            ...actions,
            ...stats,
        },
        shown: (_k: string, v: number) => v,
        profile: over.profile,
        xp: over.xp,
    } as unknown as WfrpDraftFormState;

    return { form, ...actions };
};

const nums = (start: number) => Array.from({ length: N }, (_, i) => start + i);

describe('StatsStep', () => {
    afterEach(cleanup);

    it('rolled mode without rolls offers the roll button only', () => {
        const { form, roll } = makeForm();

        render(<StatsStep form={form} />);
        expect(
            screen.getByText('Кинь 2d10 для кожної характеристики.')
        ).toBeInTheDocument();
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
        fireEvent.click(
            screen.getByRole('button', { name: 'Кинути характеристики' })
        );
        expect(roll).toHaveBeenCalledTimes(1);
    });

    it('rolled mode lists rolled values with 20 + species mod + roll totals', () => {
        const { form } = makeForm(
            { rolls: nums(5) },
            { profile: { mods: { ws: 5 } } }
        );

        render(<StatsStep form={form} />);
        expect(screen.getAllByRole('listitem')).toHaveLength(N);

        const first = CHARACTERISTIC_KEYS[0];

        expect(screen.getByTestId(`stat-${first}`)).toHaveTextContent('5');
        expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
            `Разом ${20 + (first === 'ws' ? 5 : 0) + 5}`
        );
        expect(
            screen.queryByRole('button', { name: /Підняти вище/ })
        ).toBeNull();
        expect(screen.queryByText('Кинути характеристики')).toBeNull();
    });

    it('rearranged mode swaps with neighbours and disables the edge arrows', () => {
        const { form, swap } = makeForm({
            mode: 'rearranged',
            rolls: nums(5),
            arranged: nums(5),
        });

        render(<StatsStep form={form} />);

        const ups = screen.getAllByRole('button', { name: /^Підняти вище/ });

        const downs = screen.getAllByRole('button', {
            name: /^Опустити нижче/,
        });

        expect(ups[0]).toBeDisabled();
        expect(downs[N - 1]).toBeDisabled();
        fireEvent.click(ups[2]);
        expect(swap).toHaveBeenLastCalledWith(2, 1);
        fireEvent.click(downs[2]);
        expect(swap).toHaveBeenLastCalledWith(2, 3);
        expect(
            screen.getByText('Міняй значення місцями кнопками стрілок.')
        ).toBeInTheDocument();
    });

    it('rearranged mode displays the arranged order, not the raw rolls', () => {
        const arranged = nums(5).reverse();

        const { form } = makeForm({
            mode: 'rearranged',
            rolls: nums(5),
            arranged,
        });

        render(<StatsStep form={form} />);
        expect(
            screen.getByTestId(`stat-${CHARACTERISTIC_KEYS[0]}`)
        ).toHaveTextContent(String(arranged[0]));
    });

    it('free mode shows the budget and edits points per characteristic', () => {
        const { form, setPoint } = makeForm({
            mode: 'free',
            points: Array(N).fill(10),
            budget: 120,
        });

        render(<StatsStep form={form} />);
        expect(screen.getByRole('status')).toHaveTextContent(
            `Розподілено ${N * 10} з 120`
        );
        expect(
            screen.queryByRole('button', { name: 'Кинути характеристики' })
        ).toBeNull();

        const field = screen.getAllByLabelText(/^Значення:/)[1];

        fireEvent.change(field, { target: { value: '12' } });
        expect(setPoint).toHaveBeenLastCalledWith(1, 12);
    });

    it('appends the XP bonus to each mode label when the campaign grants it', () => {
        const { form } = makeForm(
            {},
            { xp: { statBonus: { rolled: 50, rearranged: 25, free: 0 } } }
        );

        render(<StatsStep form={form} />);
        expect(
            screen.getByRole('radio', { name: 'Кидок (+50 досвіду)' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Вільний розподіл (+0 досвіду)' })
        ).toBeInTheDocument();
    });

    it('switches the mode through the tabs', () => {
        const { form, setMode } = makeForm();

        render(<StatsStep form={form} />);
        fireEvent.click(
            screen.getByRole('radio', { name: 'Вільний розподіл' })
        );
        expect(setMode).toHaveBeenCalledWith('free');
    });
});
