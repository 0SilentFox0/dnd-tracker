import { notFound } from 'next/navigation';

import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';
import { dmSectionsOf } from '@/lib/utils/rules/systems/catalog';

export default async function DMSystemSectionPage({
    params,
}: {
    params: Promise<{ id: string; section: string }>;
}) {
    const { id, section } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const { system } = parseRules(campaign.rules);

    if (!dmSectionsOf(system).has(section)) notFound();

    return (
        <SystemDmPage
            campaignId={id}
            section={section}
            system={system}
            canEdit={!isDemo}
        />
    );
}
