import { notFound } from 'next/navigation';

import { DemoDeckPreview } from './page-client';

import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { getDeck } from '@/lib/server/show/deck-store';

export default async function DemoDeckPreviewPage({
    params,
}: {
    params: Promise<{ id: string; deckId: string }>;
}) {
    const { id, deckId } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    if (!isDemo) notFound();

    const deck = await getDeck(id, deckId);

    if (!deck) notFound();

    return <DemoDeckPreview campaignId={id} deck={deck} />;
}
