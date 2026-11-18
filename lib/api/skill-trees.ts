import { campaignGet } from '@/lib/api/client';
import type { SkillTreeRow } from '@/types/skills';

export async function getSkillTrees(
    campaignId: string
): Promise<SkillTreeRow[]> {
    return campaignGet<SkillTreeRow[]>(campaignId, '/skill-trees');
}
