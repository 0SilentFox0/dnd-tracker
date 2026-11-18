import { campaignPatch } from '@/lib/api/client';
import type { RawTree } from '@/lib/utils/skills/progression';

export async function updateSkillTree(params: {
    campaignId: string;
    treeId: string;
    race: string;
    skills: RawTree;
}): Promise<{ id: string; race: string; skills: RawTree }> {
    return campaignPatch(params.campaignId, `/skill-trees/${params.treeId}`, {
        race: params.race,
        skills: params.skills,
    });
}
