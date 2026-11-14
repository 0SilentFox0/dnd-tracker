import { MapsPageClient } from './page-client';

import { requireMapLibrary } from '@/lib/server/campaigns/access';

export default async function DMMapsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await requireMapLibrary(id);

    return <MapsPageClient campaignId={id} />;
}
