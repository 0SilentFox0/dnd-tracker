import { notFound } from 'next/navigation';

import { EditSkillClient } from './edit-skill-client';

import { HudPage, HudPageHeader } from '@/components/hud/page';
import { SkillCard } from '@/components/skills/list/SkillCard';
import { prisma } from '@/lib/db';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { readSkill } from '@/lib/server/skills/read-skills-list';
import type { MainSkill } from '@/types/main-skills';

export default async function EditSkillPage({
    params,
}: {
    params: Promise<{ id: string; skillId: string }>;
}) {
    const { id: campaignId, skillId } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(campaignId);

    if (isDemo) {
        const skill = await readSkill(campaignId, skillId);

        if (!skill) notFound();

        return (
            <HudPage>
                <HudPageHeader
                    title={skill.name}
                    subtitle={skill.spell?.name ?? undefined}
                />
                <div className="max-w-2xl">
                    <SkillCard
                        skill={skill}
                        campaignId={campaignId}
                        printMode
                    />
                </div>
            </HudPage>
        );
    }

    const [spells, mainSkills] = await Promise.all([
        prisma.spell.findMany({
            where: { campaignId },
            select: { id: true, name: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.mainSkill.findMany({
            where: { campaignId },
            orderBy: { name: 'asc' },
        }),
    ]);

    const initialMainSkills: MainSkill[] = mainSkills.map((ms) => ({
        id: ms.id,
        campaignId: ms.campaignId,
        name: ms.name,
        color: ms.color,
        icon: ms.icon ?? null,
        createdAt: ms.createdAt.toISOString(),
        updatedAt: ms.updatedAt.toISOString(),
    }));

    return (
        <EditSkillClient
            campaignId={campaignId}
            skillId={skillId}
            spells={spells}
            initialMainSkills={initialMainSkills}
        />
    );
}
