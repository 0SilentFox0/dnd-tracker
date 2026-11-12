'use client';

import { useTranslations } from 'next-intl';
import { Timer } from 'lucide-react';

import { useTurnCountdown } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

export function TurnTimerBar() {
    const t = useTranslations('battle.topBar');

    const { secondsLeft, totalSeconds } = useTurnCountdown();

    if (secondsLeft === null || !totalSeconds) return null;

    const elapsed = Math.min(
        100,
        Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100)
    );

    return (
        <div
            aria-label={t('turnTimer')}
            className="mt-2.5 flex items-center gap-2"
        >
            <Timer
                className={cn(
                    'size-4 shrink-0',
                    secondsLeft <= 10 ? 'text-hud-danger' : 'text-hud-soft'
                )}
            />
            <span
                className={cn(
                    'w-8 shrink-0 text-sm tabular-nums',
                    secondsLeft <= 10 ? 'text-hud-danger' : 'text-hud-soft'
                )}
            >
                {secondsLeft}
            </span>
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalSeconds}
                aria-valuenow={totalSeconds - secondsLeft}
                className="h-1.5 flex-1 overflow-hidden bg-white/10"
            >
                <div
                    className="h-full bg-hud-danger transition-[width] duration-500 ease-linear"
                    style={{ width: `${elapsed}%` }}
                />
            </div>
        </div>
    );
}
