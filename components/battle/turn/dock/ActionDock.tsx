'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ActionsPopover } from './ActionsPopover';
import { DockDiamond } from './DockDiamond';
import { MoveBar } from './MoveBar';

import { HudButton } from '@/components/hud';
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
    onActions,
    onEnd,
    panel,
    children,
}: {
    status: DockStatus;
    economy: { bonusAction: boolean; reaction: boolean };
    move?: { used: number; max: number };
    phase: TurnFlowState['phase'];
    onActions(): void;
    onEnd(): void;
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
            onClick={onActions}
            data-tour="battle.turn-controls"
            className={cn(
                'hud-sc flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl border px-4 text-[17px] tracking-[.08em] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none',
                exhausted
                    ? 'border-white/25 bg-black/55 text-[var(--ink)]'
                    : 'border-[var(--gold)] bg-[var(--gold)] text-[#2a1d05]'
            )}
        >
            <Icon className="size-5" aria-hidden />
            {t('actions')}
        </HudButton>
    );

    return (
        <div
            data-slot="action-dock"
            className="pointer-events-auto flex max-w-full flex-col items-center gap-2 pb-[max(12px,env(safe-area-inset-bottom))]"
        >
            {children}
            {phase === 'acting' && (
                <div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-black/70 px-4 py-2">
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
                    {economy.reaction && status.reactionAvailable !== null && (
                        <DockDiamond
                            label={t('reaction')}
                            spent={!status.reactionAvailable}
                            spentLabel={spentLabel}
                        />
                    )}
                    {move && <MoveBar {...move} />}
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
                            onClick={onEnd}
                            className="hud-sc h-12 min-w-28 rounded-xl border border-[var(--gold)] px-4 text-[15px] tracking-[.08em] text-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none"
                        >
                            {t('endTurn')}
                        </HudButton>
                    )}
                </div>
            )}
        </div>
    );
}
