'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ActionsPopover } from './ActionsPopover';
import { DockDiamond } from './DockDiamond';
import { MoveBar } from './MoveBar';

import { HUD_GLASS, HudButton } from '@/components/hud';
import { actionIcon } from '@/components/hud/icons/battle';
import { cn } from '@/lib/utils';
import type { TurnFlowState } from '@/lib/utils/battle/flows';

export type DockStatus = {
    actionUsed: boolean;
    bonusAvailable: boolean;
    reactionAvailable: boolean | null;
};

export function ActionDock({
    status,
    economy,
    move,
    phase,
    on,
    panel,
    children,
}: {
    status: DockStatus;
    economy: { bonusAction: boolean; reaction: boolean };
    move?: { used: number; max: number };
    phase: TurnFlowState['phase'];
    on: { actions(): void; end(): void };
    panel?: {
        open: boolean;
        onOpenChange(open: boolean): void;
        content: ReactNode;
    };
    children?: ReactNode;
}) {
    const t = useTranslations('battle.dock');

    const Icon = actionIcon.actions;

    const spentLabel = t('spent');

    const exhausted =
        status.actionUsed && (!economy.bonusAction || !status.bonusAvailable);

    const actionsButton = (
        <HudButton
            type="button"
            onClick={on.actions}
            data-tour={panel?.open ? undefined : 'battle.turn-controls'}
            className={cn(
                'hud-sc flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-[13px] tracking-[.08em] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none',
                exhausted
                    ? 'border-white/25 bg-black/55 text-[var(--ink)]'
                    : 'border-[var(--gold)] bg-[var(--gold)] text-[#2a1d05]'
            )}
        >
            <Icon className="size-6" aria-hidden />
            {t('actions')}
        </HudButton>
    );

    return (
        <div
            data-slot="action-dock"
            className="pointer-events-auto flex w-full flex-col items-stretch gap-2"
        >
            {children}
            {phase === 'acting' && (
                <div
                    className={cn(
                        HUD_GLASS,
                        'flex items-center gap-3 rounded-2xl px-3 py-2'
                    )}
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-around gap-1">
                            <DockDiamond
                                label={t('action')}
                                spent={status.actionUsed}
                                spentLabel={spentLabel}
                            />
                            {economy.bonusAction && (
                                <DockDiamond
                                    label={t('bonus')}
                                    spent={!status.bonusAvailable}
                                    spentLabel={spentLabel}
                                />
                            )}
                            {economy.reaction &&
                                status.reactionAvailable !== null && (
                                    <DockDiamond
                                        label={t('reaction')}
                                        spent={!status.reactionAvailable}
                                        spentLabel={spentLabel}
                                    />
                                )}
                        </div>
                        {move && <MoveBar {...move} />}
                    </div>
                    {panel ? (
                        <ActionsPopover
                            open={panel.open}
                            onOpenChange={panel.onOpenChange}
                            anchor={actionsButton}
                        >
                            {panel.content}
                        </ActionsPopover>
                    ) : (
                        actionsButton
                    )}
                    {exhausted && (
                        <HudButton
                            type="button"
                            onClick={on.end}
                            className="hud-sc min-h-10 max-w-24 shrink-0 rounded-xl border border-[var(--gold)] px-2 text-[13px] leading-tight tracking-[.06em] text-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none"
                        >
                            {t('endTurn')}
                        </HudButton>
                    )}
                </div>
            )}
        </div>
    );
}
