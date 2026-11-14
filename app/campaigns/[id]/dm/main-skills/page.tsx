import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { prisma } from '@/lib/db';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function DMMainSkillsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign } = await requireCampaignDM(id);

    const mainSkills = await prisma.mainSkill.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'asc' },
    });

    return (
        <SystemDmPage
            campaignId={id}
            section="main-skills"
            system={parseRules(campaign.rules).system}
            canEdit
            data={mainSkills.map((skill) => ({
                ...skill,
                createdAt: skill.createdAt.toISOString(),
                updatedAt: skill.updatedAt.toISOString(),
            }))}
        />
    );
}
