'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudSection } from '@/components/hud/form';
import { HudCard, HudPanel, HudPill } from '@/components/hud/page';
import type { DmDashboardData } from '@/types/campaigns';

export function DmPartyCard({
    campaignId,
    party,
}: {
    campaignId: string;
    party: DmDashboardData['party'];
}) {
    const t = useTranslations('dashboard');

    if (party.length === 0) return null;

    const averageLevel = Number(
        (party.reduce((total, hero) => total + hero.level, 0) / party.length).toFixed(
            1
        )
    );

    return (
        <HudPanel data-tour="dashboard.party">
            <HudSection
                header={
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">
                            {t('party.title')}
                        </h2>
                        <p className="flex items-center gap-3 text-xs text-hud-muted">
                            {t('party.summary', {
                                count: party.length,
                                averageLevel,
                            })}
                            <Link
                                href={`/campaigns/${campaignId}/dm/characters`}
                                className="font-medium text-hud-gold underline-offset-4 hover:underline"
                            >
                                {t('party.all')}
                            </Link>
                        </p>
                    </div>
                }
            >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3 min-[1800px]:grid-cols-[repeat(auto-fill,minmax(21rem,1fr))]">
                    {party.map((hero) => {
                        const initial = hero.name.trim().charAt(0).toUpperCase();

                        const fallback = (
                            <span
                                className="flex size-14 items-center justify-center rounded-full border-2 border-hud-gold bg-hud-raised text-xl text-hud-ink"
                                aria-hidden
                            >
                                {initial}
                            </span>
                        );

                        return (
                            <HudCard
                                asChild
                                key={hero.id}
                                className="grid min-w-0 gap-3 p-3.5 transition-colors hover:border-hud-muted hover:bg-hud-raised"
                            >
                                <Link
                                    href={`/campaigns/${campaignId}/dm/characters/${hero.id}`}
                                >
                                    <span className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3">
                                        <span className="relative size-14">
                                            {hero.avatar ? (
                                                <OptimizedImage
                                                    src={hero.avatar}
                                                    alt=""
                                                    width={56}
                                                    height={56}
                                                    className="size-14 rounded-full border-2 border-hud-gold object-cover"
                                                    fallback={fallback}
                                                />
                                            ) : (
                                                fallback
                                            )}
                                            <span className="absolute -bottom-1 -right-1.5 grid size-6 place-items-center rounded-full border border-hud-gold bg-hud-page text-xs font-bold text-hud-gold ring-2 ring-hud-page">
                                                {hero.level}
                                            </span>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="hud-sc block break-words text-[15px] leading-tight text-hud-ink">
                                                {hero.name}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[13px] text-hud-muted">
                                                {[hero.race, hero.class]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="flex flex-wrap gap-1.5">
                                        <HudPill tone="muted">
                                            {t('hero.armorClass', {
                                                value: hero.armorClass,
                                            })}
                                        </HudPill>
                                        <HudPill tone="muted">
                                            {t('hero.speed', {
                                                value: hero.speed,
                                            })}
                                        </HudPill>
                                    </span>
                                </Link>
                            </HudCard>
                        );
                    })}
                </div>
            </HudSection>
        </HudPanel>
    );
}
