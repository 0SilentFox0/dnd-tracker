import { redirect } from 'next/navigation';

import { PlayerDraftForm } from '@/components/characters/player-draft/PlayerDraftForm';
import { systemUiOf } from '@/components/systems';
import { CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { systemScope } from '@/lib/i18n/system-scope';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function NewPlayerCharacterPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ generate?: string }>;
}) {
    const [{ id }, { generate }] = await Promise.all([params, searchParams]);

    const { userId, isDM, campaign } = await requireCampaignMember(id);

    if (isDM) redirect(`/campaigns/${id}/dm/characters/new?type=player`);

    const existing = await prisma.character.findFirst({
        where: {
            campaignId: id,
            controlledBy: userId,
            type: CharacterType.PLAYER,
        },
        select: { id: true },
    });

    if (existing) redirect(`/campaigns/${id}/character`);

    const systemKey = parseRules(campaign.rules).system.key;

    const DraftForm = systemUiOf(systemKey).DraftForm;

    if (DraftForm) {
        return (
            <ExtendLocaleScope namespaces={systemScope(systemKey, 'draft')}>
                <DraftForm campaignId={id} />
            </ExtendLocaleScope>
        );
    }

    return (
        <PlayerDraftForm
            campaignId={id}
            initial={generate === '1' ? 'generate' : undefined}
        />
    );
}
