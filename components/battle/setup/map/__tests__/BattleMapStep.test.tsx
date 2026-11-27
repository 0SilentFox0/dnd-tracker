// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleMapStep } from '../BattleMapStep';

import type { BattleLibraryMap, BattleMapEditor } from '@/lib/hooks/battles';

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock('../LibraryMapGrid', () => ({ LibraryMapGrid: () => <p>grid</p> }));
vi.mock('../BattleMapSidebar', () => ({ BattleMapSidebar: () => <p>side</p> }));
vi.mock('../SaveToLibraryButton', () => ({
    SaveToLibraryButton: () => null,
}));
vi.mock('@/components/battle/map', () => ({ BattleMap: () => <i /> }));
vi.mock('@/components/maps/editor/MapWorkbench', () => ({
    MapWorkbench: ({ canvas }: { canvas: React.ReactNode }) => (
        <div>{canvas}</div>
    ),
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useActiveToolChip: () => ({
        tool: null,
        onClear: vi.fn(),
        onEscape: () => false,
    }),
    useUvttImport: () => ({ error: null, warnings: [], importFile: vi.fn() }),
}));
vi.mock('@/lib/i18n/use-text', () => ({ useText: () => (s: string) => s }));

function setup(enabled: boolean, visible = true) {
    const setEnabled = vi.fn();

    const select = vi.fn();

    const editor = {
        state: {
            enabled,
            map: { cols: 20, rows: 12, background: null },
            tool: null,
            notice: null,
            mode: null,
            modeSupported: () => false,
        },
        actions: { setEnabled, replaceMapFromImport: vi.fn() },
        edgeEditing: undefined,
    } as unknown as BattleMapEditor;

    const library = {
        visible,
        selectedId: null,
        select,
    } as unknown as BattleLibraryMap;

    render(<BattleMapStep campaignId="c1" editor={editor} library={library} />);

    return { setEnabled, select };
}

afterEach(cleanup);

describe('BattleMapStep', () => {
    it('own source enables the map editor', () => {
        const { setEnabled } = setup(false);

        fireEvent.click(
            screen.getByRole('radio', { name: 'battleSetup.map.source.own' })
        );

        expect(setEnabled).toHaveBeenCalledWith(true);
    });

    it('library source disables the own map and shows the grid', () => {
        const { setEnabled } = setup(true);

        fireEvent.click(
            screen.getByRole('radio', {
                name: 'battleSetup.map.source.library',
            })
        );

        expect(setEnabled).toHaveBeenCalledWith(false);
        expect(screen.getByText('grid')).toBeTruthy();
    });

    it('offers only two sources without a library', () => {
        setup(false, false);

        expect(screen.getAllByRole('radio')).toHaveLength(2);
    });

    it('shows quick start on a fresh own map', () => {
        setup(true);

        expect(
            screen.getByText('battleSetup.map.quickStart.title')
        ).toBeTruthy();
    });
});
