// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleMapLibraryPicker } from '../BattleMapLibraryPicker';

import type { BattleLibraryMap } from '@/lib/hooks/battles';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const brief = (id: string, cols: number) => ({
    id,
    name: `Map ${id}`,
    cols,
    rows: 10,
    version: 1,
    updatedAt: '',
});

vi.unmock('next-intl');

function renderPicker(over: Partial<BattleLibraryMap>) {
    const library = {
        visible: true,
        maps: [brief('a', 20), brief('b', 80)],
        maxSide: 60,
        isLinked: false,
        wasLinked: false,
        isLocked: false,
        isChanged: false,
        selectedId: null,
        select: vi.fn(),
        ...over,
    } as BattleLibraryMap;

    return renderWithIntl(
        <BattleMapLibraryPicker campaignId="c1" library={library} />,
        { locale: 'en', namespaces: ['common', 'battleSetup'] }
    );
}

afterEach(cleanup);

describe('BattleMapLibraryPicker', () => {
    it('links to the maps page', async () => {
        await renderPicker({});

        expect(
            screen
                .getByRole('link', { name: 'Manage maps' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/maps');
    });

    it('shows the size of the chosen map', async () => {
        await renderPicker({ selectedId: 'a' });

        expect(
            screen.getByText(/uses this library map \(20×10\)/)
        ).toBeTruthy();
    });

    it('explains the linked state while the select stays usable before start', async () => {
        await renderPicker({
            isLinked: true,
            wasLinked: true,
            selectedId: 'a',
        });

        expect(screen.getByText(/linked to a library map/)).toBeTruthy();
        expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(
            false
        );
    });

    it('locks the select with an explanation for a started battle', async () => {
        await renderPicker({
            isLinked: true,
            wasLinked: true,
            isLocked: true,
            selectedId: 'a',
        });

        expect(screen.getByText(/already started/)).toBeTruthy();
        expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(
            true
        );
    });
});
