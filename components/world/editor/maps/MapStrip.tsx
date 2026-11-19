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
} from '../panels/InspectorParts';
import { useEditorMapFields } from '../use-editor-fields';
import { ChildMapList, ImageFileInput, RadiusRange } from './MapFieldParts';

import { HudButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WorldMapDetail } from '@/types/world';

export function MapStrip({
    detail,
    onClose,
}: {
    detail: WorldMapDetail;
    onClose(): void;
}) {
    const t = useTranslations('world');

    const fileInput = useRef<HTMLInputElement>(null);

    const m = useEditorMapFields(detail);

    return (
        <>
            <StripLead
                icon={MapIcon}
                label={
                    m.map.parentMapId ? t('mapKind.nested') : t('mapKind.root')
                }
            />
            <NameInput
                value={m.name}
                onChange={m.setName}
                onCommit={m.commitName}
            />
            <SwitchField
                label={t('editor.fog')}
                title={t('editor.fogHide')}
                checked={m.map.fogEnabled}
                onChange={(v) => void m.save({ fogEnabled: v })}
            />
            <label className="flex shrink-0 items-center gap-2 text-sm">
                {t('editor.radius')}
                <RadiusRange
                    radius={m.radius}
                    fill={m.fill}
                    setRadius={m.setRadius}
                    commit={m.commitRadius}
                    label={t('editor.radiusView')}
                    className="w-32"
                />
                <span className="w-10 font-mono text-hud-gold-bright">
                    {Math.round(m.radius * 100)}%
                </span>
            </label>
            <Button
                type="button"
                size="sm"
                variant={m.tool === 'entry' ? 'default' : 'outline'}
                onClick={() =>
                    m.setTool(m.tool === 'entry' ? 'select' : 'entry')
                }
                className="h-9 gap-1.5"
            >
                <Crosshair className="size-4" />
                {m.tool === 'entry'
                    ? t('editor.entryPlacing')
                    : t('editor.entryOnMap')}
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <HudButton type="button" className={CHIP}>
                        {t('editor.children', { count: m.children.length })}
                    </HudButton>
                </PopoverTrigger>
                <PopoverContent className={cn(POPOVER, 'w-60')}>
                    <ChildMapList
                        maps={m.children}
                        onOpen={m.openMap}
                        itemClassName="min-h-9"
                    />
                </PopoverContent>
            </Popover>
            <Button
                type="button"
                size="sm"
                variant="outline"
                title={`${m.map.width}×${m.map.height} px`}
                onClick={() => fileInput.current?.click()}
                className="h-9 gap-1.5"
            >
                <ImageUp className="size-4" />
                {t('editor.replaceImage')}
            </Button>
            <ImageFileInput
                inputRef={fileInput}
                onFile={(file) => void m.replaceImage(file)}
            />
            <span className="ml-auto flex shrink-0 items-center gap-2">
                <DeleteButton
                    label={t('editor.deleteMap')}
                    onClick={() => void m.remove()}
                />
                <CloseButton onClose={onClose} />
            </span>
        </>
    );
}
