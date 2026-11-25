'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
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
            aria-label={
                worldMap
                    ? `${t('gameNavigation.world')}: ${worldMap.name}`
                    : t('gameNavigation.world')
            }
            className="group block h-full rounded-xl outline-offset-2 focus-visible:outline-2"
        >
            <section
                className="border-hud-rule group-hover:border-hud-muted flex h-full flex-col border-b pb-4 transition-colors"
                data-tour="dashboard.world-map"
            >
                <h2 className="hud-sc text-hud-ink mb-3 flex items-baseline justify-between gap-2 text-[13px] tracking-[.06em]">
                    <span>{t('gameNavigation.world')}</span>
                    {worldMap && (
                        <span className="text-hud-muted max-w-[65%] truncate text-xs font-normal tracking-normal">
                            {worldMap.name}
                        </span>
                    )}
                </h2>
                {worldMap ? (
                    <div className="border-hud-rule relative min-h-44 flex-1 overflow-hidden rounded-lg border">
                        <OptimizedImage
                            src={worldMap.imageUrl}
                            alt=""
                            width={900}
                            height={520}
                            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            fallback={
                                <span className="bg-hud-raised text-hud-muted flex h-full items-center justify-center text-sm">
                                    {worldMap.name}
                                </span>
                            }
                        />
                    </div>
                ) : (
                    <div className="border-hud-rule bg-hud-page/30 text-hud-muted flex min-h-44 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 text-center text-sm">
                        <span>{tDashboard('page.worldMap.empty')}</span>
                        <span className="text-hud-ink font-medium">
                            {tDashboard('page.worldMap.create')}
                        </span>
                    </div>
                )}
            </section>
        </Link>
    );
}
