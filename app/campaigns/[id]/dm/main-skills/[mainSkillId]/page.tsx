import { notFound } from 'next/navigation';

import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { prisma } from '@/lib/db';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function EditMainSkillPage({
    params,
}: {
    params: Promise<{ id: string; mainSkillId: string }>;
}) {
    const { id, mainSkillId } = await params;

    const { campaign } = await requireCampaignDM(id);

    const mainSkill = await prisma.mainSkill.findFirst({
        where: { id: mainSkillId, campaignId: id },
    });

    if (!mainSkill) {
        notFound();
    }

    return (
        <SystemDmPage
            campaignId={id}
            section="main-skills"
            system={parseRules(campaign.rules).system}
            canEdit
            view={{ type: 'edit', id: mainSkillId }}
            data={{
                ...mainSkill,
                createdAt: mainSkill.createdAt.toISOString(),
                updatedAt: mainSkill.updatedAt.toISOString(),
            }}
        />
    );
}
