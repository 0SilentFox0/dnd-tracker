'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, ImageUp, Map as MapIcon } from 'lucide-react';

import {
    CHIP,
    CloseButton,
    DeleteButton,
    NameInput,
    POPOVER,
    StripLead,
    SwitchField,
} from './InspectorParts';
import { ChildMapList, ImageFileInput, RadiusRange } from './MapFieldParts';
import { useWorldEditorContext } from './WorldEditorContext';

import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useMapFields } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import type { WorldMapDetail } from '@/types/world';

export function MapStrip({
    detail,
    onClose,
}: {
    detail: WorldMapDetail;
    onClose(): void;
}) {
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
        <>
            <StripLead
                icon={MapIcon}
                label={
                    map.parentMapId ? t('mapKind.nested') : t('mapKind.root')
                }
            />
            <NameInput value={name} onChange={setName} onCommit={commitName} />
            <SwitchField
                label={t('editor.fog')}
                title={t('editor.fogHide')}
                checked={map.fogEnabled}
                onChange={(v) => void save({ fogEnabled: v })}
            />
            <label className="flex shrink-0 items-center gap-2 text-sm">
                {t('editor.radius')}
                <RadiusRange
                    radius={radius}
                    fill={fill}
                    setRadius={setRadius}
                    commit={commitRadius}
                    label={t('editor.radiusView')}
                    className="w-32"
                />
                <span className="w-10 font-mono text-hud-gold-bright">
                    {Math.round(radius * 100)}%
                </span>
            </label>
            <Button
                type="button"
                size="sm"
                variant={tool === 'entry' ? 'default' : 'outline'}
                onClick={() => setTool(tool === 'entry' ? 'select' : 'entry')}
                className="h-9 gap-1.5"
            >
                <Crosshair className="size-4" />
                {tool === 'entry'
                    ? t('editor.entryPlacing')
                    : t('editor.entryOnMap')}
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="plain" size="auto" type="button" className={CHIP}>
                        {t('editor.children', { count: children.length })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn(POPOVER, 'w-60')}>
                    <ChildMapList
                        maps={children}
                        onOpen={openMap}
                        itemClassName="min-h-9"
                    />
                </PopoverContent>
            </Popover>
            <Button
                type="button"
                size="sm"
                variant="outline"
                title={`${map.width}×${map.height} px`}
                onClick={() => fileInput.current?.click()}
                className="h-9 gap-1.5"
            >
                <ImageUp className="size-4" />
                {t('editor.replaceImage')}
            </Button>
            <ImageFileInput
                inputRef={fileInput}
                onFile={(file) => void replaceImage(file)}
            />
            <span className="ml-auto flex shrink-0 items-center gap-2">
                <DeleteButton
                    label={t('editor.deleteMap')}
                    onClick={() => void remove()}
                />
                <CloseButton onClose={onClose} />
            </span>
        </>
    );
}
