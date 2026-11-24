'use client';

import { useTranslations } from 'next-intl';

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
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-hud-gold/40 bg-hud-gold/10 py-2 pr-2 pl-3.5">
            <div className="min-w-0">
                <b className="block text-[15px] text-hud-ink">LVL UP +{free}</b>
                <span className="text-sm text-hud-muted">
                    {t('freePoints', { free })}
                </span>
            </div>
            <HudButton
                type="button"
                onClick={onOpen}
                className="motion-pulse motion-press min-h-10 shrink-0 rounded-[10px] bg-hud-gold-strong px-4 text-[15px] font-bold text-(--palette-primary-foreground,#2a1d05) focus-visible:ring-2 focus-visible:ring-hud-ink focus-visible:outline-none"
            >
                {t('distribute')}
            </HudButton>
        </div>
    );
}
