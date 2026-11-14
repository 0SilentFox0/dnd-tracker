import type { ReactNode } from 'react';

import '@/lib/server/systems/registry';
import { CampaignSystemGate } from '@/components/systems/CampaignSystemGate';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';
import { isRuleSystemKey } from '@/lib/utils/rules/systems/meta';

/** Layout for client-heavy subtrees: lookups below need the campaign composition installed in the browser */
export default async function SystemLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const raw = await systemOfCampaign(id);

    const system =
        raw?.key && isRuleSystemKey(raw.key)
            ? { key: raw.key, modules: raw.modules }
            : null;

    return (
        <CampaignSystemGate campaignId={id} system={system}>
            {children}
        </CampaignSystemGate>
    );
}
