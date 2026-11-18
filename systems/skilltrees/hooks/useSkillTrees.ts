import { useQuery } from '@tanstack/react-query';

import { getSkillTrees } from '../api/skill-trees';

import { skillKeys } from '@/lib/hooks/skills';

export function useSkillTrees(campaignId: string) {
    return useQuery({
        queryKey: skillKeys.trees(campaignId),
        queryFn: () => getSkillTrees(campaignId),
        enabled: !!campaignId,
    });
}
