import { RulesForm } from '@/components/rules/RulesForm';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function DMRulesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    return (
        <RulesForm
            campaignId={id}
            initial={isDemo ? parseRules(campaign.rules) : undefined}
        />
    );
}
