import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import 'server-only';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';
import { dmSectionsOf } from '@/lib/utils/rules/systems/catalog';

/** Layout for a DM page owned by a module: 404 unless the campaign's composition declares the section */
export const dmSectionLayout = (section: string) =>
    async function DmSectionLayout({
        children,
        params,
    }: {
        children: ReactNode;
        params: Promise<{ id: string }>;
    }): Promise<ReactNode> {
        const { id } = await params;

        const { campaign } = await requireCampaignDMOrDemo(id);

        if (!dmSectionsOf(parseRules(campaign.rules).system).has(section))
            notFound();

        return children;
    };
