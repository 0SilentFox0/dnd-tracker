'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Slider } from '@/components/ui/slider';
import type { MapFogTool } from '@/lib/hooks/battle';
import { FOG_MAX_VISION_RADIUS } from '@/lib/utils/battle/fog/constants';

const MODES = ['off', 'reveal', 'vision'] as const;

const BRUSHES = ['brush', 'rectangle', 'room', 'erase'] as const;

export function MapFogToolbar({ tool }: { tool: MapFogTool }) {
    const t = useTranslations('battle.map.fog');

    return (
        <section
            aria-label={t('label')}
            className="flex w-full max-w-full flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/80 p-1.5 text-xs"
        >
            <div role="group" aria-label={t('mode')} className="flex flex-wrap gap-1">
                {MODES.map((mode) => (
                    <HudToggleChip
                        key={mode}
                        active={tool.mode === mode}
                        onClick={() => tool.setMode(mode)}
                    >
                        {t(`modes.${mode}`)}
                    </HudToggleChip>
                ))}
            </div>
            {tool.mode === 'vision' && (
                <label className="flex items-center gap-1 text-hud-muted">
                    {t('radius')}
                    <Slider
                        aria-label={t('radius')}
                        min={1}
                        max={FOG_MAX_VISION_RADIUS}
                        value={tool.radius}
                        onValueChange={tool.setRadius}
                        onPointerUp={tool.commitRadius}
                        onKeyUp={tool.commitRadius}
                    />
                    <output>{tool.radius}</output>
                </label>
            )}
            <div role="group" aria-label={t('brush')} className="flex flex-wrap gap-1">
                {BRUSHES.map((brush) => (
                    <HudToggleChip
                        key={brush}
                        active={tool.brush === brush}
                        onClick={() => tool.setBrush(brush)}
                    >
                        {t(`brushes.${brush}`)}
                    </HudToggleChip>
                ))}
            </div>
        </section>
    );
}
