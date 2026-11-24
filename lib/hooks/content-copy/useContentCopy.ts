import { useMutation, useQueryClient } from '@tanstack/react-query';

import { touchesCampaign } from './keys';

import { contentCopyApi } from '@/lib/api/content-copy';
import type { CopyRequest, CopyResult } from '@/types/content-copy';

type CopyBody = Omit<CopyRequest, 'dryRun'>;

/** The server copies a bounded batch of targets per request and returns `next` to continue. */
async function copyAllBatches(
    campaignId: string,
    body: CopyRequest
): Promise<CopyResult> {
    const targets: CopyResult['targets'] = [];

    let after = body.after;

    for (;;) {
        const part = await contentCopyApi.copy(campaignId, { ...body, after });

        targets.push(...part.targets);

        if (!part.next) return { targets };

        after = part.next;
    }
}

export function useContentCopy(campaignId: string) {
    const queryClient = useQueryClient();

    const preview = useMutation({
        mutationFn: (body: CopyBody) =>
            copyAllBatches(campaignId, { ...body, dryRun: true }),
    });

    const run = useMutation({
        mutationFn: (body: CopyBody) =>
            copyAllBatches(campaignId, { ...body, dryRun: false }),
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
