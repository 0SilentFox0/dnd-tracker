'use client';

import { useTranslations } from 'next-intl';
import { LocateFixed, Minus, Plus } from 'lucide-react';

import { HUD_GLASS } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { useHudBlock } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

interface Props {
    onZoomIn(): void;
    onZoomOut(): void;
    onRecenter(): void;
    zoom: number;
    canRecenter: boolean;
    userMoved: boolean;
    phone: boolean;
}

export function MapCameraControls({
    onZoomIn,
    onZoomOut,
    onRecenter,
    zoom,
    canRecenter,
    userMoved,
    phone,
}: Props) {
    const t = useTranslations('battle.map.camera');

    const { hidden } = useHudBlock('tools');

    return (
        <div
            hidden={!phone && hidden}
            className={cn(
                HUD_GLASS,
                'absolute right-[calc(0.75rem+var(--hud-side-w,0px))] z-30 flex items-center rounded-xl',
                phone ? 'bottom-2' : 'top-[3.75rem]'
            )}
        >
            <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t('zoomOut')}
                onClick={onZoomOut}
                className={cn(phone && 'size-11')}
            >
                <Minus />
            </Button>
            <span
                role="status"
                aria-label={t('zoomLevel')}
                className="min-w-12 px-1 text-center text-[13px] text-[var(--ink)] tabular-nums"
            >
                {Math.round(zoom * 100)}%
            </span>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t('zoomIn')}
                onClick={onZoomIn}
                className={cn(phone && 'size-11')}
            >
                <Plus />
            </Button>
            {canRecenter && (
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('recenter')}
                    aria-pressed={userMoved}
                    onClick={onRecenter}
                    className={cn(
                        phone && 'size-11',
                        userMoved && 'text-[var(--gold)]'
                    )}
                >
                    <LocateFixed />
                </Button>
            )}
        </div>
    );
}
