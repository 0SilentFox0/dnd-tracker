import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function NewArtifactSetPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign } = await requireCampaignDM(id);

    return (
        <SystemDmPage
            campaignId={id}
            section="artifact-sets"
            system={parseRules(campaign.rules).system}
            canEdit
            view={{ type: 'new' }}
        />
    );
}
