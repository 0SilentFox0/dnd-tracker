'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { useMapEditorDraft } from '@/lib/hooks/battle-maps/useMapEditorDraft';
import type { useMapEditorWorkspace } from '@/lib/hooks/battle-maps/useMapEditorWorkspace';
import type { useTileSave } from '@/lib/hooks/battle-maps/useTileSave';
import { MIN_SIDE } from '@/lib/utils/battle/grid';

export function BackLink({ campaignId }: { campaignId: string }) {
    const t = useTranslations('maps.editor');

    return (
        <Button asChild variant="outline" size="sm">
            <Link href={`/campaigns/${campaignId}/dm/maps`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('back')}
            </Link>
        </Button>
    );
}

export function EditorHeader({
    campaignId,
    draft,
    workspace,
    tileSave,
}: {
    campaignId: string;
    draft: ReturnType<typeof useMapEditorDraft>;
    workspace: ReturnType<typeof useMapEditorWorkspace>;
    tileSave: ReturnType<typeof useTileSave>;
}) {
    const t = useTranslations('maps.editor');

    const tMap = useTranslations('battleSetup.map');

    const tTiles = useTranslations('maps.editor.tiles');

    const { editor } = draft;

    const { map } = editor.state;

    const { tileEditor, paintingTiles } = workspace;

    const maxSide = map.background
        ? MAP_LIMITS.photoMaxSide
        : MAP_LIMITS.tileMaxSide;

    return (
        <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-lg border border-hud-rule bg-background/60 p-3 shadow-sm">
            <BackLink campaignId={campaignId} />
            <div className="min-w-[12rem] flex-1 space-y-1">
                <h1 className="text-xs font-semibold tracking-wide text-hud-muted uppercase">
                    {t('workspaceTitle')}
                </h1>
                <Label htmlFor="map-name" className="text-xs">
                    {t('name')}
                </Label>
                <Input
                    id="map-name"
                    value={draft.name.value}
                    maxLength={80}
                    onChange={(e) => draft.name.set(e.target.value)}
                />
            </div>
            <div className="w-20 space-y-1">
                <Label htmlFor="map-cols" className="text-xs">
                    {tMap('cols')}
                </Label>
                <BoundedNumberInput
                    id="map-cols"
                    value={map.cols}
                    min={MIN_SIDE}
                    max={maxSide}
                    onCommit={(v) => editor.actions.setSize(v, map.rows)}
                    onValueChange={(v) => editor.actions.setSize(v, map.rows)}
                />
            </div>
            <div className="w-20 space-y-1">
                <Label htmlFor="map-rows" className="text-xs">
                    {tMap('rows')}
                </Label>
                <BoundedNumberInput
                    id="map-rows"
                    value={map.rows}
                    min={MIN_SIDE}
                    max={maxSide}
                    onCommit={(v) => editor.actions.setSize(map.cols, v)}
                    onValueChange={(v) => editor.actions.setSize(map.cols, v)}
                />
            </div>
            <Button onClick={draft.save} disabled={!draft.canSave} size="sm">
                {draft.isSaving ? t('saving') : t('save')}
            </Button>
            {paintingTiles && (
                <>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!tileEditor.canUndo}
                        onClick={tileEditor.undo}
                    >
                        {tTiles('undo')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!tileEditor.canRedo}
                        onClick={tileEditor.redo}
                    >
                        {tTiles('redo')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={!tileEditor.isDirty || tileSave.isPending}
                        onClick={tileSave.save}
                    >
                        {tileSave.isPending ? tTiles('saving') : tTiles('save')}
                    </Button>
                </>
            )}
        </div>
    );
}
