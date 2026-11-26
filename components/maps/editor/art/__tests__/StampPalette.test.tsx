// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StampPalette } from '../StampPalette';

import { makeT } from '@/lib/i18n/test/mock-t';

vi.mock('next-intl', async (orig) => ({
    ...(await orig<object>()),
    useTranslations: (namespace?: string) => makeT(namespace),
}));

afterEach(cleanup);

describe('StampPalette', () => {
    it('switches biome and filters by name', () => {
        render(<StampPalette selected={null} onSelect={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'tileLabels.altar' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'tileLabels.tree-oak' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'maps.editor.stamps.biome.nature' }));
        expect(screen.getByRole('button', { name: 'tileLabels.tree-oak' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'tileLabels.altar' })).toBeNull();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pine' } });
        expect(screen.getByRole('button', { name: 'tileLabels.tree-pine' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'tileLabels.tree-oak' })).toBeNull();
    });

    it('reports the clicked stamp', () => {
        const onSelect = vi.fn();

        render(<StampPalette selected="altar" onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'tileLabels.brazier' }));
        expect(onSelect).toHaveBeenCalledWith('brazier');
        expect(
            screen.getByRole('button', { name: 'tileLabels.altar' }).getAttribute('aria-pressed')
        ).toBe('true');
    });
});
