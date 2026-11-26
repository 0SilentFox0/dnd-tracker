// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdvanceRow, TILE_GRID } from '../AdvanceRow';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, v?: { cost?: number }) =>
        v?.cost !== undefined ? `${key} ${v.cost}` : key,
}));

describe('AdvanceRow tile grid', () => {
    it('renders all tiles in a responsive grid and buy calls onBuy', () => {
        const onBuy = vi.fn();

        render(
            <ul className={TILE_GRID}>
                {['a', 'b', 'c'].map((k) => (
                    <AdvanceRow
                        key={k}
                        label={k}
                        value={1}
                        price={{ cost: 10 }}
                        available={20}
                        pending={false}
                        onBuy={onBuy}
                    />
                ))}
            </ul>
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(TILE_GRID).toContain('grid-cols-2');
        fireEvent.click(screen.getAllByRole('button', { name: 'buy 10' })[1]);
        expect(onBuy).toHaveBeenCalledTimes(1);
    });
});
