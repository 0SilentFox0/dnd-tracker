'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';

import { HeroPortrait } from '../../hero/HeroPortrait';
import { SheetLevelPlate } from '../SheetPortraitStrip';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudButton } from '@/components/hud';
import {
    contrastTextColor,
    normalizeHexColor,
} from '@/lib/theme/contrast-text-color';
import { cn } from '@/lib/utils';
import { toMediaUrl } from '@/lib/utils/common/image-url';

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export const bannerPalette = (color: string | null) => {
    if (!color || !HEX.test(color.trim())) {
        return {
            base: 'var(--color-hud-crimson)',
            ink: 'var(--color-hud-crimson-ink)',
        };
    }

    const base = normalizeHexColor(color);

    return { base, ink: contrastTextColor(base) };
};

const NEUTRAL_PALETTE = {
    base: 'var(--color-hud-raised)',
    ink: 'var(--color-hud-muted)',
};

export interface BannerHero {
    name: string;
    avatar: string | null;
    raceColor: string | null;
    raceIcon: string | null;
    level?: number;
}

interface SheetBannerProps {
    hero: BannerHero;
    onPortrait?: () => void;
    size?: 'sm' | 'lg';
    className?: string;
}

const SIZES = {
    sm: {
        box: 'h-44',
        body: 'p-[9px] pb-0',
        frame: 'p-[3px]',
        crest: 'hidden',
    },
    lg: {
        box: 'h-[340px]',
        body: 'p-5 pb-0',
        frame: 'p-2',
        crest: 'flex',
    },
    auto: {
        box: 'h-44 lg:sticky lg:top-[calc((var(--shell-header-h,57px)+16px)/var(--sheet-zoom,1))] lg:h-[340px] lg:self-start',
        body: 'p-[9px] pb-0 lg:p-5 lg:pb-0',
        frame: 'p-[3px] lg:p-2',
        crest: 'hidden lg:flex',
    },
} as const;

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || '?';

function EditablePortrait({
    hero,
    onPortrait,
}: {
    hero: BannerHero;
    onPortrait: () => void;
}) {
    const t = useTranslations('characterProfile.portrait');

    return (
        <HudButton
            type="button"
            aria-label={t('change')}
            onClick={onPortrait}
            className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md bg-hud-raised focus-visible:ring-2 focus-visible:outline-none"
        >
            {hero.avatar ? (
                <OptimizedImage
                    src={toMediaUrl(hero.avatar)}
                    alt={hero.name}
                    width={640}
                    height={640}
                    className="size-full object-cover"
                />
            ) : (
                <span className="hud-sc text-5xl text-hud-muted">
                    {initials(hero.name)}
                </span>
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-hud-page/70 text-sm text-hud-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                <Camera className="size-5" aria-hidden />
                {t('change')}
            </span>
        </HudButton>
    );
}

export function SheetBanner({
    hero,
    onPortrait,
    size,
    className,
}: SheetBannerProps) {
    const slot = SIZES[size ?? 'auto'];

    const neutral = !hero.raceColor && !hero.raceIcon && !hero.name.trim();

    const palette = neutral ? NEUTRAL_PALETTE : bannerPalette(hero.raceColor);

    return (
        <div className={cn('relative', slot.box, className)}>
            <div
                data-testid="sheet-banner"
                style={
                    {
                        '--banner': palette.base,
                        '--banner-ink': palette.ink,
                    } as CSSProperties
                }
                className={cn(
                    'relative h-full bg-[linear-gradient(90deg,rgba(0,0,0,.22),transparent_18%,transparent_82%,rgba(0,0,0,.22)),linear-gradient(var(--banner),color-mix(in_srgb,var(--banner)_55%,var(--color-hud-surface)))] [clip-path:polygon(0_0,100%_0,100%_100%,50%_90%,0_100%)]',
                    slot.body
                )}
            >
                <div
                    className={cn(
                        'relative rounded-lg bg-hud-surface shadow-[0_0_0_1px_var(--color-hud-line),0_18px_40px_-14px_rgba(0,0,0,.8)]',
                        slot.frame
                    )}
                >
                    {onPortrait ? (
                        <EditablePortrait hero={hero} onPortrait={onPortrait} />
                    ) : (
                        <HeroPortrait
                            src={hero.avatar}
                            name={hero.name}
                            className="aspect-[4/5] rounded-md border-0"
                        />
                    )}
                </div>
                {hero.raceIcon && (
                    <EntityIcon
                        src={hero.raceIcon}
                        name=""
                        size={64}
                        className={cn(
                            'absolute bottom-[11%] left-1/2 size-16 -translate-x-1/2 rounded-none bg-transparent text-[color:var(--banner-ink)] opacity-70',
                            slot.crest
                        )}
                    />
                )}
            </div>
            {hero.level !== undefined && <SheetLevelPlate level={hero.level} />}
        </div>
    );
}
