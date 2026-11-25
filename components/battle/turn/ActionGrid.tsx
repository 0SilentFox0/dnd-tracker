'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { actionIcon, type ActionIconKey } from '@/components/hud/icons/battle';
import { useActionHotkeys, type usePlayerTurn } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
type Turn = ReturnType<typeof usePlayerTurn>;

const Tile = ({
    icon,
    label,
    hotkey,
    used,
    primary,
    onClick,
}: {
    icon: ActionIconKey;
    label: ReactNode;
    hotkey?: number;
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
                    ? 'border-hud-crimson bg-hud-panel-2'
                    : 'border-white/25 bg-black/55'
            )}
        >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-hud-line bg-black/30">
                <Icon className="size-10 text-hud-crimson-fg" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="hud-sc block text-[17px] leading-5 [overflow-wrap:anywhere]">
                    {label}
                </span>
            </span>
            {hotkey !== undefined && (
                <kbd
                    aria-hidden
                    className="shrink-0 rounded border border-white/25 px-1.5 text-xs text-hud-soft"
                >
                    {hotkey}
                </kbd>
            )}
        </HudButton>
    );
};

type TileSpec = {
    id: string;
    icon: ActionIconKey;
    label: ReactNode;
    used: boolean;
    primary?: boolean;
    run?: () => void;
};

export function ActionGrid({
    turn,
    pending,
    available,
    actions,
    channelLabel,
    gateLabel,
    hotkeys,
}: {
    turn: Turn;
    hotkeys?: { enabled: boolean; close(): void };
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
        strikeAndReturn?(): void;
    };
}) {
    const t = useTranslations('battle.actions');

    const { status } = turn;

    const tiles: TileSpec[] = [
        {
            id: 'attack',
            icon: 'attack',
            label: t('attack'),
            used:
                (status.actionUsed && !status.attackLeft) ||
                status.skipped ||
                pending,
            primary: true,
            run: actions.attack,
        },
        ...(available.magicTile !== false
            ? [
                  {
                      id: 'magic',
                      icon: 'magic' as const,
                      label: t('magic'),
                      used:
                          (status.actionUsed && !status.bonusSpellReady) ||
                          status.skipped ||
                          !available.magic ||
                          pending,
                      run: actions.magic,
                  },
              ]
            : []),
        ...(available.channel && channelLabel
            ? [
                  {
                      id: 'channel',
                      icon: 'channel' as const,
                      label: channelLabel,
                      used: status.actionUsed || status.skipped || pending,
                      run: actions.channel,
                  },
              ]
            : []),
        ...(available.ability
            ? [
                  {
                      id: 'ability',
                      icon: 'ability' as const,
                      label: t('ability'),
                      used: status.actionUsed || status.skipped || pending,
                      run: actions.ability,
                  },
              ]
            : []),
        ...(available.core
            ? [
                  {
                      id: 'core',
                      icon: 'core' as const,
                      label: t('core'),
                      used: status.skipped || pending,
                      run: actions.core,
                  },
              ]
            : []),
        ...(turn.gateResult && gateLabel
            ? [
                  {
                      id: 'gate',
                      icon: 'gate' as const,
                      label: gateLabel,
                      used: true,
                  },
              ]
            : []),
        ...(available.bonusTile !== false
            ? [
                  {
                      id: 'bonus',
                      icon: 'bonus' as const,
                      label: t('bonus'),
                      used:
                          !status.bonusAvailable ||
                          status.skipped ||
                          !available.bonus ||
                          pending,
                      run: actions.bonus,
                  },
              ]
            : []),
        ...(available.gear
            ? [
                  {
                      id: 'gear',
                      icon: 'gear' as const,
                      label: t('gear'),
                      used: !status.bonusAvailable || status.skipped || pending,
                      run: actions.gear,
                  },
              ]
            : []),
        ...(turn.strikeAndReturn.available
            ? [
                  {
                      id: 'strikeAndReturn',
                      icon: 'strikeAndReturn' as const,
                      label: t('strikeAndReturn'),
                      used: pending,
                      run: actions.strikeAndReturn ?? turn.strikeAndReturn.run,
                  },
              ]
            : []),
    ];

    const keyed = tiles.filter((tile) => tile.run);

    useActionHotkeys({
        enabled: hotkeys?.enabled ?? false,
        close: hotkeys?.close ?? (() => undefined),
        items: keyed.map((tile) => ({
            key: tile.id,
            run: () => tile.run?.(),
            disabled: tile.used,
        })),
    });

    return (
        <>
            <div data-tour="battle.turn-controls" className="pt-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {tiles.map((tile) => {
                        const index = keyed.indexOf(tile);

                        return (
                            <Tile
                                key={tile.id}
                                icon={tile.icon}
                                label={tile.label}
                                hotkey={
                                    index >= 0 && index < 9
                                        ? index + 1
                                        : undefined
                                }
                                used={tile.used}
                                primary={tile.primary}
                                onClick={tile.run}
                            />
                        );
                    })}
                </div>
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
