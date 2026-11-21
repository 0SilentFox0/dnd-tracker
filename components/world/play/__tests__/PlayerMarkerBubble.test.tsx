// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayerMarkerBubble } from '../PlayerMarkerBubble';

import type { WorldMarker } from '@/types/world';

afterEach(cleanup);

const marker = {
    name: 'Town',
    description: 'Old market town',
    icon: 'city',
    kind: 'point',
    childMapId: 'm2',
} as WorldMarker;

describe('PlayerMarkerBubble', () => {
    it('shows the name and wires the actions', () => {
        const actions = {
            onMore: vi.fn(),
            onOpenMap: vi.fn(),
            onClose: vi.fn(),
        };

        render(<PlayerMarkerBubble marker={marker} actions={actions} />);

        expect(screen.getByText('Town')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /more|Докладніше/ }));
        fireEvent.click(
            screen.getByRole('button', { name: /open|Відкрити/i })
        );
        fireEvent.click(screen.getByRole('button', { name: /close|Закрити/i }));

        expect(actions.onMore).toHaveBeenCalled();
        expect(actions.onOpenMap).toHaveBeenCalled();
        expect(actions.onClose).toHaveBeenCalled();
    });

    it('omits open-map without the action', () => {
        render(
            <PlayerMarkerBubble
                marker={marker}
                actions={{ onMore: vi.fn(), onClose: vi.fn() }}
            />
        );

        expect(screen.queryByRole('button', { name: /open|Відкрити/i })).toBeNull();
    });
});
