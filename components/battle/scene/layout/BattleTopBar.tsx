'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { HUD_GLASS, HudButton } from '@/components/hud';
import { actionIcon } from '@/components/hud/icons/battle';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleScene, useTurnTimer } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

const NextTurnIcon = actionIcon.nextTurn;

export function RoundBadge({ className }: { className?: string }) {
    const t = useTranslations('battle.topBar');

    const {
        battle: { currentRound, status },
        viewer: { isDM, readOnly },
        turn: { current },
        actions,
        connection,
    } = useBattleScene();

    const canAdvance = isDM && !readOnly && status === BattleStatus.ACTIVE;

    const pending = actions.nextTurn.isPending;

    const hint = current
        ? t('nextTurnHint', { name: current.basicInfo.name })
        : t('nextTurnHintNoName');

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
                    data-tour="battle.next-turn"
                    aria-label={hint}
                    title={hint}
                    onClick={() => actions.nextTurn.mutate({})}
                    className="hud-sc pointer-events-auto relative -my-1 -mr-1.5 flex h-8 items-center gap-1.5 rounded-md border border-hud-line px-2.5 text-sm tracking-[.06em] text-[var(--gold)] before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] hover:bg-hud-panel-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70 max-md:-my-1.5 max-md:px-2 max-md:text-xs"
                >
                    {pending ? (
                        <Loader2
                            className="size-3.5 animate-spin"
                            aria-hidden
                        />
                    ) : (
                        <NextTurnIcon className="size-3.5" aria-hidden />
                    )}
                    <span className="max-md:hidden">{t('nextTurn')}</span>
                    <span className="md:hidden">{t('nextTurnShort')}</span>
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
