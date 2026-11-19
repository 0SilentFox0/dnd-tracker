'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip, HudToolbar } from '@/components/hud';
import { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import type { MapWeatherTool } from '@/lib/hooks/battle';
import type { WeatherKind } from '@/types/battle-grid';

const OPTIONS: readonly (WeatherKind | null)[] = [null, ...WEATHER_KINDS];

export function MapWeatherPicker({ tool }: { tool: MapWeatherTool }) {
    const t = useTranslations('battle.map');

    const tw = useTranslations('battleCommon.weather');

    return (
        <HudToolbar
            label={t('tools.weather')}
            className="max-w-[calc(100%-1rem)] text-hud-bone"
        >
            {OPTIONS.map((value) => (
                <HudToggleChip
                    key={value ?? 'clear'}
                    active={tool.current === value}
                    disabled={tool.pending}
                    onClick={() => tool.choose(value)}
                >
                    {tw(value ?? 'clear')}
                </HudToggleChip>
            ))}
        </HudToolbar>
    );
}
