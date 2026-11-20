// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrailLegend } from '../TrailLegend';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { Trail } from '@/lib/utils/world/trail';
import type { WorldSession } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const session = (id: string, name: string): WorldSession => ({
    id,
    name,
    description: null,
    color: '#4f81bd',
    startedAt: '2026-11-20T10:00:00.000Z',
    endedAt: null,
    active: false,
});

const trail = (sessionId: string | null): Trail => ({
    sessionId,
    nodes: [],
    segments: [],
});

describe('TrailLegend', () => {
    it('lists only sessions that have trails on this map', () => {
        render(
            <TrailLegend
                trails={[trail('s1'), trail(null)]}
                sessions={[session('s1', 'Похід'), session('s2', 'Інша')]}
                visible={new Set(['s1', null])}
                onToggle={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: 'Похід' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Без сесії' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Інша' })).toBeNull();
    });

    it('toggles a session and reflects visibility', () => {
        const onToggle = vi.fn();

        render(
            <TrailLegend
                trails={[trail('s1')]}
                sessions={[session('s1', 'Похід')]}
                visible={new Set()}
                onToggle={onToggle}
            />
        );

        const chip = screen.getByRole('button', { name: 'Похід' });

        expect(chip.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(chip);

        expect(onToggle).toHaveBeenCalledWith('s1');
    });

    it('renders nothing without trails', () => {
        const { container } = render(
            <TrailLegend
                trails={[]}
                sessions={[]}
                visible={new Set()}
                onToggle={vi.fn()}
            />
        );

        expect(container.innerHTML).toBe('');
    });
});
