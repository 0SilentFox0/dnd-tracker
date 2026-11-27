import '@/components/systems/registry';
import '@/lib/server/systems/registry';
import { NewCharacterForm } from '@/components/characters/NewCharacterForm';
import { systemUiOf } from '@/components/systems';
import { SystemGate } from '@/components/systems/SystemGate';
import {
    CharacterType,
    type CharacterTypeValue,
} from '@/lib/constants/characters';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function NewCharacterPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ type?: string }>;
}) {
    const { id } = await params;

    const { type } = await searchParams;

    const { campaign } = await requireCampaignDM(id);

    const characterType: CharacterTypeValue =
        type === CharacterType.NPC_HERO
            ? CharacterType.NPC_HERO
            : CharacterType.PLAYER;

    const { system } = parseRules(campaign.rules);

    const DraftForm = systemUiOf(system.key).DraftForm;

    if (DraftForm) {
        return (
            <SystemGate system={system}>
                <DraftForm campaignId={id} dm={{ characterType }} />
            </SystemGate>
        );
    }

    return (
        <NewCharacterForm
            campaignId={id}
            characterType={characterType}
            systemKey={system.key}
        />
    );
}
