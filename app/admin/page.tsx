import { OverviewClient } from './overview-client';

import { adminKeys } from '@/lib/hooks/admin';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { buildOverview } from '@/lib/server/admin/overview';
import { assertAdmin } from '@/lib/server/admin/page-guard';

export default async function AdminOverviewPage() {
    await assertAdmin();

    const overview = await buildOverview('30d');

    return (
        <PrefetchedQuery queryKey={adminKeys.overview('30d')} data={overview}>
            <OverviewClient />
        </PrefetchedQuery>
    );
}
