import type { ReactNode } from 'react';

import '@/lib/server/systems/registry';
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

    return (
        <CampaignSystemGate
            campaignId={id}
            system={await systemSelectionOfCampaign(id)}
        >
            {children}
        </CampaignSystemGate>
    );
}
