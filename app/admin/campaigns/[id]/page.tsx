import { notFound } from 'next/navigation';

import { CampaignClient } from './campaign-client';

import { adminKeys } from '@/lib/hooks/admin';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { getAdminCampaignSummary } from '@/lib/server/admin/campaign-summary';
import { assertAdmin } from '@/lib/server/admin/page-guard';

export default async function AdminCampaignPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await assertAdmin();

    const { id } = await params;

    const summary = await getAdminCampaignSummary(id);

    if (!summary) notFound();

    return (
        <PrefetchedQuery queryKey={adminKeys.campaign(id)} data={summary}>
            <CampaignClient id={id} />
        </PrefetchedQuery>
    );
}
