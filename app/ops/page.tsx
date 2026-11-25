import { OpsClient } from './ops-client';

import { opsKeys } from '@/lib/hooks/ops';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { assertOpsAdmin } from '@/lib/server/ops/page-guard';
import { buildSummary } from '@/lib/server/ops/summary';

export default async function OpsPage() {
    await assertOpsAdmin();

    const summary = await buildSummary();

    return (
        <PrefetchedQuery queryKey={opsKeys.summary()} data={summary}>
            <OpsClient />
        </PrefetchedQuery>
    );
}
