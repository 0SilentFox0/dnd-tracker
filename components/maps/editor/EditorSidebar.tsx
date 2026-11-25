'use client';

import { useTranslations } from 'next-intl';

import { PANEL_ICONS, PANELS } from './editor-icons';
import { TilePalettePanel } from './TilePalettePanel';
import { UvttImportSection } from './UvttImportSection';

import { MapBackgroundSection } from '@/components/battle/setup/map/MapBackgroundSection';
import { MapCellToolsSection } from '@/components/battle/setup/map/MapCellToolsSection';
import {
    DoorToolOptions,
    EDGE_TOOLS,
    ToolButtons,
} from '@/components/battle/setup/map/MapToolButtons';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    EditorPanel,
    useMapEditorDraft,
    useMapEditorWorkspace,
    useUvttImport,
} from '@/lib/hooks/battle-maps';

const HEX_HIDDEN: ReadonlySet<EditorPanel> = new Set([
    'edges',
    'tiles',
    'effects',
]);

const GROUP_LABEL =
    'col-span-2 px-1 pt-1 text-[10px] font-semibold tracking-wide text-hud-muted uppercase';

export function EditorSidebar({
    draft,
    workspace,
    uvtt,
    onSelectPanel,
}: {
    draft: ReturnType<typeof useMapEditorDraft>;
    workspace: ReturnType<typeof useMapEditorWorkspace>;
    uvtt: ReturnType<typeof useUvttImport>;
    onSelectPanel: (panel: EditorPanel) => void;
}) {
    const t = useTranslations('maps.editor');

    const { editor } = draft;

    const { panel } = workspace;

    const hex = editor.state.grid === 'hex';

    const panels = hex ? PANELS.filter((p) => !HEX_HIDDEN.has(p)) : PANELS;

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
                            {p === 'edges' && (
                                <span className={`${GROUP_LABEL} pt-2`}>
                                    {t('groups.paint')}
                                </span>
                            )}
                            <TabsTrigger
                                type="button"
                                value={p}
                                title={t(`panels.${p}`)}
                                className="flex h-11 min-w-0 flex-row items-center justify-start gap-2 rounded-md border border-hud-rule bg-black/20 px-2 text-left text-xs leading-tight text-hud-muted data-[state=active]:border-[var(--gold)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
                <h2 className="text-sm font-semibold text-hud-gold-bright">
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
                <MapCellToolsSection editor={editor} />
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
            <TabsContent value={panel === 'effects' ? 'effects' : 'tiles'}>
                <TilePalettePanel
                    workspace={workspace}
                    effects={panel === 'effects'}
                />
            </TabsContent>
        </Tabs>
    );
}
