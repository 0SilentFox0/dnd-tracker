import { notFound } from 'next/navigation';

import { ScenarioPageClient } from './page-client';

import { isAiConfigured } from '@/lib/ai/crypto';
import { scenarioKeys } from '@/lib/hooks/scenario';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { loadPlayedSections } from '@/lib/server/scenario/page-store';
import { getScenarioPageHandler } from '@/lib/server/scenario/read-scenario';
import { readOkJson } from '@/lib/utils/api/read-json';
import { revealTargets } from '@/lib/utils/scenario/reveal';
import type { ScenarioPage } from '@/types/scenario';

export default async function DMScenarioPageRoute({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; pageId: string }>;
    searchParams: Promise<{ edit?: string }>;
}) {
    const { id, pageId } = await params;

    const { edit } = await searchParams;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    const response = await getScenarioPageHandler(id, pageId);

    if (response.status === 404) notFound();

    const page = await readOkJson<ScenarioPage>(response);

    const playedPages = page
        ? await loadPlayedSections(id, [
              ...new Set(
                  revealTargets(page.content.sections).map((t) => t.pageId)
              ),
          ])
        : [];

    return (
        <PrefetchedQuery queryKey={scenarioKeys.page(id, pageId)} data={page}>
            <ScenarioPageClient
                campaignId={id}
                pageId={pageId}
                playedPages={playedPages}
                aiEnabled={!isDemo && isAiConfigured()}
                canEdit={!isDemo}
                isDemo={isDemo}
                startEditing={edit === '1'}
            />
        </PrefetchedQuery>
    );
}
