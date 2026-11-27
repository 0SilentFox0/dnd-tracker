'use client';

import { type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import { HeroPortrait } from '../hero/HeroPortrait';
import { SheetLevelPlate } from './SheetPortraitStrip';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudButton } from '@/components/hud';
import {
    contrastTextColor,
    normalizeHexColor,
} from '@/lib/theme/contrast-text-color';
import { cn } from '@/lib/utils';
import { toMediaUrl } from '@/lib/utils/common/image-url';

export interface BannerHero {
    name: string;
    avatar: string | null;
    raceColor: string | null;
    raceIcon: string | null;
    race?: string;
    level?: number;
}

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

const NEUTRAL = {
    base: 'var(--color-hud-raised)',
    ink: 'var(--color-hud-ink)',
};

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

const FRAME =
    'relative aspect-[4/5] w-full overflow-hidden rounded-lg border-0 bg-hud-raised';

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

export function SheetBanner({
    hero,
    onPortrait,
    size = 'lg',
    className,
}: {
    hero: BannerHero;
    onPortrait?: () => void;
    size?: 'sm' | 'lg';
    className?: string;
}) {
    const t = useTranslations('characterProfile.portrait');

    const banner = hero.name.trim() ? bannerPalette(hero.raceColor) : NEUTRAL;

    const large = size === 'lg';

    return (
        <div
            className={cn(
                'relative h-44',
                large &&
                    'lg:sticky lg:top-[calc((var(--shell-header-h)+16px)/var(--sheet-zoom,1))] lg:h-[340px] lg:self-start',
                className
            )}
        >
            <div
                data-testid="sheet-banner"
                style={
                    {
                        '--banner': banner.base,
                        '--banner-ink': banner.ink,
                    } as CSSProperties
                }
                className={cn(
                    'relative h-full bg-[linear-gradient(90deg,rgba(0,0,0,.22),transparent_18%,transparent_82%,rgba(0,0,0,.22)),linear-gradient(var(--banner),color-mix(in_srgb,var(--banner)_55%,var(--color-hud-surface)))] p-[9px] pb-0 [clip-path:polygon(0_0,100%_0,100%_100%,50%_90%,0_100%)]',
                    large && 'lg:p-5 lg:pb-0'
                )}
            >
                <div
                    className={cn(
                        'relative rounded-lg bg-hud-surface p-[3px] shadow-[0_0_0_1px_var(--color-hud-line),0_18px_40px_-14px_rgba(0,0,0,.8)]',
                        large && 'lg:p-2'
                    )}
                >
                    {onPortrait ? (
                        <HudButton
                            type="button"
                            onClick={onPortrait}
                            className={cn(
                                FRAME,
                                'group focus-visible:ring-2 focus-visible:outline-none'
                            )}
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
                                <span className="hud-sc flex size-full flex-col items-center justify-center gap-1 px-1 text-3xl text-hud-muted max-lg:pb-8 lg:text-5xl">
                                    {initial(hero.name)}
                                    {hero.name.trim() && (
                                        <span className="line-clamp-2 text-center text-xs [overflow-wrap:anywhere] text-hud-ink lg:text-base">
                                            {hero.name}
                                        </span>
                                    )}
                                </span>
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1.5 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-lg:opacity-100">
                                {hero.avatar ? t('change') : t('add')}
                            </span>
                        </HudButton>
                    ) : (
                        <HeroPortrait
                            src={hero.avatar}
                            name={hero.name}
                            className="aspect-[4/5] rounded-lg border-0"
                        />
                    )}
                </div>
                {(hero.raceIcon || hero.race) && (
                    <EntityIcon
                        src={hero.raceIcon}
                        name={hero.race ?? ''}
                        size={64}
                        className={cn(
                            'absolute bottom-[11%] left-1/2 hidden size-16 -translate-x-1/2 rounded-none bg-transparent text-[color:var(--banner-ink)] opacity-70',
                            large && 'lg:flex'
                        )}
                    />
                )}
            </div>
            {hero.level !== undefined && <SheetLevelPlate level={hero.level} />}
        </div>
    );
}
