'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudPanel } from '@/components/hud/page';
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

    return (
        <Link
            href={`/campaigns/${campaignId}/dm/world`}
            aria-label={worldMap ? `${t('gameNavigation.world')}: ${worldMap.name}` : t('gameNavigation.world')}
            className="group block h-full rounded-xl outline-offset-2 focus-visible:outline-2"
        >
            <HudPanel
                className="flex h-full flex-col transition-colors group-hover:border-hud-muted"
                data-tour="dashboard.world-map"
            >
                <h2 className="hud-sc mb-3 flex items-baseline justify-between gap-2 text-[13px] tracking-[.06em] text-hud-ink">
                    <span>{t('gameNavigation.world')}</span>
                    {worldMap && (
                        <span className="max-w-[65%] truncate text-xs font-normal tracking-normal text-hud-muted">
                            {worldMap.name}
                        </span>
                    )}
                </h2>
                {worldMap ? (
                    <div className="relative min-h-44 flex-1 overflow-hidden rounded-lg border border-hud-rule">
                        <OptimizedImage
                            src={worldMap.imageUrl}
                            alt=""
                            width={900}
                            height={520}
                            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            fallback={
                                <span className="flex h-full items-center justify-center bg-hud-raised text-sm text-hud-muted">
                                    {worldMap.name}
                                </span>
                            }
                        />
                    </div>
                ) : (
                    <div className="flex min-h-44 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hud-rule bg-hud-page/30 px-4 text-center text-sm text-hud-muted">
                        <span>{tDashboard('page.worldMap.empty')}</span>
                        <span className="font-medium text-hud-ink">
                            {tDashboard('page.worldMap.create')}
                        </span>
                    </div>
                )}
            </HudPanel>
        </Link>
    );
}
