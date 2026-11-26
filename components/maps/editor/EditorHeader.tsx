'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type {
    useMapArtEditor,
    useMapArtSave,
    useMapEditorDraft,
    useMapEditorWorkspace,
    useTileSave,
} from '@/lib/hooks/battle-maps';
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
    art,
}: {
    campaignId: string;
    draft: ReturnType<typeof useMapEditorDraft>;
    workspace: ReturnType<typeof useMapEditorWorkspace>;
    tileSave: ReturnType<typeof useTileSave>;
    art: {
        editor: ReturnType<typeof useMapArtEditor>;
        save: ReturnType<typeof useMapArtSave>;
    };
}) {
    const t = useTranslations('maps.editor');

    const tMap = useTranslations('battleSetup.map');

    const tTiles = useTranslations('maps.editor.tiles');

    const tArt = useTranslations('maps.editor.art');

    const { editor } = draft;

    const { map } = editor.state;

    const { tileEditor, paintingTiles, paintingArt } = workspace;

    const { editor: artEditor, save: artSave } = art;

    const photoSized = map.background && !artEditor.active && !map.artBaked;

    const maxSide = photoSized
        ? MAP_LIMITS.photoMaxSide
        : MAP_LIMITS.tileMaxSide;

    const canSave = draft.canSave || (artEditor.active && artEditor.isDirty);

    const saving = artEditor.active ? artSave.isSaving : draft.isSaving;

    const saveLabel =
        artEditor.active && artSave.phase !== 'idle'
            ? tArt(`phase.${artSave.phase}`)
            : saving
              ? t('saving')
              : t('save');

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
            <Button
                onClick={() =>
                    artEditor.active ? artSave.save() : draft.save()
                }
                disabled={!canSave || (artEditor.active && artSave.isSaving)}
                size="sm"
            >
                {saveLabel}
            </Button>
            {paintingArt && (
                <>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!artEditor.canUndo}
                        onClick={artEditor.undo}
                    >
                        {tTiles('undo')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!artEditor.canRedo}
                        onClick={artEditor.redo}
                    >
                        {tTiles('redo')}
                    </Button>
                </>
            )}
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
