import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import '@/lib/server/systems/registry';
import { SectionLoading } from '@/components/common/states/SectionLoading';
import { CampaignSystemGate } from '@/components/systems/CampaignSystemGate';
import { systemSelectionOfCampaign } from '@/lib/server/systems/campaign-system';

/** Layout for client-heavy subtrees: lookups below need the campaign composition installed in the browser */
export default async function SystemLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const t = await getTranslations('common');

    return (
        <CampaignSystemGate
            campaignId={id}
            system={await systemSelectionOfCampaign(id)}
            fallback={<SectionLoading label={t('loading.generic')} />}
        >
            {children}
        </CampaignSystemGate>
    );
}
