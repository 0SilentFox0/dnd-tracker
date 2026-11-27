'use client';

import { useTranslations } from 'next-intl';

import { ArtPanel } from './art/ArtPanel';
import { PANEL_ICONS, panelsFor } from './editor-icons';
import { TilePalettePanel } from './TilePalettePanel';
import { UvttImportSection } from './UvttImportSection';

import { MapBackgroundSection } from '@/components/battle/setup/map/shared/MapBackgroundSection';
import {
    ART_CELL_TOOLS,
    MapCellToolsSection,
} from '@/components/battle/setup/map/shared/MapCellToolsSection';
import {
    DoorToolOptions,
    EDGE_TOOLS,
    ToolButtons,
} from '@/components/battle/setup/map/shared/MapToolButtons';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    EditorPanel,
    useMapArtEditor,
    useMapArtSave,
    useMapEditorDraft,
    useMapEditorWorkspace,
    useUvttImport,
} from '@/lib/hooks/battle-maps';

const GROUP_LABEL =
    'col-span-2 px-1 pt-1 text-xs font-semibold tracking-wide text-hud-muted uppercase';

export function EditorSidebar({
    draft,
    workspace,
    uvtt,
    art,
    onSelectPanel,
}: {
    draft: ReturnType<typeof useMapEditorDraft>;
    workspace: ReturnType<typeof useMapEditorWorkspace>;
    uvtt: ReturnType<typeof useUvttImport>;
    art: {
        editor: ReturnType<typeof useMapArtEditor>;
        save: ReturnType<typeof useMapArtSave>;
        ids: { campaignId: string; mapId: string };
    };
    onSelectPanel: (panel: EditorPanel) => void;
}) {
    const t = useTranslations('maps.editor');

    const { editor } = draft;

    const { panel } = workspace;

    const hex = editor.state.grid === 'hex';

    const panels = panelsFor({ hex, artActive: art.editor.active });

    const firstPaint = panels.find((p) => p !== 'background' && p !== 'cells');

    return (
        <Tabs
            value={panel}
            onValueChange={(value) => onSelectPanel(value as EditorPanel)}
            className="min-w-0"
        >
            <TabsList
                aria-label={t('sidebar')}
                className="sticky top-0 z-20 grid h-auto w-full grid-cols-2 gap-1 rounded-md border border-hud-rule bg-background p-1 shadow-sm"
            >
                <span className={GROUP_LABEL}>{t('groups.map')}</span>
                {panels.map((p) => {
                    const Icon = PANEL_ICONS[p];

                    return (
                        <div key={p} className="contents">
                            {p === firstPaint && (
                                <span className={`${GROUP_LABEL} pt-2`}>
                                    {t('groups.paint')}
                                </span>
                            )}
                            <TabsTrigger
                                type="button"
                                value={p}
                                title={t(`panels.${p}`)}
                                className="flex h-11 min-w-0 flex-row items-center justify-start gap-2 rounded-md border border-hud-rule bg-black/20 px-2 text-left text-xs leading-tight text-hud-muted data-[state=active]:border-hud-accent data-[state=active]:bg-hud-panel-2 data-[state=active]:text-hud-ink"
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0"
                                />
                                <span className="min-w-0 truncate">
                                    {t(`panels.${p}`)}
                                </span>
                            </TabsTrigger>
                        </div>
                    );
                })}
            </TabsList>
            {hex && (
                <p className="mt-2 text-xs text-hud-muted">{t('hexHint')}</p>
            )}
            <div className="my-3 rounded-md border border-hud-rule bg-black/20 px-3 py-2">
                <h2 className="text-sm font-semibold text-hud-ink">
                    {t(`panels.${panel}`)}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-hud-muted">
                    {t(`panelDescription.${panel}`)}
                </p>
            </div>
            <TabsContent value="background">
                <UvttImportSection
                    error={uvtt.error}
                    warnings={uvtt.warnings}
                    onFile={uvtt.importFile}
                />
                <MapBackgroundSection editor={editor} />
            </TabsContent>
            <TabsContent value="cells">
                <MapCellToolsSection
                    editor={editor}
                    tools={art.editor.active ? ART_CELL_TOOLS : undefined}
                />
            </TabsContent>
            <TabsContent value="edges">
                <div className="space-y-2">
                    <Label className="text-xs">{t('edges')}</Label>
                    <ToolButtons
                        tools={EDGE_TOOLS}
                        tool={editor.state.tool}
                        onPick={editor.actions.setTool}
                    />
                    <DoorToolOptions editor={editor} />
                </div>
            </TabsContent>
            <TabsContent value="art">
                <ArtPanel
                    art={art.editor}
                    artSave={art.save}
                    ids={art.ids}
                />
            </TabsContent>
            {!hex && (
                <TabsContent value="objects">
                    <TilePalettePanel workspace={workspace} />
                </TabsContent>
            )}
        </Tabs>
    );
}
