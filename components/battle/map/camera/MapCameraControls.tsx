'use client';

import { useTranslations } from 'next-intl';
import { LocateFixed, Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    onZoomIn(): void;
    onZoomOut(): void;
    onRecenter(): void;
    canRecenter: boolean;
    userMoved: boolean;
    phone: boolean;
}

export function MapCameraControls({
    onZoomIn,
    onZoomOut,
    onRecenter,
    canRecenter,
    userMoved,
    phone,
}: Props) {
    const t = useTranslations('battle.map.camera');

    return (
        <div className="absolute right-2 bottom-2 z-30 flex flex-col rounded-md border border-white/20 bg-black/75 shadow-lg">
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
