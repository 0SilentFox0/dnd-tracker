'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPinned, PenLine, Trash2 } from 'lucide-react';

import { MarkerLayerField } from '../layers/MarkerLayerField';
import { MarkerIconGrid } from '../maps/MapFieldParts';
import { NewWorldMapDialog } from '../maps/NewWorldMapDialog';
import { markerIcon } from '../marker-icon-options';
import { MarkerStyleFields } from '../MarkerStyleFields';
import { MoveMapMenu } from '../MoveMapMenu';
import { useEditorMarkerFields } from '../use-editor-fields';
import { useWorldEditorContext } from '../WorldEditorContext';
import { DmMarkerNotes } from './DmMarkerNotes';
import { QuietDeleteButton, WorldPanelHeader } from './WorldPanelHeader';

import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    WORLD_DM_NOTE_MAX,
    WORLD_MARKER_DESCRIPTION_MAX,
    WORLD_NAME_MAX,
} from '@/lib/constants/world';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import type { WorldMarker } from '@/types/world';

export function WorldMarkerPanel() {
    const { detail, selectedId } = useWorldEditorContext();

    const marker = detail?.markers.find((m) => m.id === selectedId);

    return marker ? <MarkerForm key={marker.id} marker={marker} /> : null;
}

function MarkerForm({ marker }: { marker: WorldMarker }) {
    const { campaignId, detail, maps, editor } = useWorldEditorContext();

    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    const [creating, setCreating] = useState(false);

    const m = useEditorMarkerFields(marker);

    const layer = detail?.layers?.find((l) => l.id === marker.layerId);

    const HeaderIcon = markerIcon({
        ...marker,
        icon: marker.icon ?? layer?.icon ?? null,
    });

    const child = marker.childMapId
        ? maps.find((x) => x.id === marker.childMapId)
        : undefined;

    const sheet = !useMediaQuery(DESKTOP_QUERY);

    return (
        <div>
            <WorldPanelHeader
                badge={
                    <HeaderIcon
                        className="size-5 text-[var(--palette-primary-foreground,#2a1d05)]"
                        aria-hidden
                    />
                }
                title={marker.name}
                hideTitle={sheet}
                subtitle={t('editor.markerSubtitle', {
                    shape: t(`shape.${marker.kind}`),
                    map: detail?.map.name ?? '',
                })}
            />
            <HudSection title={t('editor.basic')}>
                <div className="space-y-3">
                    <LabeledInput
                        label={t('name')}
                        maxLength={WORLD_NAME_MAX}
                        value={m.name}
                        onChange={(e) => m.setName(e.target.value)}
                        onBlur={m.commitName}
                    />
                    <label className="block space-y-1 text-sm">
                        {t('editor.description')}
                        <Textarea
                            value={m.description}
                            maxLength={WORLD_MARKER_DESCRIPTION_MAX}
                            onChange={(e) => m.setDescription(e.target.value)}
                            onBlur={m.commitDescription}
                        />
                    </label>
                    {marker.kind === 'point' ? (
                        <MarkerIconGrid
                            aria-label={t('editor.icon')}
                            value={marker.icon}
                            cellClassName="h-11"
                            onPick={(icon) => void m.save({ icon })}
                        />
                    ) : null}
                    <div className="text-sm">
                        <MarkerStyleFields
                            marker={marker}
                            layer={layer}
                            form={m}
                        />
                    </div>
                    {marker.kind === 'zone' ? (
                        <Button
                            type="button"
                            variant={m.redrawing ? 'default' : 'outline'}
                            onClick={() =>
                                m.redraw(m.redrawing ? null : marker.id)
                            }
                            className="w-full gap-2"
                        >
                            <PenLine className="size-4" />
                            {m.redrawing
                                ? t('editor.drawNewZone')
                                : t('editor.redrawZone')}
                        </Button>
                    ) : null}
                </div>
            </HudSection>
            <HudSection title={t('editor.forDm')}>
                <div className="space-y-3">
                    <label className="block space-y-1 text-sm">
                        {t('editor.dmNote')}
                        <Textarea
                            value={m.note}
                            maxLength={WORLD_DM_NOTE_MAX}
                            onChange={(e) => m.setNote(e.target.value)}
                            onBlur={m.commitNote}
                        />
                    </label>
                    <MarkerLayerField
                        value={marker.layerId}
                        onChange={(id) => void m.setLayer(id)}
                    />
                    <label className="flex items-center justify-between gap-3 text-sm">
                        <span>
                            {t('editor.knownLocation')}
                            <span className="block text-xs text-hud-muted">
                                {t('editor.knownLocationHint')}
                            </span>
                        </span>
                        <Switch
                            checked={marker.alwaysVisible}
                            onCheckedChange={(v) =>
                                void m.save({ alwaysVisible: v })
                            }
                        />
                    </label>
                </div>
            </HudSection>
            {detail ? (
                <HudSection title={t('editor.playerNotes')}>
                    <DmMarkerNotes marker={marker} />
                </HudSection>
            ) : null}
            <HudSection title={t('editor.childMap')}>
                {marker.childMapId ? (
                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => m.openMap(marker.childMapId)}
                            className="w-full gap-2"
                        >
                            <MapPinned className="size-4" />
                            {t('editor.openChild')}
                        </Button>
                        {child ? (
                            <>
                                <MoveMapMenu
                                    campaignId={campaignId}
                                    map={child}
                                    maps={maps}
                                    onMove={(parentMarkerId) =>
                                        void editor.map.move.mutateOk({
                                            id: child.id,
                                            parentMarkerId,
                                        })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void m.removeMap(child)}
                                    className="w-full gap-2 text-destructive"
                                >
                                    <Trash2 className="size-4" />
                                    {t('editor.deleteMap')}
                                </Button>
                            </>
                        ) : null}
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreating(true)}
                        className="w-full gap-2"
                    >
                        <MapPinned className="size-4" />
                        {t('editor.createChild')}
                    </Button>
                )}
            </HudSection>
            <QuietDeleteButton
                label={tc('delete')}
                onClick={() => void m.remove()}
            />
            <NewWorldMapDialog
                open={creating}
                onOpenChange={setCreating}
                parentMarker={{ id: marker.id, name: marker.name }}
            />
        </div>
    );
}
