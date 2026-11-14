import { MapEditorPageClient } from './page-client';

import { requireMapLibrary } from '@/lib/server/campaigns/access';

export default async function DMMapEditorPage({
    params,
}: {
    params: Promise<{ id: string; mapId: string }>;
}) {
    const { id, mapId } = await params;

    await requireMapLibrary(id);

    return <MapEditorPageClient campaignId={id} mapId={mapId} />;
}
