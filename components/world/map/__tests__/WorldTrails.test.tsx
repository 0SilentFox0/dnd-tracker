// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldTrails } from '../WorldTrails';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { Trail } from '@/lib/utils/world/trail';
import type { WorldSession } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const session: WorldSession = {
    id: 's1',
    name: 'Похід',
    description: null,
    color: '#c0504d',
    startedAt: '2026-11-20T10:00:00.000Z',
    endedAt: null,
    active: true,
};

const node = (entryId: string, x: number, y: number) => ({
    entryId,
    x,
    y,
    kind: 'travel' as const,
    at: '2026-11-20T10:00:00.000Z',
    heroes: [{ id: 'h1', name: 'Арвен' }],
});

const trail = (sessionId: string | null): Trail => ({
    sessionId,
    nodes: [node(`${sessionId}-a`, 0.1, 0.1), node(`${sessionId}-b`, 0.5, 0.5)],
    segments: [
        {
            entryId: `${sessionId}-b`,
            from: { x: 0.1, y: 0.1 },
            to: { x: 0.5, y: 0.5 },
        },
    ],
});

const props = (over = {}) => ({
    trails: [trail('s1')],
    sessions: [session],
    visible: new Set<string | null>(['s1']),
    zoom: 1,
    onSelect: vi.fn(),
    ...over,
});

describe('WorldTrails', () => {
    it('renders segments and nodes, marking the last node', () => {
        render(<WorldTrails {...props()} />);

        expect(screen.getAllByTestId('trail-segment')).toHaveLength(1);

        const nodes = screen.getAllByRole('button', { name: /Похід/ });

        expect(nodes.filter((n) => n.tagName === 'BUTTON')).toHaveLength(2);
        expect(
            nodes.find((n) => n.getAttribute('data-last') === 'true')
        ).toBeTruthy();
    });

    it('hides a trail whose session is toggled off', () => {
        const { container } = render(
            <WorldTrails {...props({ visible: new Set() })} />
        );

        expect(container.innerHTML).toBe('');
    });

    it('labels the no-session trail', () => {
        render(
            <WorldTrails
                {...props({
                    trails: [trail(null)],
                    visible: new Set([null]),
                })}
            />
        );

        expect(
            screen.getAllByRole('button', { name: /Без сесії/ }).length
        ).toBeGreaterThan(0);
    });

    it('reports the clicked node and segment', () => {
        const onSelect = vi.fn();

        render(<WorldTrails {...props({ onSelect })} />);

        const [first] = screen
            .getAllByRole('button', { name: /Похід/ })
            .filter((n) => n.tagName === 'BUTTON');

        fireEvent.click(first);

        expect(onSelect).toHaveBeenCalledWith('s1-a');

        const segment = screen
            .getAllByRole('button', { name: /Шлях/ })
            .find((n) => n.tagName.toLowerCase() === 'line');

        fireEvent.click(segment as Element);

        expect(onSelect).toHaveBeenLastCalledWith('s1-b');
    });
});
