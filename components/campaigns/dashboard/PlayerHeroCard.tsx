'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HeroHp } from '@/components/campaigns/dashboard/HeroHp';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudPill } from '@/components/hud/page';
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
            <section
                className="border-hud-rule border-b pb-4"
                data-tour="dashboard.hero"
            >
                <div className="border-hud-rule bg-hud-page/35 rounded-lg border border-dashed p-4 sm:p-5">
                    <p className="text-hud-ink">{t('none')}</p>
                    <Button asChild className="mt-3 w-full sm:w-auto">
                        <Link href={`${base}/character`}>{t('create')}</Link>
                    </Button>
                </div>
            </section>
        );
    }

    const pending = hero.status === CharacterStatus.PENDING;

    const initial = (
        <span
            className="bg-hud-rule text-hud-ink flex size-[88px] shrink-0 items-center justify-center rounded-full text-2xl"
            aria-hidden
        >
            {hero.name.trim().charAt(0).toUpperCase()}
        </span>
    );

    return (
        <section
            className="border-hud-rule border-b pb-4"
            data-tour="dashboard.hero"
        >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                {hero.avatar ? (
                    <OptimizedImage
                        src={hero.avatar}
                        alt={hero.name}
                        width={88}
                        height={88}
                        className="border-hud-line size-[88px] shrink-0 rounded-full border-2 object-cover shadow-[0_0_0_4px_var(--color-hud-page)]"
                        fallback={initial}
                    />
                ) : (
                    <span className="border-hud-line rounded-full border-2 shadow-[0_0_0_4px_var(--color-hud-page)]">
                        {initial}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="hud-sc text-hud-ink break-words text-xl sm:text-2xl">
                        {hero.name}
                    </h2>
                    <p className="text-hud-muted truncate text-sm">
                        {hero.race}
                        {system &&
                            statColumnsOf(system).has('classes') &&
                            ` · ${hero.class}`}
                    </p>
                    <p className="text-hud-muted text-xs">
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
                    <HudPill tone="meta">{t('pending')}</HudPill>
                )}
                {pending && hero.reviewNote && (
                    <HudPill tone="accent">{t('returned')}</HudPill>
                )}
                {hero.seenLevel != null && hero.seenLevel < hero.level && (
                    <HudPill tone="accent">{t('newLevel')}</HudPill>
                )}
            </div>
            {pending && hero.reviewNote && (
                <p className="border-hud-rule bg-hud-page/35 text-hud-muted mt-3 break-words rounded-lg border p-3 text-sm">
                    {hero.reviewNote}
                </p>
            )}
            {activeBattle && (
                <div className="border-hud-line bg-hud-page/35 mt-4 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                        <HeroHp hp={activeBattle.hp} />
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href={`${base}/battles/${activeBattle.battleId}`}>
                            {t('toBattle')}
                        </Link>
                    </Button>
                </div>
            )}
            <Button
                asChild
                variant="outline"
                className="mt-3 w-full sm:w-auto"
            >
                <Link href={`${base}/character`}>{t('open')}</Link>
            </Button>
        </section>
    );
}
