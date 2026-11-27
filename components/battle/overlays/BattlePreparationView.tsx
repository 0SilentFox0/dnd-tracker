'use client';

import { useTranslations } from 'next-intl';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton } from '@/components/hud';
import { ParticipantSide } from '@/lib/constants/battle';
import type { PrepRoster } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

interface BattlePreparationViewProps {
    alliesCount: number;
    enemiesCount: number;
    isDM: boolean;
    onStartBattle: () => void;
    isStarting: boolean;
    canStart?: boolean;
    roster?: PrepRoster | null;
}

function TeamList({
    side,
    entries,
}: {
    side: ParticipantSide;
    entries: PrepRoster[ParticipantSide];
}) {
    const t = useTranslations('battle.prep');

    if (entries.length === 0) return null;

    return (
        <ul
            data-testid={`prep-team-${side}`}
            aria-label={t(
                side === ParticipantSide.ALLY ? 'teamAllies' : 'teamEnemies'
            )}
            className="flex flex-wrap justify-center gap-2"
        >
            {entries.map((e) => (
                <li
                    key={e.id}
                    className="flex w-20 flex-col items-center gap-1 text-xs"
                >
                    <EntityIcon
                        src={e.avatar}
                        name={e.name}
                        size={80}
                        className={cn(
                            'size-14 rounded-lg bg-black/30 ring-1',
                            side === ParticipantSide.ALLY
                                ? 'ring-hud-accent'
                                : 'ring-hud-crimson'
                        )}
                    />
                    <span className="w-full truncate">
                        {e.name}
                        {e.quantity > 1 && (
                            <span className="ml-1 text-hud-muted">
                                ×{e.quantity}
                            </span>
                        )}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function BattlePreparationView({
    alliesCount,
    enemiesCount,
    isDM,
    onStartBattle,
    isStarting,
    canStart = true,
    roster = null,
}: BattlePreparationViewProps) {
    const t = useTranslations('battle.prep');

    const ts = useTranslations('battle.sides');

    return (
        <div className="relative flex flex-1 animate-in flex-col items-center justify-center space-y-12 p-6 text-center duration-1000 fade-in">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

            <div
                data-tour="battle.arena"
                className="relative z-10 w-full max-w-2xl animate-in space-y-8 duration-300 slide-in-from-bottom-5 fade-in"
            >
                <div className="space-y-4">
                    <span className="hud-sc inline-flex h-8 items-center border-y border-hud-line bg-hud-panel-2 px-5 text-sm tracking-[.2em] text-hud-ink">
                        {t('badge')}
                    </span>
                    <h2 className="hud-sc text-4xl font-extrabold tracking-[.12em] text-[var(--ink)] drop-shadow-2xl sm:text-7xl">
                        {t('title')}
                    </h2>
                    <p className="hud-book mx-auto max-w-lg text-lg leading-relaxed text-hud-soft italic sm:text-2xl">
                        {t('tagline')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    {[
                        {
                            side: ParticipantSide.ALLY,
                            label: ts('allies'),
                            value: alliesCount,
                            color: 'text-[#8fb0d0]',
                        },
                        {
                            side: ParticipantSide.ENEMY,
                            label: ts('enemies'),
                            value: enemiesCount,
                            color: 'text-hud-danger',
                        },
                    ].map((stat) => (
                        <div
                            key={stat.side}
                            className="flex flex-col items-center gap-3 border border-hud-line bg-hud-panel p-4 sm:p-6"
                        >
                            <span className="hud-sc text-[13px] tracking-[.1em] text-[var(--hud-muted)]">
                                {stat.label}
                            </span>
                            <span
                                className={cn(
                                    'hud-sc text-3xl font-extrabold tabular-nums sm:text-4xl',
                                    stat.color
                                )}
                            >
                                {stat.value}
                            </span>
                            {roster && (
                                <TeamList
                                    side={stat.side}
                                    entries={roster[stat.side]}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="pt-4 sm:pt-8">
                    {isDM ? (
                        <HudButton
                            type="button"
                            data-tour="battle.start"
                            className="metal-gold metal-fill hud-sc h-16 w-full text-xl font-extrabold tracking-[.2em] transition-transform active:scale-95 disabled:opacity-70 sm:w-80 sm:text-2xl"
                            onClick={onStartBattle}
                            disabled={isStarting || !canStart}
                        >
                            {isStarting ? t('starting') : t('start')}
                        </HudButton>
                    ) : (
                        <div className="mx-auto inline-block animate-[hud-pulse_2.4s_infinite] border-y border-hud-line bg-black/55 px-6 py-4 text-lg text-hud-text italic sm:px-8 sm:text-xl">
                            {t('waiting')}
                        </div>
                    )}
                    {isDM && !canStart && (
                        <p className="mt-3 text-sm text-[var(--hud-muted)] italic">
                            {t('needOne')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
