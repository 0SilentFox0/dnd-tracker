import { DMCharactersClient } from './page-client';

import { CharacterType } from '@/lib/constants/characters';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { systemScope } from '@/lib/i18n/system-scope';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';

export default async function DMCharactersPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ type?: string }>;
}) {
    const { id } = await params;

    const { type } = await searchParams;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const client = (
        <DMCharactersClient
            campaignId={id}
            maxLevel={campaign.maxLevel}
            type={
                type === CharacterType.PLAYER || type === CharacterType.NPC_HERO
                    ? type
                    : undefined
            }
            canEdit={!isDemo}
        />
    );

    const namespaces = systemScope(
        await systemOfCampaign(id),
        'dmCharacters'
    );

    return namespaces.length ? (
        <ExtendLocaleScope namespaces={namespaces}>{client}</ExtendLocaleScope>
    ) : (
        client
    );
}
