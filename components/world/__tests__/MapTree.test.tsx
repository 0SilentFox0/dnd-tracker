// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapTree } from '../MapTree';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldMapSummary } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const map = (id: string, parentMapId: string | null): WorldMapSummary => ({
    id,
    name: id,
    parentMarkerId: null,
    parentMapId,
    imageUrl: '',
    width: 1,
    height: 1,
});

const maps = [map('town', 'root'), map('root', null), map('inn', 'town')];

describe('MapTree', () => {
    it('lists maps in tree order with depth-based levels', () => {
        render(<MapTree maps={maps} activeId="town" onOpen={vi.fn()} />);

        const items = screen.getAllByRole('treeitem');

        expect(items.map((i) => i.textContent)).toEqual(['root', 'town', 'inn']);
        expect(items.map((i) => i.getAttribute('aria-level'))).toEqual([
            '1',
            '2',
            '3',
        ]);
        expect(screen.getByRole('tree')).toBeTruthy();
    });

    it('marks the active map and opens on click and Enter', () => {
        const onOpen = vi.fn();

        render(<MapTree maps={maps} activeId="town" onOpen={onOpen} />);

        const [root, town] = screen.getAllByRole('treeitem');

        expect(town.getAttribute('aria-current')).toBe('true');
        expect(root.getAttribute('aria-current')).toBeNull();

        fireEvent.click(root);
        expect(onOpen).toHaveBeenCalledWith('root');

        fireEvent.keyDown(town, { key: 'Enter' });
        expect(onOpen).toHaveBeenLastCalledWith('town');
    });

    it('moves focus with ArrowDown and ArrowUp', () => {
        render(<MapTree maps={maps} activeId="root" onOpen={vi.fn()} />);

        const [root, town, inn] = screen.getAllByRole('treeitem');

        root.focus();
        fireEvent.keyDown(root, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(town);

        fireEvent.keyDown(town, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(inn);

        fireEvent.keyDown(inn, { key: 'ArrowUp' });
        expect(document.activeElement).toBe(town);
    });

    it('renders the footer', () => {
        render(
            <MapTree
                maps={maps}
                activeId={null}
                onOpen={vi.fn()}
                footer={<p>footer</p>}
            />
        );

        expect(screen.getByText('footer')).toBeTruthy();
    });
});
