// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LibraryMapGrid } from '../LibraryMapGrid';

import type { BattleLibraryMap } from '@/lib/hooks/battles';

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock('@/components/battle/list/BattleMapThumb', () => ({
    BattleMapThumb: () => <i />,
}));
vi.mock('@/components/battle/map', () => ({ BattleMap: () => <i /> }));
vi.mock('@/components/maps/MapCatalogDialog', () => ({
    MapCatalogDialog: () => null,
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMap: () => ({ data: undefined }),
}));
vi.mock('@/lib/hooks/common', () => ({ useMediaQuery: () => false }));

const brief = (id: string, cols: number) => ({
    id,
    name: `Map ${id}`,
    cols,
    rows: 10,
    version: 1,
    updatedAt: '',
    thumb: null,
});

function setup(over: Partial<BattleLibraryMap> = {}) {
    const library = {
        visible: true,
        maps: [brief('a', 20), brief('b', 80)],
        maxSide: 60,
        isLinked: false,
        wasLinked: false,
        isLocked: false,
        isChanged: false,
        canUnlink: true,
        selectedId: null,
        select: vi.fn(),
        ...over,
    } as unknown as BattleLibraryMap;

    const onClear = vi.fn();

    render(
        <LibraryMapGrid library={library} campaignId="c1" onClear={onClear} />
    );

    return { library, onClear };
}

const tile = (name: string) =>
    screen.getByRole('button', { name: new RegExp(name) });

afterEach(cleanup);

describe('LibraryMapGrid', () => {
    it('selects a map on click', () => {
        const { library } = setup();

        fireEvent.click(tile('Map a'));

        expect(library.select).toHaveBeenCalledWith('a');
    });

    it('does not select a map that is too large', () => {
        const { library } = setup();

        fireEvent.click(tile('Map b'));

        expect(tile('Map b').getAttribute('aria-disabled')).toBe('true');
        expect(library.select).not.toHaveBeenCalled();
    });

    it('disables the whole grid when locked', () => {
        const { library } = setup({ isLocked: true });

        fireEvent.click(tile('Map a'));

        expect(tile('Map a').getAttribute('aria-disabled')).toBe('true');
        expect(library.select).not.toHaveBeenCalled();
        expect(screen.getByText('battleSetup.library.locked')).toBeTruthy();
    });

    it('deselects the chosen map', () => {
        const { library, onClear } = setup({ selectedId: 'a' });

        fireEvent.click(tile('Map a'));

        expect(onClear).toHaveBeenCalled();
        expect(library.select).toHaveBeenCalledWith(null);
    });

    it('filters by search', () => {
        setup();

        fireEvent.change(screen.getByRole('searchbox'), {
            target: { value: 'Map b' },
        });

        expect(screen.queryByRole('button', { name: /Map a/ })).toBeNull();
    });
});
