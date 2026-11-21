// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaceSearchBar } from '../PlaceSearchBar';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldMarker } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const marker = (o: Partial<WorldMarker>): WorldMarker => ({
    id: 'm',
    mapId: 'map',
    kind: 'point',
    x: 0.5,
    y: 0.5,
    polygon: null,
    name: 'Marker',
    icon: null,
    color: null,
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: null,
    labelMode: null,
    fillOpacity: null,
    ...o,
});

const markers = [
    marker({
        id: 'a',
        name: 'Altaria',
        icon: 'castle',
        description: 'Твердиня',
    }),
    marker({
        id: 'b',
        name: 'Borin',
        icon: 'camp',
        description: 'Табір драконів',
    }),
    marker({
        id: 'c',
        name: 'Cedar',
        kind: 'zone',
        polygon: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
        ],
    }),
];

const type = (v: string) =>
    fireEvent.change(screen.getByLabelText('Пошук місць'), {
        target: { value: v },
    });

describe('PlaceSearchBar', () => {
    it('filters by name and by description', () => {
        const onPick = vi.fn();

        render(<PlaceSearchBar markers={markers} onPick={onPick} />);

        type('alt');
        expect(screen.getByText('Altaria')).toBeTruthy();
        expect(screen.queryByText('Borin')).toBeNull();

        type('драконів');
        expect(screen.getByText('Borin')).toBeTruthy();
        expect(screen.queryByText('Altaria')).toBeNull();

        fireEvent.click(screen.getByText('Borin'));
        expect(onPick).toHaveBeenCalledWith('b');
    });

    it('kind chip hides non-matching results', () => {
        render(<PlaceSearchBar markers={markers} onPick={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Зони' }));

        expect(screen.getByText('Cedar')).toBeTruthy();
        expect(screen.queryByText('Altaria')).toBeNull();
    });

    it('icon chip hides non-matching results and combines with the query', () => {
        render(<PlaceSearchBar markers={markers} onPick={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /Замок/ }));

        expect(screen.getByText('Altaria')).toBeTruthy();
        expect(screen.queryByText('Borin')).toBeNull();

        type('borin');
        expect(screen.queryByText('Altaria')).toBeNull();
        expect(screen.queryByText('Borin')).toBeNull();
    });

    it('has no chips for icons that are not present', () => {
        render(<PlaceSearchBar markers={markers} onPick={vi.fn()} />);

        expect(screen.queryByRole('button', { name: /Портал/ })).toBeNull();
        expect(screen.getByRole('button', { name: /Табір/ })).toBeTruthy();
    });
});
