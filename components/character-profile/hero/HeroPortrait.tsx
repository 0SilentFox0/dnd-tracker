'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ImageZoomDialog } from '@/components/common/entity/ImageZoomDialog';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import { toMediaUrl } from '@/lib/utils/common/image-url';

interface HeroPortraitProps {
    src: string | null | undefined;
    name: string;
    className?: string;
    canEdit?: boolean;
}

export function HeroPortrait({
    src,
    name,
    className,
    canEdit,
}: HeroPortraitProps) {
    const t = useTranslations('characterProfile.portrait');

    const [open, setOpen] = useState(false);

    const frame = cn(
        'relative aspect-square w-full overflow-hidden rounded-2xl border border-hud-rule bg-hud-raised focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none',
        className
    );

    if (!src) {
        return (
            <div
                className={cn(
                    frame,
                    'hud-sc flex flex-col items-center justify-center gap-1 text-6xl text-hud-gold'
                )}
            >
                {name.trim().charAt(0).toUpperCase() || '?'}
                {canEdit && (
                    <span className="text-xs text-hud-muted">{t('add')}</span>
                )}
            </div>
        );
    }

    return (
        <>
            <HudButton
                type="button"
                aria-label={t('open')}
                onClick={() => setOpen(true)}
                className={frame}
            >
                <OptimizedImage
                    src={toMediaUrl(src)}
                    alt={name}
                    width={640}
                    height={640}
                    className="size-full object-cover"
                />
            </HudButton>
            <ImageZoomDialog
                src={toMediaUrl(src)}
                name={name}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
