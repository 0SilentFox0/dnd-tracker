'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { ART_TOOLS, BRUSH_TOOLS } from '@/lib/constants/map-art/lights';
import type { useMapArtEditor } from '@/lib/hooks/battle-maps';

type Art = ReturnType<typeof useMapArtEditor>;

const STAMP_TOOLS = [
    { value: 'stamp', labelKey: 'tool' },
    { value: 'stamp-select', labelKey: 'select' },
] as const;

const BRUSH_SIZES = ['1', '2', '3'].map((size) => ({
    value: size,
    label: size,
}));

export function ArtToolBar({ art }: { art: Art }) {
    const t = useTranslations('maps.editor.art');

    const ts = useTranslations('maps.editor.stamps');

    const { tool, brush } = art;

    const toggle = (value: (typeof ART_TOOLS)[number] | 'stamp' | 'stamp-select') => {
        art.clearNotice();
        art.setTool(tool === value ? null : value);
    };

    return (
        <div className="space-y-2">
            <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t('tools')}
            >
                {ART_TOOLS.map((value) => (
                    <HudToggleChip
                        key={value}
                        active={tool === value}
                        title={t(`toolHint.${value}`)}
                        onClick={() => toggle(value)}
                    >
                        {t(`tool.${value}`)}
                    </HudToggleChip>
                ))}
                {STAMP_TOOLS.map(({ value, labelKey }) => (
                    <HudToggleChip
                        key={value}
                        active={tool === value}
                        title={t(`toolHint.${value}`)}
                        onClick={() => toggle(value)}
                    >
                        {ts(labelKey)}
                    </HudToggleChip>
                ))}
            </div>
            {tool && BRUSH_TOOLS.includes(tool) && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="art-brush-size" className="text-xs">
                        {t('brushSize')}
                    </Label>
                    <SelectField
                        id="art-brush-size"
                        value={String(brush.size)}
                        options={BRUSH_SIZES}
                        onValueChange={(size) => brush.setSize(Number(size))}
                        triggerClassName="h-8 w-16"
                    />
                </div>
            )}
            {tool && (
                <p className="text-xs text-hud-muted" aria-live="polite">
                    {t(`toolHint.${tool}`)}
                </p>
            )}
        </div>
    );
}
