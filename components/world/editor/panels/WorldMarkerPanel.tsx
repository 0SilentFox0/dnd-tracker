'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPinned, PenLine } from 'lucide-react';

import { MarkerIconGrid } from '../maps/MapFieldParts';
import { NewWorldMapDialog } from '../maps/NewWorldMapDialog';
import { markerIcon } from '../marker-icon-options';
import { MarkerColorField } from '../MarkerColorField';
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
import type { WorldMarker } from '@/types/world';

export function WorldMarkerPanel() {
    const { detail, selectedId } = useWorldEditorContext();

    const marker = detail?.markers.find((m) => m.id === selectedId);

    return marker ? <MarkerForm key={marker.id} marker={marker} /> : null;
}

function MarkerForm({ marker }: { marker: WorldMarker }) {
    const { detail } = useWorldEditorContext();

    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    const [creating, setCreating] = useState(false);

    const m = useEditorMarkerFields(marker);

    const HeaderIcon = markerIcon(marker);

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
                        <>
                            <MarkerIconGrid
                                aria-label={t('editor.icon')}
                                value={marker.icon}
                                cellClassName="h-11"
                                onPick={(icon) => void m.save({ icon })}
                            />
                            <div className="flex items-center gap-3 text-sm">
                                <MarkerColorField
                                    label={t('editor.pointColor')}
                                    color={m.colorValue}
                                    isCustom={m.color !== null}
                                    onPick={m.pickColor}
                                    onReset={m.resetColor}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-sm">
                            <MarkerColorField
                                label={t('editor.zoneColor')}
                                color={m.colorValue}
                                isCustom={m.color !== null}
                                onPick={m.pickColor}
                                onReset={m.resetColor}
                            />
                        </div>
                    )}
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => m.openMap(marker.childMapId)}
                        className="w-full gap-2"
                    >
                        <MapPinned className="size-4" />
                        {t('editor.openChild')}
                    </Button>
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
