'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, ImageUp, Map as MapIcon } from 'lucide-react';

import { ChildMapList, ImageFileInput, RadiusRange } from './MapFieldParts';
import { useWorldEditorContext } from './WorldEditorContext';
import { QuietDeleteButton, WorldPanelHeader } from './WorldPanelHeader';

import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';
import { Switch } from '@/components/ui/switch';
import { WORLD_NAME_MAX } from '@/lib/constants/world';
import { useMapFields } from '@/lib/hooks/world';
import type { WorldMapDetail } from '@/types/world';

export function WorldMapSettings() {
    const { detail } = useWorldEditorContext();

    return detail ? <MapForm detail={detail} /> : null;
}

function MapForm({ detail }: { detail: WorldMapDetail }) {
    const { campaignId, maps, editor, openMap, tool, setTool } =
        useWorldEditorContext();

    const t = useTranslations('world');

    const fileInput = useRef<HTMLInputElement>(null);

    const {
        map,
        name,
        setName,
        commitName,
        radius,
        setRadius,
        commitRadius,
        fill,
        children,
        save,
        replaceImage,
        remove,
    } = useMapFields({ campaignId, detail, maps, editor, openMap });

    return (
        <div>
            <WorldPanelHeader
                badge={
                    <MapIcon
                        className="size-5 text-[var(--palette-primary-foreground,#2a1d05)]"
                        aria-hidden
                    />
                }
                title={map.name}
                subtitle={
                    map.parentMapId ? t('mapKind.nested') : t('mapKind.root')
                }
            />
            <HudSection title={t('editor.basic')}>
                <LabeledInput
                    label={t('name')}
                    maxLength={WORLD_NAME_MAX}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                />
            </HudSection>
            <HudSection title={t('editor.fog')}>
                <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                        {t('editor.fogHide')}
                        <Switch
                            checked={map.fogEnabled}
                            onCheckedChange={(v) =>
                                void save({ fogEnabled: v })
                            }
                        />
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span className="flex items-center justify-between">
                            {t('editor.radiusView')}
                            <span className="font-mono text-hud-gold-bright">
                                {Math.round(radius * 100)}%
                            </span>
                        </span>
                        <RadiusRange
                            radius={radius}
                            fill={fill}
                            setRadius={setRadius}
                            commit={commitRadius}
                        />
                    </label>
                </div>
            </HudSection>
            <HudSection title={t('editor.entry')}>
                <Button
                    type="button"
                    variant={tool === 'entry' ? 'default' : 'outline'}
                    onClick={() =>
                        setTool(tool === 'entry' ? 'select' : 'entry')
                    }
                    className="w-full gap-2"
                >
                    <Crosshair className="size-4" />
                    {tool === 'entry'
                        ? t('editor.entryPlacing')
                        : t('editor.entrySet')}
                </Button>
            </HudSection>
            <HudSection
                title={t('editor.children', { count: children.length })}
            >
                <ChildMapList
                    maps={children}
                    onOpen={openMap}
                    itemClassName="min-h-10"
                />
            </HudSection>
            <HudSection title={t('editor.image')}>
                <p className="mb-2 text-xs text-hud-muted">
                    {map.width}×{map.height} px
                </p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                    className="w-full gap-2"
                >
                    <ImageUp className="size-4" />
                    {t('editor.replaceImage')}
                </Button>
                <ImageFileInput
                    inputRef={fileInput}
                    onFile={(file) => void replaceImage(file)}
                />
            </HudSection>
            <QuietDeleteButton
                label={t('editor.deleteMap')}
                onClick={() => void remove()}
            />
        </div>
    );
}
