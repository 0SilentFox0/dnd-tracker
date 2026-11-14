import { notFound } from 'next/navigation';

import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { prisma } from '@/lib/db';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { readAbilities } from '@/lib/utils/abilities/read';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function EditArtifactSetPage({
    params,
}: {
    params: Promise<{ id: string; setId: string }>;
}) {
    const { id, setId } = await params;

    const { campaign } = await requireCampaignDM(id);

    const setRow = await prisma.artifactSet.findFirst({
        where: { id: setId, campaignId: id },
        include: {
            artifacts: { select: { id: true } },
        },
    });

    if (!setRow) {
        notFound();
    }

    const initialArtifactIds = setRow.artifacts.map((a) => a.id);

    const { abilities, issues } = readAbilities('artifactSet', setRow);

    const bonus = (setRow.setBonus ?? {}) as {
        name?: unknown;
        description?: unknown;
    };

    return (
        <SystemDmPage
            campaignId={id}
            section="artifact-sets"
            system={parseRules(campaign.rules).system}
            canEdit
            view={{ type: 'edit', id: setId }}
            data={{
                name: setRow.name,
                setId: setRow.id,
                initial: {
                    name: setRow.name,
                    description: setRow.description,
                    icon: setRow.icon,
                    setBonus: {
                        name:
                            typeof bonus.name === 'string'
                                ? bonus.name
                                : undefined,
                        description:
                            typeof bonus.description === 'string'
                                ? bonus.description
                                : undefined,
                    },
                    abilities,
                    abilityIssues: issues,
                    artifactIds: initialArtifactIds,
                },
            }}
        />
    );
}
