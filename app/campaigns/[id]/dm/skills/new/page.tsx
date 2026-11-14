import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { prisma } from '@/lib/db';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function NewSkillPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign } = await requireCampaignDM(id);

    const spells = await prisma.spell.findMany({
        where: { campaignId: id },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <SystemDmPage
            campaignId={id}
            section="skills"
            system={parseRules(campaign.rules).system}
            canEdit
            view={{ type: 'new' }}
            data={{ spells, mainSkills: [] }}
        />
    );
}
