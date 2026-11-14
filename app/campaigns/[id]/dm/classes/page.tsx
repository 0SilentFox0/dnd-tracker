import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function DMClassesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    return (
        <SystemDmPage
            campaignId={id}
            section="classes"
            system={parseRules(campaign.rules).system}
            canEdit={!isDemo}
        />
    );
}
