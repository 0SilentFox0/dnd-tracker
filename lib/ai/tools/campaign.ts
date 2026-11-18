import { defineTool } from './define';
import { readAlias } from './read-alias';

import { campaignBriefInput } from '@/lib/server/assistant/reads/campaign';

export const getCampaignBriefTool = defineTool({
    name: 'get_campaign_brief',
    scopes: ['campaign:read'],
    title: 'Campaign description',
    description:
        "Campaign name, description and the DM's standing instructions (tone, atmosphere, setting rules). Call this first when starting work from an external client.",
    input: campaignBriefInput,
    handler: readAlias('campaign.brief'),
});
