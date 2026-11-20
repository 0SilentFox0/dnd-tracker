// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MoveMapMenu } from '../MoveMapMenu';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { ScenarioMarkerRef } from '@/types/scenario';
import type { WorldMapSummary, WorldMarker } from '@/types/world';

vi.unmock('next-intl');

let picker: {
    open: boolean;
    excludeMapIds?: string[];
    title?: string;
    markerFilter?: (m: WorldMarker) => boolean;
    onPick(ref: ScenarioMarkerRef): void;
} | null = null;

vi.mock('@/components/world/MarkerPickerDialog', () => ({
    MarkerPickerDialog: (props: NonNullable<typeof picker>) => {
        picker = props;

        return props.open ? <span>picker-open</span> : null;
    },
}));

afterEach(() => {
    cleanup();
    picker = null;
});

const map = (id: string, parentMapId: string | null) =>
    ({ id, name: id, parentMapId }) as WorldMapSummary;

const maps = [
    map('root', null),
    map('a', 'root'),
    map('b', 'a'),
    map('c', 'root'),
];

describe('MoveMapMenu', () => {
    it('renders nothing for the root map', () => {
        const { container } = render(
            <MoveMapMenu
                campaignId="c1"
                map={maps[0]}
                maps={maps}
                onMove={vi.fn()}
            />
        );

        expect(container.textContent).toBe('');
    });

    it('opens the picker excluding its own subtree and showing only free markers', () => {
        render(
            <MoveMapMenu
                campaignId="c1"
                map={maps[1]}
                maps={maps}
                onMove={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Перенести/ }));

        expect(screen.getByText('picker-open')).toBeTruthy();
        expect(picker?.title).toBe('Перемістити карту до місця');
        expect(picker?.excludeMapIds?.sort()).toEqual(['a', 'b']);
        expect(
            picker?.markerFilter?.({ childMapId: null } as WorldMarker)
        ).toBe(true);
        expect(picker?.markerFilter?.({ childMapId: 'x' } as WorldMarker)).toBe(
            false
        );
    });

    it('calls onMove with the picked marker id', () => {
        const onMove = vi.fn();

        render(
            <MoveMapMenu
                campaignId="c1"
                map={maps[1]}
                maps={maps}
                onMove={onMove}
            />
        );

        picker?.onPick({ mapId: 'c', markerId: 'k9' });

        expect(onMove).toHaveBeenCalledWith('k9');
    });
});
