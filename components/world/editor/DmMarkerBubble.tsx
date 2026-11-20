'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderOpen, FolderPlus, PenLine, Trash2 } from 'lucide-react';

import { MarkerLayerField } from './layers/MarkerLayerField';
import { MarkerIconGrid } from './maps/MapFieldParts';
import { NewWorldMapDialog } from './maps/NewWorldMapDialog';
import { MarkerColorField } from './MarkerColorField';
import { MoveMapMenu } from './MoveMapMenu';
import { useEditorMarkerFields } from './use-editor-fields';
import { useWorldEditorContext } from './WorldEditorContext';

import { HudButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    BUBBLE_ACTIONS,
    bubbleButton,
} from '@/components/world/nav/bubble-button';
import { MarkerBubble } from '@/components/world/nav/MarkerBubble';
import {
    WORLD_MARKER_DESCRIPTION_MAX,
    WORLD_NAME_MAX,
} from '@/lib/constants/world';
import {
    DESKTOP_QUERY,
    useIsMobile,
    useMediaQuery,
} from '@/lib/hooks/common';
import type { WorldMarker } from '@/types/world';

interface DmMarkerBubbleProps {
    marker: WorldMarker;
    actions: { onMore(): void; onClose(): void };
}

export function DmMarkerBubble({ marker, actions }: DmMarkerBubbleProps) {
    const { campaignId, maps, editor } = useWorldEditorContext();

    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    const [creating, setCreating] = useState(false);

    const sheet = useIsMobile();

    const onMap = useMediaQuery(DESKTOP_QUERY);

    const m = useEditorMarkerFields(marker);

    const child = marker.childMapId
        ? maps.find((x) => x.id === marker.childMapId)
        : undefined;

    if (onMap)
        return (
            <MarkerBubble
                marker={marker}
                actions={{
                    ...actions,
                    onOpenMap: marker.childMapId
                        ? () => m.openMap(marker.childMapId)
                        : undefined,
                }}
            />
        );

    return (
        <MarkerBubble marker={marker} actions={actions} embedded={sheet}>
            <div className="min-w-0 flex-1 space-y-2">
                <Input
                    aria-label={t('name')}
                    maxLength={WORLD_NAME_MAX}
                    value={m.name}
                    onChange={(e) => m.setName(e.target.value)}
                    onBlur={m.commitName}
                    onKeyDown={(e) =>
                        e.key === 'Enter' && e.currentTarget.blur()
                    }
                />
                <Textarea
                    aria-label={t('editor.description')}
                    placeholder={t('editor.description')}
                    rows={2}
                    maxLength={WORLD_MARKER_DESCRIPTION_MAX}
                    value={m.description}
                    onChange={(e) => m.setDescription(e.target.value)}
                    onBlur={m.commitDescription}
                />
                {marker.kind === 'point' ? (
                    <MarkerIconGrid
                        aria-label={t('editor.icon')}
                        value={marker.icon}
                        cellClassName="h-8"
                        className="max-h-24 overflow-y-auto"
                        onPick={(icon) => void m.save({ icon })}
                    />
                ) : null}
                <div className="flex items-center gap-2 text-xs">
                    <MarkerColorField
                        label={t(
                            marker.kind === 'zone'
                                ? 'editor.zoneColor'
                                : 'editor.pointColor'
                        )}
                        color={m.colorValue}
                        isCustom={m.isCustomColor}
                        onPick={m.pickColor}
                        onReset={m.resetColor}
                    />
                </div>
                <MarkerLayerField
                    value={marker.layerId}
                    onChange={(id) => void m.setLayer(id)}
                />
                <label className="flex items-center justify-between gap-2 text-xs">
                    {t('editor.knownLocation')}
                    <Switch
                        checked={marker.alwaysVisible}
                        onCheckedChange={(v) =>
                            void m.save({ alwaysVisible: v })
                        }
                    />
                </label>
                <div
                    role="group"
                    aria-label={t('bubble.mapBlock')}
                    className={BUBBLE_ACTIONS}
                >
                    {marker.childMapId ? (
                        <>
                            <HudButton
                                className={bubbleButton()}
                                onClick={() => m.openMap(marker.childMapId)}
                            >
                                <FolderOpen
                                    className="size-3.5 shrink-0"
                                    aria-hidden
                                />
                                <span className="truncate">
                                    {t('bubble.open')}
                                </span>
                            </HudButton>
                            {child ? (
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
                            ) : null}
                            {child ? (
                                <HudButton
                                    className={bubbleButton(true, 'col-span-2')}
                                    onClick={() => void m.removeMap(child)}
                                >
                                    <Trash2
                                        className="size-3.5 shrink-0"
                                        aria-hidden
                                    />
                                    <span className="truncate">
                                        {t('editor.deleteMap')}
                                    </span>
                                </HudButton>
                            ) : null}
                        </>
                    ) : (
                        <HudButton
                            className={bubbleButton(false, 'col-span-2')}
                            onClick={() => setCreating(true)}
                        >
                            <FolderPlus
                                className="size-3.5 shrink-0"
                                aria-hidden
                            />
                            <span className="truncate">
                                {t('bubble.createMap')}
                            </span>
                        </HudButton>
                    )}
                </div>
                <div className={BUBBLE_ACTIONS}>
                    {marker.kind === 'zone' ? (
                        <HudButton
                            className={bubbleButton(
                                false,
                                m.redrawing
                                    ? 'border-[var(--gold)] text-hud-gold-bright'
                                    : undefined
                            )}
                            aria-pressed={m.redrawing}
                            onClick={() =>
                                m.redraw(m.redrawing ? null : marker.id)
                            }
                        >
                            <PenLine
                                className="size-3.5 shrink-0"
                                aria-hidden
                            />
                            <span className="truncate">
                                {t('bubble.redraw')}
                            </span>
                        </HudButton>
                    ) : null}
                    <HudButton
                        className={bubbleButton(
                            true,
                            marker.kind === 'zone' ? undefined : 'col-span-2'
                        )}
                        onClick={() => void m.remove()}
                    >
                        <Trash2 className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{tc('delete')}</span>
                    </HudButton>
                </div>
            </div>
            <NewWorldMapDialog
                open={creating}
                onOpenChange={setCreating}
                parentMarker={{ id: marker.id, name: marker.name }}
            />
        </MarkerBubble>
    );
}
