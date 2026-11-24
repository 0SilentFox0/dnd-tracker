'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { actionIcon,type ActionIconKey } from '@/components/hud/icons/battle';
import type { usePlayerTurn } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
type Turn = ReturnType<typeof usePlayerTurn>;

const Tile = ({
    icon,
    label,
    used,
    primary,
    onClick,
}: {
    icon: ActionIconKey;
    label: ReactNode;
    used?: boolean;
    primary?: boolean;
    onClick?: () => void;
}) => {
    const Icon = actionIcon[icon];

    return (
    <HudButton
        type="button"
        disabled={used}
        onClick={onClick}
        className={cn(
            'flex h-16 min-w-0 items-center gap-3 border px-3.5 text-left text-[var(--ink)] disabled:opacity-40',
            primary
                ? 'border-[var(--gold)] bg-[var(--gold)]/20'
                : 'border-white/25 bg-black/55'
        )}
    >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--gold)]/40 bg-black/30">
            <Icon className="size-10 text-[var(--gold)]" />
        </span>
        <span className="hud-sc min-w-0 text-[17px] leading-5 [overflow-wrap:anywhere]">
            {label}
        </span>
    </HudButton>
    );
};

export function ActionGrid({
    turn,
    pending,
    available,
    actions,
    channelLabel,
    gateLabel,
}: {
    turn: Turn;
    channelLabel?: ReactNode;
    gateLabel?: ReactNode;
    pending: boolean;
    available: {
        channel?: boolean;
        magic: boolean;
        magicTile?: boolean;
        bonus: boolean;
        bonusTile?: boolean;
        ability?: boolean;
        core?: boolean;
        gear?: boolean;
    };
    actions: {
        channel?(): void;
        attack(): void;
        magic(): void;
        bonus(): void;
        ability?(): void;
        core?(): void;
        gear?(): void;
    };
}) {
    const t = useTranslations('battle.actions');

    return (
        <>
            <div
                data-tour="battle.turn-controls"
                className="grid grid-cols-2 gap-2 pt-3"
            >
                <Tile
                    icon="attack"
                    label={t('attack')}
                    used={
                        (turn.status.actionUsed && !turn.status.attackLeft) ||
                        turn.status.skipped ||
                        pending
                    }
                    primary
                    onClick={actions.attack}
                />
                {available.magicTile !== false && (
                    <Tile
                        icon="magic"
                        label={t('magic')}
                        used={
                            (turn.status.actionUsed &&
                                !turn.status.bonusSpellReady) ||
                            turn.status.skipped ||
                            !available.magic ||
                            pending
                        }
                        onClick={actions.magic}
                    />
                )}
                {available.channel && channelLabel && (
                    <Tile
                        icon="channel"
                        label={channelLabel}
                        used={
                            turn.status.actionUsed ||
                            turn.status.skipped ||
                            pending
                        }
                        onClick={actions.channel}
                    />
                )}
                {available.ability && (
                    <Tile
                        icon="ability"
                        label={t('ability')}
                        used={
                            turn.status.actionUsed ||
                            turn.status.skipped ||
                            pending
                        }
                        onClick={actions.ability}
                    />
                )}
                {available.bonusTile !== false && (
                    <Tile
                        icon="bonus"
                        label={t('bonus')}
                        used={
                            !turn.status.bonusAvailable ||
                            turn.status.skipped ||
                            !available.bonus ||
                            pending
                        }
                        onClick={actions.bonus}
                    />
                )}
                {available.core && (
                    <Tile
                        icon="core"
                        label={t('core')}
                        used={turn.status.skipped || pending}
                        onClick={actions.core}
                    />
                )}
                {available.gear && (
                    <Tile
                        icon="gear"
                        label={t('gear')}
                        used={
                            !turn.status.bonusAvailable ||
                            turn.status.skipped ||
                            pending
                        }
                        onClick={actions.gear}
                    />
                )}
                {turn.strikeAndReturn.available && (
                    <Tile
                        icon="strikeAndReturn"
                        label={t('strikeAndReturn')}
                        used={pending}
                        onClick={turn.strikeAndReturn.run}
                    />
                )}
                {turn.gateResult && gateLabel && (
                    <Tile icon="gate" label={gateLabel} used />
                )}
            </div>
            {turn.phase !== 'countdown' && (
                <HudButton
                    type="button"
                    disabled={pending}
                    onClick={() => void turn.actions.endTurn()}
                    className="hud-sc mt-2 flex h-11 w-full items-center justify-center border border-white/15 text-[15px] tracking-[.08em] text-hud-soft disabled:opacity-50"
                >
                    {t('endTurn')}
                </HudButton>
            )}
        </>
    );
}
