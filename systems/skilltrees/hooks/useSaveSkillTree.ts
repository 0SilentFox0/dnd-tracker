import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSkillTree } from '../api/skill-trees';

import { skillKeys } from '@/lib/hooks/skills';
import type { RawTree } from '@/lib/utils/skills/progression';

export function useSaveSkillTree(campaignId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tree: { treeId: string; race: string; skills: RawTree }) =>
            updateSkillTree({ campaignId, ...tree }),
        // pending until the trees refetch lands, so the editor never shows the pre-save row
        onSuccess: async () => {
            void queryClient.invalidateQueries({
                queryKey: skillKeys.progressionOf(campaignId),
            });
            await queryClient.invalidateQueries({
                queryKey: skillKeys.trees(campaignId),
            });
        },
    });
}
