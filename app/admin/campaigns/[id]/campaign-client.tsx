'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { CampaignSummary } from '@/components/admin/CampaignSummary';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { useAdminCampaign } from '@/lib/hooks/admin';

export function CampaignClient({ id }: { id: string }) {
    const t = useTranslations('admin');

    const router = useRouter();

    const query = useAdminCampaign(id);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    onClick={() => router.back()}
                >
                    {t('campaign.back')}
                </HudButton>
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('common.refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(data) => <CampaignSummary data={data} />}
            </QueryState>
        </div>
    );
}
