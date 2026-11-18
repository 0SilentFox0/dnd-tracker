import { useQuery } from '@tanstack/react-query';

import { getSkillTrees } from '@/lib/api/skill-trees';
import { skillKeys } from '@/lib/hooks/skills/keys';

export function useSkillTrees(campaignId: string) {
    return useQuery({
        queryKey: skillKeys.trees(campaignId),
        queryFn: () => getSkillTrees(campaignId),
        enabled: !!campaignId,
    });
}
