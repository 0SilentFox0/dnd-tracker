'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
    Crosshair,
    DoorOpen,
    Grid2X2,
    Image as ImageIcon,
    type LucideIcon,
    Maximize,
    Shapes,
    Square,
    Waves,
} from 'lucide-react';

import { EdgesSection } from './sections/EdgesSection';
import { GridSizeSection } from './sections/GridSizeSection';
import { MarginsSection } from './sections/MarginsSection';
import { ModeSection } from './sections/ModeSection';
import { MapBackgroundImage } from './shared/MapBackgroundImage';
import { MapCellToolsSection } from './shared/MapCellToolsSection';
import { MapGridAlignment } from './shared/MapGridAlignment';

import { MapMotionPanel } from '@/components/battle/map/panels/MapMotionPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BattleMapEditor, BattleMapSections } from '@/lib/hooks/battles';
import { cn } from '@/lib/utils';
import type { BattleMapSection } from '@/lib/utils/battle/grid/map-sections';

const GROUPS: { key: 'map' | 'draw' | 'special'; sections: BattleMapSection[] }[] =
    [
        {
            key: 'map',
            sections: ['grid', 'calibration', 'background', 'margins'],
        },
        { key: 'draw', sections: ['cells', 'edges'] },
        { key: 'special', sections: ['mode', 'motion'] },
    ];

const ICONS: Record<BattleMapSection, LucideIcon> = {
    grid: Grid2X2,
    calibration: Crosshair,
    background: ImageIcon,
    margins: Maximize,
    cells: Square,
    edges: DoorOpen,
    mode: Shapes,
    motion: Waves,
};

const GROUP_LABEL =
    'col-span-2 px-1 pt-1 text-xs font-semibold tracking-wide text-hud-muted uppercase';

function SectionBody({
    editor,
    section,
    uvtt,
}: {
    editor: BattleMapEditor;
    section: BattleMapSection;
    uvtt: ReactNode;
}) {
    switch (section) {
        case 'grid':
            return <GridSizeSection editor={editor} />;
        case 'calibration':
            return <MapGridAlignment editor={editor} />;
        case 'background':
            return (
                <div className="space-y-3">
                    {uvtt}
                    <MapBackgroundImage editor={editor} />
                </div>
            );
        case 'margins':
            return <MarginsSection editor={editor} />;
        case 'cells':
            return <MapCellToolsSection editor={editor} />;
        case 'edges':
            return <EdgesSection editor={editor} />;
        case 'mode':
            return <ModeSection editor={editor} />;
        case 'motion':
            return editor.motionTool ? (
                <MapMotionPanel tool={editor.motionTool} />
            ) : null;
    }
}

export function BattleMapSidebar({
    editor,
    sections,
    uvtt,
}: {
    editor: BattleMapEditor;
    sections: BattleMapSections;
    uvtt: ReactNode;
}) {
    const t = useTranslations('battleSetup.map');

    const { list, active, select } = sections;

    const stateOf = (id: BattleMapSection) => list.find((s) => s.id === id);

    const current = stateOf(active);

    return (
        <Tabs
            value={active}
            onValueChange={(v) => select(v as BattleMapSection)}
            className="min-w-0"
        >
            <TabsList
                aria-label={t('sidebar')}
                className="sticky top-0 z-20 grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-hud-panel p-1"
            >
                {GROUPS.map(({ key, sections: ids }) => {
                    const shown = ids.filter(
                        (id) => stateOf(id)?.status !== 'hidden'
                    );

                    if (!shown.length) return null;

                    return (
                        <div key={key} className="contents">
                            <span className={GROUP_LABEL}>
                                {t(`groups.${key}`)}
                            </span>
                            {shown.map((id) => {
                                const Icon = ICONS[id];

                                const muted = stateOf(id)?.status === 'disabled';

                                return (
                                    <TabsTrigger
                                        key={id}
                                        type="button"
                                        value={id}
                                        title={t(`panels.${id}`)}
                                        aria-disabled={muted || undefined}
                                        className={cn(
                                            'flex h-11 min-w-0 flex-row items-center justify-start gap-2 rounded-md border border-hud-rule px-2 text-left text-xs leading-tight text-hud-muted data-[state=active]:border-hud-accent data-[state=active]:bg-hud-panel-2 data-[state=active]:text-hud-ink',
                                            muted && 'opacity-60'
                                        )}
                                    >
                                        <Icon
                                            aria-hidden="true"
                                            className="h-4 w-4 shrink-0"
                                        />
                                        <span className="min-w-0 truncate">
                                            {t(`panels.${id}`)}
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
                    {t(`panels.${active}`)}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-hud-muted">
                    {t(`panelDescription.${active}`)}
                </p>
            </div>
            {current?.status === 'disabled' && current.reason ? (
                <p className="text-sm text-hud-muted">{t(current.reason)}</p>
            ) : (
                <SectionBody editor={editor} section={active} uvtt={uvtt} />
            )}
        </Tabs>
    );
}
