'use client';

import { useTranslations } from 'next-intl';
import { ArrowUp } from 'lucide-react';

import { HudButton } from '@/components/hud';

export function LevelUpBadge({
    free,
    onOpen,
}: {
    free: number;
    onOpen: () => void;
}) {
    const t = useTranslations('characterProfile.levelUp');

    if (free === 0) return null;

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 text-left lg:text-right">
                <b className="hud-num block text-[28px] leading-none text-hud-ink lg:text-[34px]">
                    +{free}
                </b>
                <span className="text-sm leading-tight text-hud-muted">
                    {t('freePoints', { free })}
                </span>
            </div>
            <HudButton
                type="button"
                onClick={onOpen}
                className="motion-pulse motion-press hud-title inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[4px] bg-hud-gold-strong px-4 text-xl text-(--palette-primary-foreground,#2a1d05) focus-visible:ring-2 focus-visible:ring-hud-ink focus-visible:outline-none"
            >
                <ArrowUp aria-hidden className="size-5" />
                {t('distribute')}
            </HudButton>
        </div>
    );
}
