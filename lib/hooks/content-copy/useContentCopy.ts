import { useMutation, useQueryClient } from '@tanstack/react-query';

import { touchesCampaign } from './keys';

import { contentCopyApi } from '@/lib/api/content-copy';
import type { CopyRequest } from '@/types/content-copy';

type CopyBody = Omit<CopyRequest, 'dryRun'>;

export function useContentCopy(campaignId: string) {
    const queryClient = useQueryClient();

    const preview = useMutation({
        mutationFn: (body: CopyBody) =>
            contentCopyApi.copy(campaignId, { ...body, dryRun: true }),
    });

    const run = useMutation({
        mutationFn: (body: CopyBody) =>
            contentCopyApi.copy(campaignId, { ...body, dryRun: false }),
        onSuccess: ({ targets }) => {
            const written = targets
                .filter((t) => t.created.length > 0)
                .map((t) => t.campaignId);

            if (written.length > 0)
                void queryClient.invalidateQueries({
                    predicate: touchesCampaign(written),
                });
        },
    });

    return { preview, run };
}
