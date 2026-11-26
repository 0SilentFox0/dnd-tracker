'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Grid3x3, Library } from 'lucide-react';

import { type BattleMapPanel, BattleMapSidebar } from './BattleMapSidebar';
import { LibraryMapGrid } from './LibraryMapGrid';
import { MapQuickStart, type MapQuickStartAction } from './MapQuickStart';
import { type MapSource, MapSourceChoice } from './MapSourceChoice';
import { SaveToLibraryButton } from './SaveToLibraryButton';

import { BattleMap } from '@/components/battle/map';
import { HudSection } from '@/components/hud/form';
import { ActiveToolChip } from '@/components/maps/editor/ActiveToolChip';
import { MapWorkbench } from '@/components/maps/editor/MapWorkbench';
import { UvttImportSection } from '@/components/maps/editor/UvttImportSection';
import { Button } from '@/components/ui/button';
import { useActiveToolChip, useUvttImport } from '@/lib/hooks/battle-maps';
import type { BattleLibraryMap, BattleMapEditor } from '@/lib/hooks/battles';
import { useText } from '@/lib/i18n/use-text';
import {
    isEdgeTool,
    isFreshMap,
    isPreviewSafeBackground,
} from '@/lib/utils/battle/grid';

const NO_PARTICIPANTS: never[] = [];

function MapCanvas({ editor }: { editor: BattleMapEditor }) {
    const { map, tool } = editor.state;

    const { actions } = editor;

    const cellTool = tool !== null && !isEdgeTool(tool);

    const previewMap = useMemo(
        () =>
            isPreviewSafeBackground(map.background) || map.background === null
                ? map
                : { ...map, background: null },
        [map]
    );

    const mapActions = useMemo(
        () => ({ onStroke: actions.onStroke }),
        [actions.onStroke]
    );

    const editing = useMemo(
        () => ({
            clickableBlocked: cellTool,
            strokeTool: cellTool,
            showBlocked: true,
            edges: editor.edgeEditing,
            doorLocks: true,
        }),
        [cellTool, editor.edgeEditing]
    );

    return (
        <BattleMap
            map={previewMap}
            participants={NO_PARTICIPANTS}
            actions={mapActions}
            look={{ className: 'h-full' }}
            editing={editing}
        />
    );
}

function OwnMap({
    campaignId,
    editor,
}: {
    campaignId: string;
    editor: BattleMapEditor;
}) {
    const t = useTranslations('battleSetup.map');

    const text = useText();

    const toolChip = useActiveToolChip(editor);

    const [panel, setPanel] = useState<BattleMapPanel>('size');

    const [fullscreen, setFullscreen] = useState(false);

    const [started, setStarted] = useState(false);

    const { map, notice } = editor.state;

    const { replaceMapFromImport } = editor.actions;

    const uvtt = useUvttImport(
        useCallback(
            (result) => {
                replaceMapFromImport({
                    cols: result.cols,
                    rows: result.rows,
                    background: result.image,
                    backgroundCols: result.backgroundCols,
                    walls: result.walls,
                    doors: result.doors,
                });
                setStarted(true);
                setPanel('background');
            },
            [replaceMapFromImport]
        )
    );

    const quickStart = (action: MapQuickStartAction) => {
        setStarted(true);

        if (action !== 'grid') setPanel('background');
    };

    return (
        <MapWorkbench
            fullscreen={{
                value: fullscreen,
                set: setFullscreen,
                label: t('fullscreen'),
            }}
            onEscape={() => {
                if (toolChip.onEscape()) return true;

                if (panel !== 'motion') return false;

                setPanel('size');

                return true;
            }}
            toolbar={
                <div className="flex flex-wrap items-center gap-2">
                    <ActiveToolChip
                        tool={toolChip.tool}
                        onClear={toolChip.onClear}
                    />
                    <div className="pointer-events-auto">
                        <SaveToLibraryButton
                            campaignId={campaignId}
                            editor={editor}
                        />
                    </div>
                </div>
            }
            notice={notice ? text(notice) : null}
            canvas={
                <>
                    <MapCanvas editor={editor} />
                    {!started && isFreshMap(map) ? (
                        <MapQuickStart onPick={quickStart} />
                    ) : null}
                </>
            }
            sidebar={
                <BattleMapSidebar
                    editor={editor}
                    panel={panel}
                    onPanel={setPanel}
                    uvtt={
                        <UvttImportSection
                            error={uvtt.error}
                            warnings={uvtt.warnings}
                            onFile={uvtt.importFile}
                        />
                    }
                />
            }
        />
    );
}

export function BattleMapStep({
    campaignId,
    editor,
    library,
}: {
    campaignId: string;
    editor: BattleMapEditor;
    library: BattleLibraryMap;
}) {
    const t = useTranslations('battleSetup.map');

    const [libraryChosen, setLibraryChosen] = useState(false);

    const source: MapSource =
        library.selectedId || libraryChosen
            ? 'library'
            : editor.state.enabled
              ? 'own'
              : 'none';

    const choose = (next: MapSource) => {
        setLibraryChosen(next === 'library');

        if (next !== 'library' && library.selectedId) void library.select(null);

        editor.actions.setEnabled(next === 'own');
    };

    return (
        <HudSection title={t('title')} className="space-y-4">
            <MapSourceChoice
                value={source}
                onChange={choose}
                libraryVisible={library.visible}
            />
            {source === 'none' ? (
                <div className="ds-inset space-y-3 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-hud-ink">
                        {t('noMap.title')}
                    </h3>
                    <p className="text-sm text-hud-muted">
                        {t('noMap.description')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => choose('own')}>
                            <Grid3x3
                                aria-hidden="true"
                                className="mr-2 h-4 w-4"
                            />
                            {t('source.own')}
                        </Button>
                        {library.visible ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => choose('library')}
                            >
                                <Library
                                    aria-hidden="true"
                                    className="mr-2 h-4 w-4"
                                />
                                {t('source.library')}
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : source === 'own' ? (
                <OwnMap campaignId={campaignId} editor={editor} />
            ) : (
                <LibraryMapGrid
                    library={library}
                    campaignId={campaignId}
                    onClear={() => setLibraryChosen(false)}
                />
            )}
        </HudSection>
    );
}
