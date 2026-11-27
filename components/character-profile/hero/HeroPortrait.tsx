'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
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
    variant?: 'sheet' | 'card';
    classVisual?: { icon: string | null; color: string | null } | null;
}

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || '?';

export function HeroPortrait({
    src,
    name,
    className,
    canEdit,
    variant = 'sheet',
    classVisual,
}: HeroPortraitProps) {
    const t = useTranslations('characterProfile.portrait');

    const [open, setOpen] = useState(false);

    const frame = cn(
        'relative aspect-square w-full overflow-hidden rounded-xl border border-hud-rule bg-hud-raised focus-visible:ring-2 focus-visible:outline-none',
        className
    );

    if (!src && variant === 'card') {
        const color = classVisual?.color;

        return (
            <div
                data-slot="portrait-card-fallback"
                className={cn(
                    'flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-hud-rule bg-hud-raised',
                    className
                )}
                style={
                    color
                        ? {
                              backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${color} 35%, var(--color-hud-panel-2)), var(--color-hud-panel))`,
                          }
                        : undefined
                }
            >
                {classVisual?.icon ? (
                    <EntityIcon
                        src={classVisual.icon}
                        name={name}
                        size={96}
                        emoji
                        className="size-12 rounded-none bg-transparent text-4xl"
                    />
                ) : (
                    <span className="hud-sc text-3xl text-hud-muted">
                        {initials(name)}
                    </span>
                )}
            </div>
        );
    }

    if (!src) {
        return (
            <div
                className={cn(
                    frame,
                    'hud-sc flex flex-col items-center justify-center gap-1 text-5xl text-hud-muted'
                )}
            >
                {initials(name)}
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
