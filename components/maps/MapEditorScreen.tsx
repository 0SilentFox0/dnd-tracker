'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { BattleMap } from '@/components/battle/map';
import {
    EDGE_TOOLS,
    ToolButtons,
} from '@/components/battle/setup/MapToolButtons';
import { QueryState } from '@/components/common/states';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBattleMap } from '@/lib/hooks/battle-maps';
// deep import: the battle-maps barrel would close a cycle through battles
import { useMapEditorDraft } from '@/lib/hooks/battle-maps/useMapEditorDraft';
import { useCoarsePointer, useUnsavedChangesGuard } from '@/lib/hooks/common';
import { useText } from '@/lib/i18n/use-text';
import { MAX_SIDE, MIN_SIDE } from '@/lib/utils/battle/grid';
import type { BattleMapFull } from '@/types/battle-map';

function BackLink({ campaignId }: { campaignId: string }) {
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

function EditorBody({
    campaignId,
    source,
}: {
    campaignId: string;
    source: BattleMapFull;
}) {
    const t = useTranslations('maps.editor');

    const tMap = useTranslations('battleSetup.map');

    const text = useText();

    const draft = useMapEditorDraft(campaignId, source);

    useUnsavedChangesGuard(draft.isDirty);

    const { editor } = draft;

    const { map, tool, notice } = editor.state;

    return (
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-2 p-2">
            <div className="flex flex-wrap items-end gap-3">
                <BackLink campaignId={campaignId} />
                <div className="min-w-[12rem] flex-1 space-y-1">
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
                        max={MAX_SIDE}
                        onCommit={(v) => editor.actions.setSize(v, map.rows)}
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
                        max={MAX_SIDE}
                        onCommit={(v) => editor.actions.setSize(map.cols, v)}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">{t('edges')}</Label>
                    <ToolButtons
                        tools={EDGE_TOOLS}
                        tool={tool}
                        onPick={editor.actions.setTool}
                    />
                </div>
                <Button
                    onClick={draft.save}
                    disabled={!draft.canSave}
                    size="sm"
                >
                    {draft.isSaving ? t('saving') : t('save')}
                </Button>
            </div>
            <p
                aria-live="polite"
                role="status"
                className="min-h-5 text-sm text-hud-gold-bright"
            >
                {notice ? text(notice) : draft.justSaved ? t('saved') : ''}
            </p>
            <div className="min-h-0 flex-1">
                <BattleMap
                    map={map}
                    participants={[]}
                    className="h-full"
                    editing={{
                        clickableBlocked: false,
                        strokeTool: false,
                        showBlocked: true,
                        edges: editor.edgeEditing,
                    }}
                />
            </div>
        </div>
    );
}

export function MapEditorScreen({
    campaignId,
    mapId,
}: {
    campaignId: string;
    mapId: string;
}) {
    const t = useTranslations('maps.editor');

    const touch = useCoarsePointer();

    const query = useBattleMap(campaignId, mapId);

    if (touch)
        return (
            <div className="space-y-3 p-4">
                <BackLink campaignId={campaignId} />
                <p className="text-sm text-hud-muted">{t('desktopOnly')}</p>
            </div>
        );

    return (
        <QueryState query={query}>
            {(source) => <EditorBody campaignId={campaignId} source={source} />}
        </QueryState>
    );
}
