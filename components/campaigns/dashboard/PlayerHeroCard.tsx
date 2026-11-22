'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HeroHp } from '@/components/campaigns/dashboard/HeroHp';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudPanel, HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { CharacterStatus } from '@/lib/constants/characters';
import { useRuleSystem } from '@/lib/hooks/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';
import type { PlayerDashboardData } from '@/types/campaigns';

export function PlayerHeroCard({
    campaignId,
    data,
}: {
    campaignId: string;
    data: PlayerDashboardData;
}) {
    const t = useTranslations('dashboard.hero');

    const { system } = useRuleSystem({ campaignId });

    const base = `/campaigns/${campaignId}`;

    const { hero, activeBattle } = data;

    if (!hero) {
        return (
            <HudPanel
                className="border-hud-gold/45 shadow-[inset_0_0_0_1px_var(--color-hud-edge)]"
                data-tour="dashboard.hero"
            >
                <div className="rounded-lg border border-dashed border-hud-rule bg-hud-page/35 p-4 sm:p-5">
                    <p className="text-hud-ink">{t('none')}</p>
                    <Button asChild className="mt-3 min-h-11 w-full sm:w-auto">
                        <Link href={`${base}/character`}>{t('create')}</Link>
                    </Button>
                </div>
            </HudPanel>
        );
    }

    const pending = hero.status === CharacterStatus.PENDING;

    const initial = (
        <span
            className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-hud-rule text-2xl text-hud-ink"
            aria-hidden
        >
            {hero.name.trim().charAt(0).toUpperCase()}
        </span>
    );

    return (
        <HudPanel
            className="border-hud-gold/50 shadow-[inset_0_0_0_1px_var(--color-hud-edge)]"
            data-tour="dashboard.hero"
        >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                {hero.avatar ? (
                    <OptimizedImage
                        src={hero.avatar}
                        alt={hero.name}
                        width={88}
                        height={88}
                        className="size-[88px] shrink-0 rounded-full border-2 border-hud-gold object-cover shadow-[0_0_0_4px_var(--color-hud-page)]"
                        fallback={initial}
                    />
                ) : (
                    <span className="rounded-full border-2 border-hud-gold shadow-[0_0_0_4px_var(--color-hud-page)]">
                        {initial}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="hud-sc break-words text-xl text-hud-ink sm:text-2xl">
                        {hero.name}
                    </h2>
                    <p className="truncate text-sm text-hud-muted">
                        {hero.race}
                        {system &&
                            statColumnsOf(system).has('classes') &&
                            ` · ${hero.class}`}
                    </p>
                    <p className="text-xs text-hud-muted">
                        {t('stats', {
                            level: hero.level,
                            armorClass: hero.armorClass,
                            speed: hero.speed,
                        })}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {pending && !hero.reviewNote && (
                    <HudPill tone="muted">{t('pending')}</HudPill>
                )}
                {pending && hero.reviewNote && (
                    <HudPill tone="accent">{t('returned')}</HudPill>
                )}
                {hero.seenLevel != null && hero.seenLevel < hero.level && (
                    <HudPill tone="gold">{t('newLevel')}</HudPill>
                )}
            </div>
            {pending && hero.reviewNote && (
                <p className="mt-3 rounded-lg border border-hud-rule bg-hud-page/35 p-3 text-sm break-words text-hud-muted">
                    {hero.reviewNote}
                </p>
            )}
            {activeBattle && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-hud-gold/35 bg-hud-page/35 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                        <HeroHp hp={activeBattle.hp} />
                    </div>
                    <Button asChild className="min-h-11 w-full sm:w-auto">
                        <Link href={`${base}/battles/${activeBattle.battleId}`}>
                            {t('toBattle')}
                        </Link>
                    </Button>
                </div>
            )}
            <Button
                asChild
                variant="outline"
                className="mt-3 min-h-11 w-full sm:w-auto"
            >
                <Link href={`${base}/character`}>{t('open')}</Link>
            </Button>
        </HudPanel>
    );
}
