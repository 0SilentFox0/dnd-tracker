'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles } from 'lucide-react';

import { BattlePlayerViewToggle } from '../BattlePlayerViewToggle';

import { HudButton, HudIconButton } from '@/components/hud';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleScene, useFxEnabled } from '@/lib/hooks/battle';
import { useConfirm } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

// temporary home of the controls removed from the top bar; the tools drawer (T4) takes them over
export function BattleTempControls({
    onComplete,
}: {
    onComplete?: () => void;
}) {
    const t = useTranslations('battle.topBar');

    const {
        battle,
        viewer: { isDM },
        turn: { isMyTurn },
        actions,
    } = useBattleScene();

    const confirm = useConfirm();

    const {
        enabled: fxOn,
        motionAllowed,
        setEnabled: setFxOn,
    } = useFxEnabled();

    const fxHint = motionAllowed ? undefined : t('fxDisabledHint');

    const reset = async () => {
        if (
            await confirm({
                title: t('resetTitle'),
                description: t('resetDescription'),
                confirmLabel: t('reset'),
            })
        ) {
            actions.reset.mutate({});
        }
    };

    const nextPending = actions.nextTurn.isPending;

    return (
        <>
            <span className="hud-sc truncate text-[15px] tracking-[.08em]">
                {battle.name}
            </span>
            {isMyTurn && battle.status === BattleStatus.ACTIVE && (
                <span className="hud-sc hidden h-8 items-center border-y border-[var(--enemy)] bg-[var(--enemy)]/20 px-4 text-[15px] tracking-[.12em] lg:flex">
                    {t('yourTurn')}
                </span>
            )}
            <HudIconButton
                type="button"
                disabled={!motionAllowed}
                title={fxHint}
                onClick={() => setFxOn(!fxOn)}
                aria-label={fxOn ? t('fxOn') : t('fxOff')}
                aria-pressed={fxOn}
                className={cn(
                    'ml-auto hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                    fxOn ? 'text-[var(--gold)]' : 'text-hud-muted'
                )}
            >
                <Sparkles className="size-4" />
            </HudIconButton>
            <BattlePlayerViewToggle />
            <Link
                href={`/campaigns/${battle.campaignId}`}
                className="hud-sc text-sm text-hud-soft hover:text-[var(--gold)]"
            >
                {t('toCampaign')}
            </Link>
            {isDM && battle.status !== BattleStatus.PREPARED && (
                <span className="hidden gap-2 lg:flex">
                    {onComplete && battle.status === BattleStatus.ACTIVE && (
                        <HudButton
                            type="button"
                            onClick={onComplete}
                            className="hud-sc h-8 w-32 border border-[var(--gold)]/60 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10"
                        >
                            {t('complete')}
                        </HudButton>
                    )}
                    <HudButton
                        type="button"
                        data-tour="battle.reset"
                        onClick={() => void reset()}
                        className="hud-sc h-8 w-28 border border-hud-danger/50 text-sm text-hud-danger hover:bg-hud-danger/10"
                    >
                        {t('reset')}
                    </HudButton>
                    {battle.status === BattleStatus.ACTIVE && (
                        <HudButton
                            type="button"
                            data-tour="battle.next-turn"
                            disabled={nextPending}
                            onClick={() => actions.nextTurn.mutate({})}
                            className="hud-sc flex h-8 w-36 items-center justify-center bg-[var(--enemy)] text-sm text-[#fffaf0] disabled:opacity-70"
                        >
                            {nextPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                t('nextTurn')
                            )}
                        </HudButton>
                    )}
                </span>
            )}
        </>
    );
}
