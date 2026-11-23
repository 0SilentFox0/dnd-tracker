// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldJourneyHud } from '../WorldJourneyHud';

import type { WorldMarker } from '@/types/world';

const marker = (
    id: string,
    fields: Partial<WorldMarker> = {}
): WorldMarker => ({
    id,
    mapId: 'root',
    kind: 'point',
    x: 0.5,
    y: 0.5,
    polygon: null,
    name: id,
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
    ...fields,
});

afterEach(cleanup);

describe('WorldJourneyHud', () => {
    it('opens known children and focuses a visible marker whose child is still unknown', () => {
        const actions = {
            pickMarker: vi.fn(),
            openMap: vi.fn(),
            openTree: vi.fn(),
        };

        render(
            <WorldJourneyHud
                places={{
                    markers: [
                        marker('Castle', { childMapId: 'child' }),
                        marker('Gate', { childMapId: 'unknown' }),
                        marker('Hidden trail', { layerId: 'hidden' }),
                    ],
                    maps: [
                        {
                            id: 'child',
                            name: 'Courtyard',
                            parentMarkerId: 'Castle',
                            parentMapId: 'root',
                            imageUrl: '/map.jpg',
                            width: 300,
                            height: 300,
                        },
                    ],
                    hidden: new Set(['hidden']),
                }}
                actions={actions}
            />
        );

        expect(
            screen.queryByRole('button', { name: 'Hidden trail' })
        ).toBeNull();
        fireEvent.click(
            screen.getByRole('button', {
                name: 'world.bubble.openMap: Courtyard',
            })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Gate' }));

        expect(actions.openMap).toHaveBeenCalledExactlyOnceWith('child');
        expect(actions.pickMarker).toHaveBeenCalledExactlyOnceWith('Gate');
    });

    it('lets the viewer open the map tree from the empty panel', () => {
        const openTree = vi.fn();

        render(
            <WorldJourneyHud
                places={{ markers: [], maps: [], hidden: new Set() }}
                actions={{ pickMarker: vi.fn(), openMap: vi.fn(), openTree }}
            />
        );

        expect(screen.getByText('world.journey.empty')).toBeVisible();
        fireEvent.click(
            screen.getByRole('button', { name: 'world.tree.toggle' })
        );
        expect(openTree).toHaveBeenCalledOnce();
    });
});
