'use client';

import { useTranslations } from 'next-intl';

import { BattleTempControls } from './BattleTempControls';

import { useBattleScene, useTurnTimer } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

export function RoundBadge({ className }: { className?: string }) {
    const t = useTranslations('battle.topBar');

    const {
        battle: { currentRound },
        connection,
    } = useBattleScene();

    return (
        <span
            data-tour="battle.topbar"
            className={cn(
                'hud-sc flex items-center gap-2 text-sm text-hud-soft',
                className
            )}
        >
            {t('round', { round: currentRound })}
            <i
                className={cn(
                    'size-1.5 rounded-full',
                    connection === 'connected'
                        ? 'bg-[#9fb98a]'
                        : 'animate-[hud-pulse_1.2s_infinite] bg-[#f0b44c]'
                )}
            />
        </span>
    );
}

export function BattleTopBar({ onComplete }: { onComplete?: () => void }) {
    useTurnTimer();

    return (
        <div className="flex h-12 items-center gap-3 px-4">
            <RoundBadge />
            <BattleTempControls onComplete={onComplete} />
        </div>
    );
}
