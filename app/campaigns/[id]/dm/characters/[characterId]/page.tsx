import { CharacterProfile } from '@/components/character-profile';
import { campaignKeys } from '@/lib/hooks/campaigns/keys';
import { characterKeys } from '@/lib/hooks/characters/keys';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { systemScope } from '@/lib/i18n/system-scope';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { loadRules } from '@/lib/server/campaigns/rules';
import { readCharacterSheet } from '@/lib/server/characters/core/read-sheet';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';
import { readOkJson } from '@/lib/utils/api/read-json';
import type { CharacterSheet } from '@/types/characters';

export default async function DmCharacterPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; characterId: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const [{ id, characterId }, { tab }] = await Promise.all([
        params,
        searchParams,
    ]);

    const { isDemo, campaign, userId } = await requireCampaignDMOrDemo(id);

    const rules = await loadRules(id);

    const sheet = await readOkJson<CharacterSheet>(
        await readCharacterSheet({
            id,
            characterId,
            ...(isDemo
                ? {
                      known: {
                          userId,
                          isDM: true,
                          maxLevel: campaign.maxLevel,
                          rules,
                          allowPlayerEdit: false,
                      },
                  }
                : {}),
        })
    );

    const profile = (
        <PrefetchedQuery
            queryKey={characterKeys.sheet(id, characterId)}
            data={sheet}
        >
            <PrefetchedQuery queryKey={campaignKeys.rules(id)} data={rules}>
                <CharacterProfile
                    campaignId={id}
                    characterId={characterId}
                    canEdit={!isDemo}
                    initialTab={tab}
                />
            </PrefetchedQuery>
        </PrefetchedQuery>
    );

    const namespaces = systemScope(await systemOfCampaign(id), 'dmCharacter');

    return namespaces.length ? (
        <ExtendLocaleScope namespaces={namespaces}>{profile}</ExtendLocaleScope>
    ) : (
        profile
    );
}
