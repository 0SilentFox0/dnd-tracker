'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, X } from 'lucide-react';

import { HudButton } from '@/components/hud';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorldMap } from '@/lib/hooks/world';
import type { ScenarioMarkerRef } from '@/types/scenario';

interface MarkerChipProps {
    campaignId: string;
    marker: ScenarioMarkerRef;
    onRemove?(): void;
    action?(available: boolean): ReactNode;
}

export function MarkerChip({
    campaignId,
    marker,
    onRemove,
    action,
}: MarkerChipProps) {
    const t = useTranslations('scenario.marker');

    const { data, isError, isLoading } = useWorldMap(campaignId, marker.mapId);

    const found = data?.markers.find((m) => m.id === marker.markerId);

    const available = !!found;

    return (
        <span className="sb-chip sb-bind">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {found ? (
                <span className="sb-chip-name">{found.name}</span>
            ) : (
                (isError || (!isLoading && data)) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className="sb-chip-name sb-missing"
                                    tabIndex={0}
                                >
                                    {t('unavailable')}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-64">
                                {t('unavailableHint')}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            )}
            {action?.(available)}
            {onRemove && (
                <HudButton
                    type="button"
                    aria-label={t('unbind')}
                    onClick={onRemove}
                >
                    <X className="size-3" />
                </HudButton>
            )}
        </span>
    );
}
