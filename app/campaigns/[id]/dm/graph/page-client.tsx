'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';

const ScenarioGraph = dynamic(
    () => import('@/components/scenario/graph').then((m) => m.ScenarioGraph),
    { ssr: false, loading: () => <LoadingState /> }
);

export function GraphPageClient({
    campaignId,
    campaignName,
    canEdit = true,
}: {
    campaignId: string;
    campaignName: string;
    canEdit?: boolean;
}) {
    const t = useTranslations('dashboard.sections.graph');

    return (
        <HudPage className="max-w-[1800px]">
            <HudPageHeader title={t('title')} subtitle={campaignName} />
            {canEdit && <OnboardingHint id="dm.graph" />}
            <ScenarioGraph campaignId={campaignId} />
        </HudPage>
    );
}
