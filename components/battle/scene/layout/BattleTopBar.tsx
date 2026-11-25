'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { HUD_GLASS, HudButton } from '@/components/hud';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleScene, useTurnTimer } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

export function RoundBadge({ className }: { className?: string }) {
    const t = useTranslations('battle.topBar');

    const {
        battle: { currentRound, status },
        viewer: { isDM, readOnly },
        actions,
        connection,
    } = useBattleScene();

    const canAdvance = isDM && !readOnly && status === BattleStatus.ACTIVE;

    const pending = actions.nextTurn.isPending;

    return (
        <span
            data-tour="battle.topbar"
            className={cn(
                `${HUD_GLASS} hud-sc flex items-center gap-2 border-l-2 border-l-[var(--gold)] text-sm text-hud-soft max-md:gap-1.5 max-md:text-xs`,
                className
            )}
        >
            {t('round', { round: currentRound })}
            <i
                role="img"
                aria-label={t(
                    connection === 'connected' ? 'connected' : 'connecting'
                )}
                title={t(
                    connection === 'connected' ? 'connected' : 'connecting'
                )}
                className={cn(
                    'size-1.5 rounded-full',
                    connection === 'connected'
                        ? 'bg-[#9fb98a]'
                        : 'animate-[hud-pulse_1.2s_infinite] bg-[#f0b44c]'
                )}
            />
            {canAdvance && (
                <HudButton
                    type="button"
                    disabled={pending}
                    aria-label={t('nextTurn')}
                    title={t('nextTurn')}
                    onClick={() => actions.nextTurn.mutate({})}
                    className="pointer-events-auto -my-2 -mr-2 flex size-10 max-md:-my-1.5 max-md:-mr-1.5 max-md:size-8 items-center justify-center rounded-md text-base leading-none text-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none disabled:opacity-70"
                >
                    {pending ? (
                        <Loader2
                            className="size-3.5 animate-spin"
                            aria-hidden
                        />
                    ) : (
                        <span aria-hidden>›</span>
                    )}
                </HudButton>
            )}
        </span>
    );
}

export function BattleTopBar() {
    useTurnTimer();

    return (
        <RoundBadge className="pointer-events-none absolute top-3 left-3 z-20 rounded-xl px-3 py-1.5 max-md:top-1 max-md:left-2 max-md:rounded-lg max-md:px-2 max-md:py-0.5" />
    );
}
