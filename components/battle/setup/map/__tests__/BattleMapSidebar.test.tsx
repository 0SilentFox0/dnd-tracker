// @vitest-environment happy-dom
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BattleMapSidebar } from '../BattleMapSidebar';
import { useMapModeFlags } from '../sections/ModeSection';

import type { BattleMapEditor } from '@/lib/hooks/battles';
import { useBattleMapSections } from '@/lib/hooks/battles/setup/useBattleMapSections';
import type { BattleMapSection } from '@/lib/utils/battle/grid/map-sections';

const touch = vi.hoisted(() => ({ value: false }));

const modes = vi.hoisted(() => ({
    ui: {} as Record<string, { SetupToggle?: unknown; hidesTerrain: boolean }>,
}));

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock('@/lib/hooks/common', () => ({
    useCoarsePointer: () => touch.value,
}));

vi.mock('@/components/battle/modes', () => ({
    get MAP_MODE_UI() {
        return modes.ui;
    },
}));

vi.mock('@/components/battle/map/panels/MapMotionPanel', () => ({
    MapMotionPanel: () => <p>motion-panel</p>,
}));

vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: () => null,
}));

vi.mock('../shared/MapBackgroundImage', () => ({
    MapBackgroundImage: () => <p>background-image</p>,
}));

vi.mock('../shared/MapGridAlignment', () => ({
    MapGridAlignment: () => <p>alignment</p>,
}));

vi.mock('../shared/MapCellToolsSection', () => ({
    MapCellToolsSection: () => <p>cell-tools</p>,
}));

vi.mock('../sections/GridSizeSection', () => ({
    GridSizeSection: () => <p>grid-size</p>,
}));

vi.mock('../sections/MarginsSection', () => ({
    MarginsSection: () => <p>margins-section</p>,
}));

const Toggle = () => <p>maze-toggle</p>;

function makeEditor(
    state: Record<string, unknown> = {},
    extra: Record<string, unknown> = {}
) {
    const setTool = vi.fn();

    const editor = {
        state: {
            map: { cols: 20, rows: 12 },
            margins: { top: 0, right: 0, bottom: 0, left: 0 },
            grid: 'square',
            mode: null,
            tool: null,
            modeSupported: () => true,
            ...state,
        },
        actions: { setTool },
        motionTool: null,
        ...extra,
    } as unknown as BattleMapEditor;

    return { editor, setTool };
}

function Harness({
    editor,
    initial,
}: {
    editor: BattleMapEditor;
    initial: BattleMapSection;
}) {
    const { hasModes, hidesTerrain } = useMapModeFlags(editor);

    const sections = useBattleMapSections(editor, {
        touch: touch.value,
        hasModes,
        hidesTerrain,
    });

    const { select } = sections;

    useEffect(() => {
        if (initial !== 'grid') select(initial);
    }, [select, initial]);

    return (
        <BattleMapSidebar
            editor={editor}
            sections={sections}
            uvtt={<p>uvtt</p>}
        />
    );
}

function renderSidebar(
    editor: BattleMapEditor,
    initial: BattleMapSection = 'grid'
) {
    render(<Harness editor={editor} initial={initial} />);
}

beforeEach(() => {
    touch.value = false;
    modes.ui = {};
});

afterEach(cleanup);

const tab = (name: string) =>
    screen.queryByRole('tab', { name: `battleSetup.map.panels.${name}` });

describe('BattleMapSidebar', () => {
    it('keeps walls available on a hex grid', () => {
        renderSidebar(makeEditor({ grid: 'hex' }).editor, 'edges');

        expect(screen.queryByText('battleSetup.map.edgesDesktopOnly')).toBeNull();
        expect(tab('edges')?.getAttribute('aria-disabled')).toBeNull();
    });

    it('explains that walls are desktop only on touch', () => {
        touch.value = true;

        renderSidebar(makeEditor().editor, 'edges');

        expect(
            screen.getByText('battleSetup.map.edgesDesktopOnly')
        ).toBeTruthy();
    });

    it('disables cells and edges in a mode that hides terrain', () => {
        modes.ui = { maze: { SetupToggle: Toggle, hidesTerrain: true } };

        renderSidebar(makeEditor({ mode: 'maze' }).editor, 'cells');

        expect(
            screen.getByText('battleSetup.map.edgesDisabledMode')
        ).toBeTruthy();
        expect(tab('cells')?.getAttribute('aria-disabled')).toBe('true');
        expect(tab('edges')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('hides the mode panel when no mode is supported', () => {
        renderSidebar(makeEditor().editor);

        expect(tab('mode')).toBeNull();
    });

    it('shows the mode panel when a mode has a toggle', () => {
        modes.ui = { maze: { SetupToggle: Toggle, hidesTerrain: true } };

        renderSidebar(makeEditor().editor, 'mode');

        expect(tab('mode')).toBeTruthy();
        expect(screen.getByText('maze-toggle')).toBeTruthy();
    });

    it('hides motion without a motion tool', () => {
        renderSidebar(makeEditor().editor);

        expect(tab('motion')).toBeNull();
    });

    it('splits grid, calibration, background and margins into own sections', () => {
        renderSidebar(makeEditor().editor);

        ['grid', 'calibration', 'background', 'margins'].forEach((id) =>
            expect(tab(id)).toBeTruthy()
        );
        expect(screen.getByText('grid-size')).toBeTruthy();
    });

    it('shows alignment only on the calibration section', () => {
        renderSidebar(makeEditor().editor, 'calibration');

        expect(screen.getByText('alignment')).toBeTruthy();
        expect(screen.queryByText('background-image')).toBeNull();
    });

    it('clears a cell tool when leaving the cells section', () => {
        const { editor, setTool } = makeEditor({ tool: 'blocked' });

        renderSidebar(editor, 'cells');

        fireEvent.mouseDown(tab('edges') as HTMLElement);
        fireEvent.click(tab('edges') as HTMLElement);

        expect(setTool).toHaveBeenCalledWith(null);
        expect(tab('edges')?.getAttribute('data-state')).toBe('active');
    });

    it('keeps a tool that belongs to the target section', () => {
        const { editor, setTool } = makeEditor({ tool: 'edge-wall' });

        renderSidebar(editor, 'grid');

        fireEvent.mouseDown(tab('edges') as HTMLElement);
        fireEvent.click(tab('edges') as HTMLElement);

        expect(setTool).not.toHaveBeenCalled();
    });
});
