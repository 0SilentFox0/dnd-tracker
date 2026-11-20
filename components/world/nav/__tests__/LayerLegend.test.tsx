// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LayerLegend } from '../LayerLegend';

import { render } from '@/components/ui/__tests__/uk-intl';

vi.unmock('next-intl');

afterEach(cleanup);

const layers = [
    { id: 'a', name: 'Море', color: '#3366ff' },
    { id: 'b', name: 'Гори', color: null },
];

describe('LayerLegend', () => {
    it('renders nothing for an empty list', () => {
        const { container } = render(
            <LayerLegend layers={[]} hidden={new Set()} onToggle={vi.fn()} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('toggles a layer on click', () => {
        const onToggle = vi.fn();

        render(
            <LayerLegend
                layers={layers}
                hidden={new Set(['b'])}
                onToggle={onToggle}
            />
        );

        fireEvent.click(screen.getByText('Море'));

        expect(onToggle).toHaveBeenCalledWith('a');
    });

    it('shows the no-layer chip only with showUnlayered and toggles it', () => {
        const onToggle = vi.fn();

        const { rerender } = render(
            <LayerLegend
                layers={layers}
                hidden={new Set()}
                onToggle={onToggle}
            />
        );

        expect(screen.queryByText('Без шару')).toBeNull();

        rerender(
            <LayerLegend
                layers={layers}
                hidden={new Set()}
                onToggle={onToggle}
                showUnlayered
            />
        );

        fireEvent.click(screen.getByText('Без шару'));

        expect(onToggle).toHaveBeenCalledWith('__none__');
    });
});
