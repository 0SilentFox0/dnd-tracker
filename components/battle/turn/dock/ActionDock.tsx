'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ActionsPopover } from './ActionsPopover';
import { DockDiamond } from './DockDiamond';
import { DockHp } from './DockHp';
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
        title?: string;
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
                'group relative flex h-[71px] w-[82px] shrink-0 flex-col items-center justify-center gap-0.5 border-0 p-0 text-[11px] font-bold tracking-[.06em] uppercase [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)] focus-visible:text-white focus-visible:outline-none max-md:h-[58px] max-md:w-[66px]',
                'bg-gradient-to-br from-[#e4ca78] to-[#a9812f] focus-visible:from-[#fff1a8] focus-visible:to-[#e4ca78]',
                exhausted ? 'text-[#211a14]' : 'text-[#ecd78d]'
            )}
        >
            {!exhausted && (
                <span
                    aria-hidden
                    className="absolute inset-[2px] -z-0 bg-gradient-to-br from-[#2e251d] to-[#191410] [clip-path:inherit]"
                />
            )}
            <Icon className="relative size-5" aria-hidden />
            <span className="hud-sc relative">{t('actions')}</span>
        </HudButton>
    );

    return (
        <div
            data-slot="action-dock"
            className="pointer-events-auto flex w-full flex-col items-stretch gap-2"
        >
            {children}
            {phase !== 'acting' && (
                <div className={cn(HUD_GLASS, 'rounded-2xl px-3 py-2')}>
                    <DockHp />
                </div>
            )}
            {phase === 'acting' && (
                <div
                    className={cn(
                        HUD_GLASS,
                        'flex items-center gap-3 rounded-2xl px-3 py-2.5 max-md:gap-2 max-md:px-2'
                    )}
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                        <div className="flex items-start gap-3">
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
                        <DockHp />
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                        {panel ? (
                            <ActionsPopover
                                open={panel.open}
                                onOpenChange={panel.onOpenChange}
                                anchor={actionsButton}
                                title={panel.title}
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
                                className="hud-sc min-h-10 rounded-xl border border-[var(--gold)] px-2 text-[12px] leading-tight tracking-[.06em] text-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none"
                            >
                                {t('endTurn')}
                            </HudButton>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
