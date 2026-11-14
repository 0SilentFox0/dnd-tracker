'use client';

import type { ReactNode } from 'react';

import { SystemGate } from '@/components/systems/SystemGate';
import { useCampaignSystemSelection } from '@/lib/hooks/campaigns';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

/** Gates a campaign subtree on its own composition; loaded rules override the server-seeded `system`, `null` (no campaign access) renders the children as is */
export function CampaignSystemGate({
    campaignId,
    system,
    fallback,
    children,
}: {
    campaignId: string;
    system: SystemSelection | null;
    fallback?: ReactNode;
    children: ReactNode;
}) {
    const live = useCampaignSystemSelection(campaignId);

    const selection = live ?? system;

    if (!selection) return children;

    return (
        <SystemGate system={selection} fallback={fallback}>
            {children}
        </SystemGate>
    );
}
