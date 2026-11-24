// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DrawerRail } from '../DrawerRail';
import { railKeys } from '../rail-items';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';

vi.unmock('next-intl');

const MAP = { cols: 4, rows: 3, background: null, opacity: 0.3 };

const grid = {
    dm: { isDM: true, readOnly: false },
    player: { isDM: false, readOnly: false },
    observer: { isDM: false, readOnly: true },
    playerView: { isDM: false, readOnly: true },
} as const;

describe('railKeys', () => {
    afterEach(cleanup);

    it.each([
        ['dm', 'map', ['log', 'dm', 'reserve', 'tools']],
        ['dm', 'no map', ['log', 'dm', 'tools']],
        ['player', 'map', ['log', 'reserve', 'tools']],
        ['observer', 'map', ['log', 'reserve', 'tools']],
        ['playerView', 'map', ['log', 'reserve', 'tools']],
        ['playerView', 'no map', ['log', 'tools']],
    ] as const)('%s, %s', (who, withMap, expected) => {
        expect(
            railKeys({
                ...grid[who],
                hasMap: withMap === 'map',
                reserveCount: 1,
            })
        ).toEqual(expected);
    });

    it('reserve button needs a non-empty reserve', () => {
        expect(
            railKeys({ ...grid.dm, hasMap: true, reserveCount: 0 })
        ).toEqual(['log', 'dm', 'tools']);
    });
});

describe('DrawerRail', () => {
    afterEach(cleanup);

    const names = () =>
        screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));

    it('DM with a map and a reserve sees all four buttons', () => {
        const imp = createMockParticipant();

        const { wrapper } = fakeScene({ isDM: true, map: MAP, reserve: [imp] });

        render(<DrawerRail active={null} onToggle={vi.fn()} />, { wrapper });

        expect(names()).toEqual([
            'Журнал',
            'Дії ведучого',
            'Резерв',
            'Інструменти',
        ]);
    });

    it('player without a map sees log and tools only; the active button is pressed', () => {
        const { wrapper } = fakeScene({});

        const onToggle = vi.fn();

        render(<DrawerRail active="tools" onToggle={onToggle} />, { wrapper });

        expect(names()).toEqual(['Журнал', 'Інструменти']);
        expect(
            screen
                .getByRole('button', { name: 'Інструменти' })
                .getAttribute('aria-pressed')
        ).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: 'Журнал' }));

        expect(onToggle).toHaveBeenCalledWith('log');
    });

    it('player view hides the DM button even for the real DM', () => {
        const { wrapper } = fakeScene({ playerView: true, map: MAP });

        render(<DrawerRail active={null} onToggle={vi.fn()} />, { wrapper });

        expect(names()).not.toContain('Дії ведучого');
    });
});
