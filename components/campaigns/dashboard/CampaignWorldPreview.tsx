'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import type { DmDashboardData } from '@/types/campaigns';

export function CampaignWorldPreview({
    campaignId,
    worldMap,
}: {
    campaignId: string;
    worldMap: DmDashboardData['worldMap'];
}) {
    const t = useTranslations('common');

    const tDashboard = useTranslations('dashboard');

    const href = `/campaigns/${campaignId}/dm/world`;

    return (
        <HudPanel className="flex flex-col" data-tour="dashboard.world-map">
            <h2 className="hud-sc mb-3 flex items-baseline justify-between gap-2 text-[13px] tracking-[.06em] text-hud-gold">
                <span>{t('gameNavigation.world')}</span>
                {worldMap && (
                    <span className="max-w-[65%] truncate text-xs font-normal tracking-normal text-hud-muted">
                        {worldMap.name}
                    </span>
                )}
            </h2>
            {worldMap ? (
                <Link
                    href={href}
                    aria-label={`${t('gameNavigation.world')}: ${worldMap.name}`}
                    className="relative block min-h-44 flex-1 overflow-hidden rounded-lg border border-hud-rule"
                >
                    <OptimizedImage
                        src={worldMap.imageUrl}
                        alt=""
                        width={900}
                        height={520}
                        className="absolute inset-0 size-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        fallback={
                            <span className="flex h-48 items-center justify-center bg-hud-raised text-sm text-hud-muted">
                                {worldMap.name}
                            </span>
                        }
                    />
                </Link>
            ) : (
                <div className="flex min-h-44 flex-1 items-center justify-center rounded-lg border border-dashed border-hud-rule bg-hud-page/30 px-4 text-center text-sm text-hud-muted">
                    {tDashboard('page.worldMap.empty')}
                </div>
            )}
            <Button asChild variant="outline" className="mt-3 min-h-11 w-full">
                <Link href={href}>
                    {worldMap
                        ? t('gameNavigation.world')
                        : tDashboard('page.worldMap.create')}
                </Link>
            </Button>
        </HudPanel>
    );
}
