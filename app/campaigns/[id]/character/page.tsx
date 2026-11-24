import type { ReactNode } from 'react';

import { CampaignGameShell } from '@/app/campaigns/[id]/campaign-game-shell';
import { CharacterProfile } from '@/components/character-profile';
import { NoCharacterState } from '@/components/characters/player-draft/NoCharacterState';
import { CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { campaignKeys } from '@/lib/hooks/campaigns';
import { characterKeys } from '@/lib/hooks/characters';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { systemScope } from '@/lib/i18n/system-scope';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readCharacterSheet } from '@/lib/server/characters/core/read-sheet';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';
import { readOkJson } from '@/lib/utils/api/read-json';
import { stripPlayerHiddenRules } from '@/lib/utils/rules/player-hidden';
import { parseRules } from '@/lib/utils/rules/schema';
import type { CharacterSheet } from '@/types/characters';

export default async function CharacterPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const [{ id }, { tab }] = await Promise.all([params, searchParams]);

    const access = await requireCampaignMember(id);

    const { userId, isDM, campaign } = access;

    const shell = (content: ReactNode) => (
        <CampaignGameShell
            campaign={campaign}
            viewer={access}
            active="character"
        >
            {content}
        </CampaignGameShell>
    );

    const character = await prisma.character.findFirst({
        where: {
            campaignId: id,
            controlledBy: userId,
            type: CharacterType.PLAYER,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    });

    if (!character) {
        return shell(<NoCharacterState campaignId={id} canCreate={!isDM} />);
    }

    const rules = parseRules(campaign.rules);

    const sheet = await readOkJson<CharacterSheet>(
        await readCharacterSheet({
            id,
            characterId: character.id,
            known: {
                userId,
                isDM,
                maxLevel: campaign.maxLevel,
                rules,
                allowPlayerEdit: campaign.allowPlayerEdit,
            },
        })
    );

    const profile = (
        <PrefetchedQuery
            queryKey={characterKeys.sheet(id, character.id)}
            data={sheet}
        >
            <PrefetchedQuery
                queryKey={campaignKeys.rules(id)}
                data={isDM ? rules : stripPlayerHiddenRules(rules)}
            >
                <CharacterProfile
                    campaignId={id}
                    characterId={character.id}
                    canEdit={isDM}
                    initialTab={tab}
                />
            </PrefetchedQuery>
        </PrefetchedQuery>
    );

    const namespaces = systemScope(await systemOfCampaign(id), 'character');

    return shell(
        namespaces.length ? (
            <ExtendLocaleScope namespaces={namespaces}>
                {profile}
            </ExtendLocaleScope>
        ) : (
            profile
        )
    );
}
