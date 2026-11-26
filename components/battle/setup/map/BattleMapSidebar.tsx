'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
    DoorOpen,
    Grid2X2,
    Image as ImageIcon,
    type LucideIcon,
    Shapes,
    Square,
    Waves,
} from 'lucide-react';

import { GridTypeChoice } from './GridTypeChoice';
import { MapBackgroundSection } from './MapBackgroundSection';
import { MapCellToolsSection } from './MapCellToolsSection';
import { DoorToolOptions, EDGE_TOOLS, ToolButtons } from './MapToolButtons';

import { MapMotionPanel } from '@/components/battle/map/panels/MapMotionPanel';
import { MAP_MODE_UI, type MapModeUi } from '@/components/battle/modes';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import { useCoarsePointer } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import {
    isEdgeTool,
    marginLimit,
    type Margins,
    MAX_MARGIN,
    MAX_SIDE,
    MIN_PLAYABLE,
    MIN_SIDE,
} from '@/lib/utils/battle/grid';
import type { MapModeKey } from '@/lib/utils/battle/modes';
import { clamp } from '@/lib/utils/common/clamp';

export type BattleMapPanel =
    | 'size'
    | 'background'
    | 'cells'
    | 'edges'
    | 'mode'
    | 'motion';

const GROUPS: { key: 'map' | 'draw' | 'special'; panels: BattleMapPanel[] }[] =
    [
        { key: 'map', panels: ['size', 'background'] },
        { key: 'draw', panels: ['cells', 'edges'] },
        { key: 'special', panels: ['mode', 'motion'] },
    ];

const ICONS: Record<BattleMapPanel, LucideIcon> = {
    size: Grid2X2,
    background: ImageIcon,
    cells: Square,
    edges: DoorOpen,
    mode: Shapes,
    motion: Waves,
};

const MARGIN_KEYS: (keyof Margins)[] = ['top', 'right', 'bottom', 'left'];

const GROUP_LABEL =
    'col-span-2 px-1 pt-1 text-[10px] font-semibold tracking-wide text-hud-muted uppercase';

function SizePanel({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { map, margins, grid } = editor.state;

    const { actions } = editor;

    const setEqual = () => {
        const cap = Math.min(
            MAX_MARGIN,
            Math.floor((map.rows - MIN_PLAYABLE) / 2),
            Math.floor((map.cols - MIN_PLAYABLE) / 2)
        );

        const n = clamp(margins.top, 0, cap);

        actions.setMargins({ top: n, right: n, bottom: n, left: n });
    };

    return (
        <div className="space-y-4">
            <GridTypeChoice value={grid} onChange={actions.setGridType} />
            <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                    <Label htmlFor="map-cols">{t('cols')}</Label>
                    <BoundedNumberInput
                        id="map-cols"
                        value={map.cols}
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        onCommit={(v) => actions.setSize(v, map.rows)}
                    />
                </div>
                <div className="min-w-0">
                    <Label htmlFor="map-rows">{t('rows')}</Label>
                    <BoundedNumberInput
                        id="map-rows"
                        value={map.rows}
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        onCommit={(v) => actions.setSize(map.cols, v)}
                    />
                </div>
            </div>
            <Disclosure summary={t('margins.title')}>
                <div className="space-y-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={setEqual}
                    >
                        {t('margins.equal')}
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                        {MARGIN_KEYS.map((key) => (
                            <div key={key} className="min-w-0">
                                <Label
                                    htmlFor={`map-margin-${key}`}
                                    className="text-xs"
                                >
                                    {t(`margins.${key}`)}
                                </Label>
                                <BoundedNumberInput
                                    id={`map-margin-${key}`}
                                    value={margins[key]}
                                    min={0}
                                    max={marginLimit(map, margins, key)}
                                    onCommit={(v) =>
                                        actions.setMargins({
                                            ...margins,
                                            [key]: v,
                                        })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Disclosure>
        </div>
    );
}

function ModePanel({ editor }: { editor: BattleMapEditor }) {
    const { mode } = editor.state;

    const { actions } = editor;

    return (
        <div className="space-y-3">
            {(Object.entries(MAP_MODE_UI) as [MapModeKey, MapModeUi][]).map(
                ([key, { SetupToggle }]) =>
                    SetupToggle &&
                    editor.state.modeSupported(key) && (
                        <SetupToggle
                            key={key}
                            checked={mode === key}
                            onChange={(on) => actions.setMode(key, on)}
                        />
                    )
            )}
        </div>
    );
}

function EdgesPanel({
    editor,
    blocked,
}: {
    editor: BattleMapEditor;
    blocked: 'edgesDesktopOnly' | 'edgesDisabledMode' | null;
}) {
    const t = useTranslations('battleSetup.map');

    if (blocked) return <p className="text-sm text-hud-muted">{t(blocked)}</p>;

    return (
        <div className="space-y-2">
            <OnboardingHint id="dm.map-walls" />
            <Label>{t('edgeDrawing')}</Label>
            <ToolButtons
                tools={EDGE_TOOLS}
                tool={editor.state.tool}
                onPick={editor.actions.setTool}
            />
            <DoorToolOptions editor={editor} />
        </div>
    );
}

export function BattleMapSidebar({
    editor,
    panel,
    onPanel,
    uvtt,
}: {
    editor: BattleMapEditor;
    panel: BattleMapPanel;
    onPanel: (panel: BattleMapPanel) => void;
    uvtt: ReactNode;
}) {
    const t = useTranslations('battleSetup.map');

    const touch = useCoarsePointer();

    const { mode, tool } = editor.state;

    const terrainHidden = !!mode && !!MAP_MODE_UI[mode].hidesTerrain;

    const edgesBlocked = terrainHidden
        ? 'edgesDisabledMode'
        : touch
          ? 'edgesDesktopOnly'
          : null;

    const hasModes = (Object.keys(MAP_MODE_UI) as MapModeKey[]).some(
        (key) => MAP_MODE_UI[key].SetupToggle && editor.state.modeSupported(key)
    );

    const visible: Record<BattleMapPanel, boolean> = {
        size: true,
        background: true,
        cells: true,
        edges: true,
        mode: hasModes,
        motion: !!editor.motionTool,
    };

    const muted: Partial<Record<BattleMapPanel, boolean>> = {
        cells: terrainHidden,
        edges: !!edgesBlocked,
    };

    const current = visible[panel] ? panel : 'size';

    // a tool never outlives the panel that owns it
    const select = (next: BattleMapPanel) => {
        if (tool && next !== (isEdgeTool(tool) ? 'edges' : 'cells'))
            editor.actions.setTool(null);

        onPanel(next);
    };

    return (
        <Tabs
            value={current}
            onValueChange={(v) => select(v as BattleMapPanel)}
            className="min-w-0"
        >
            <TabsList
                aria-label={t('sidebar')}
                className="sticky top-0 z-20 grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-hud-panel p-1"
            >
                {GROUPS.map(({ key, panels }) => {
                    const shown = panels.filter((p) => visible[p]);

                    if (!shown.length) return null;

                    return (
                        <div key={key} className="contents">
                            <span className={GROUP_LABEL}>
                                {t(`groups.${key}`)}
                            </span>
                            {shown.map((p) => {
                                const Icon = ICONS[p];

                                return (
                                    <TabsTrigger
                                        key={p}
                                        type="button"
                                        value={p}
                                        title={t(`panels.${p}`)}
                                        aria-disabled={muted[p] || undefined}
                                        className={cn(
                                            'flex h-11 min-w-0 flex-row items-center justify-start gap-2 rounded-md border border-hud-rule px-2 text-left text-xs leading-tight text-hud-muted data-[state=active]:border-hud-accent data-[state=active]:bg-hud-panel-2 data-[state=active]:text-hud-ink',
                                            muted[p] && 'opacity-60'
                                        )}
                                    >
                                        <Icon
                                            aria-hidden="true"
                                            className="h-4 w-4 shrink-0"
                                        />
                                        <span className="min-w-0 truncate">
                                            {t(`panels.${p}`)}
                                        </span>
                                    </TabsTrigger>
                                );
                            })}
                        </div>
                    );
                })}
            </TabsList>
            <div className="ds-inset my-3 rounded-lg px-3 py-2">
                <h2 className="text-sm font-semibold text-hud-ink">
                    {t(`panels.${current}`)}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-hud-muted">
                    {t(`panelDescription.${current}`)}
                </p>
            </div>
            {current === 'size' && <SizePanel editor={editor} />}
            {current === 'background' && (
                <div className="space-y-3">
                    {uvtt}
                    <MapBackgroundSection editor={editor} />
                </div>
            )}
            {current === 'cells' &&
                (terrainHidden ? (
                    <p className="text-sm text-hud-muted">
                        {t('edgesDisabledMode')}
                    </p>
                ) : (
                    <MapCellToolsSection editor={editor} />
                ))}
            {current === 'edges' && (
                <EdgesPanel editor={editor} blocked={edgesBlocked} />
            )}
            {current === 'mode' && visible.mode && (
                <ModePanel editor={editor} />
            )}
            {current === 'motion' && editor.motionTool && (
                <MapMotionPanel tool={editor.motionTool} />
            )}
        </Tabs>
    );
}
