import { redirect } from 'next/navigation';

import { PlayerDraftForm } from '@/components/characters/player-draft/PlayerDraftForm';
import { systemUiOf } from '@/components/systems';
import {
    CharacterStatus,
    CharacterType,
    type GoalKind,
} from '@/lib/constants/characters';
import { HERO_ARCHETYPE_KEYS } from '@/lib/constants/hero-archetypes';
import { prisma } from '@/lib/db';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { systemScope } from '@/lib/i18n/system-scope';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { draftEditInitial } from '@/lib/server/characters/choices/draft-initial';
import { validateAbilityScores } from '@/lib/utils/characters/generate';
import { parseRules } from '@/lib/utils/rules/schema';
import type { DraftInput } from '@/types/characters';

export default async function PlayerDraftPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { userId, campaign } = await requireCampaignMember(id);

    const c = await prisma.character.findFirst({
        where: {
            campaignId: id,
            controlledBy: userId,
            type: CharacterType.PLAYER,
            status: CharacterStatus.PENDING,
        },
        select: {
            id: true,
            name: true,
            race: true,
            class: true,
            classes: true,
            archetype: true,
            alignment: true,
            background: true,
            avatar: true,
            strength: true,
            dexterity: true,
            constitution: true,
            intelligence: true,
            wisdom: true,
            charisma: true,
            primaryAbility: true,
            goals: true,
            campaignId: true,
            backgroundId: true,
            backgroundChoices: true,
            backgroundFeatPicks: true,
            raceChoices: true,
            feats: true,
        },
    });

    if (!c) redirect(`/campaigns/${id}/character`);

    const rules = parseRules(campaign.rules);

    const DraftForm = systemUiOf(rules.system.key).DraftForm;

    if (DraftForm) {
        const initialIdentity = {
            name: c.name,
            alignment: c.alignment ?? undefined,
            background: c.background ?? undefined,
            avatar: c.avatar ?? undefined,
            goals: (
                (c.goals as Array<{ text: string; kind: GoalKind }> | null) ??
                []
            ).map(({ text, kind }) => ({ text, kind })),
        };

        return (
            <ExtendLocaleScope
                namespaces={systemScope(rules.system, 'draft')}
            >
                <DraftForm
                    campaignId={id}
                    characterId={c.id}
                    initialIdentity={initialIdentity}
                />
            </ExtendLocaleScope>
        );
    }

    const { choices, scores } = await draftEditInitial(c, rules);

    const archetype =
        HERO_ARCHETYPE_KEYS.find((k) => k === c.archetype) ?? 'warrior';

    const initial: DraftInput = {
        name: c.name,
        race: c.race,
        class: c.class,
        classId:
            (Array.isArray(c.classes)
                ? (c.classes as Array<{ classId?: string }>)[0]?.classId
                : undefined) ?? undefined,
        archetype,
        alignment: c.alignment ?? undefined,
        background: c.background ?? undefined,
        avatar: c.avatar ?? undefined,
        method: validateAbilityScores(scores, 'standard')
            ? 'standard'
            : 'pointBuy',
        ...scores,
        ...(choices && { choices }),
        primaryAbility:
            (c.primaryAbility as DraftInput['primaryAbility']) ?? undefined,
        goals: (
            (c.goals as Array<{
                text: string;
                kind: NonNullable<DraftInput['goals']>[number]['kind'];
            }> | null) ?? []
        ).map(({ text, kind }) => ({ text, kind })),
    };

    return (
        <PlayerDraftForm campaignId={id} characterId={c.id} initial={initial} />
    );
}
