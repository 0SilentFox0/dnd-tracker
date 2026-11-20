'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PenLine, Trash2 } from 'lucide-react';

import { NewWorldMapDialog } from './maps/NewWorldMapDialog';
import { MoveMapMenu } from './MoveMapMenu';
import { useEditorMarkerFields } from './use-editor-fields';
import { useWorldEditorContext } from './WorldEditorContext';

import { ColorSwatch } from '@/components/common/fields/ColorSwatch';
import { HudButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MarkerBubble } from '@/components/world/MarkerBubble';
import { WORLD_NAME_MAX } from '@/lib/constants/world';
import type { WorldMarker } from '@/types/world';

const LINK =
    'inline-flex items-center gap-1 text-xs text-hud-gold-bright underline';

interface DmMarkerBubbleProps {
    marker: WorldMarker;
    actions: { onMore(): void; onClose(): void };
}

export function DmMarkerBubble({ marker, actions }: DmMarkerBubbleProps) {
    const { campaignId, maps, editor } = useWorldEditorContext();

    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    const [creating, setCreating] = useState(false);

    const m = useEditorMarkerFields(marker);

    const child = marker.childMapId
        ? maps.find((x) => x.id === marker.childMapId)
        : undefined;

    return (
        <MarkerBubble marker={marker} actions={actions}>
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
                {marker.kind === 'point' ? (
                    <div className="flex items-center gap-2 text-xs">
                        <ColorSwatch
                            color={m.color}
                            label={t('editor.pointColor')}
                            onChange={m.pickColor}
                        />
                        {t('editor.pointColor')}
                    </div>
                ) : null}
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
                    className="flex flex-wrap gap-x-3 gap-y-1"
                >
                    {marker.childMapId ? (
                        <>
                            <HudButton
                                className={LINK}
                                onClick={() => m.openMap(marker.childMapId)}
                            >
                                {t('bubble.open')}
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
                        </>
                    ) : (
                        <HudButton
                            className={LINK}
                            onClick={() => setCreating(true)}
                        >
                            {t('bubble.createMap')}
                        </HudButton>
                    )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {marker.kind === 'zone' ? (
                        <HudButton
                            className={LINK}
                            aria-pressed={m.redrawing}
                            onClick={() =>
                                m.redraw(m.redrawing ? null : marker.id)
                            }
                        >
                            <PenLine className="size-3.5" aria-hidden />
                            {t('bubble.redraw')}
                        </HudButton>
                    ) : null}
                    <HudButton
                        className="inline-flex items-center gap-1 text-xs text-hud-danger underline"
                        onClick={() => void m.remove()}
                    >
                        <Trash2 className="size-3.5" aria-hidden />
                        {tc('delete')}
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
