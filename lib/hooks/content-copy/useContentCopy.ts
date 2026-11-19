import { useMutation } from '@tanstack/react-query';

import { contentCopyApi } from '@/lib/api/content-copy';
import type { CopyRequest } from '@/types/content-copy';

type CopyBody = Omit<CopyRequest, 'dryRun'>;

export function useContentCopy(campaignId: string) {
    const preview = useMutation({
        mutationFn: (body: CopyBody) =>
            contentCopyApi.copy(campaignId, { ...body, dryRun: true }),
    });

    const run = useMutation({
        mutationFn: (body: CopyBody) =>
            contentCopyApi.copy(campaignId, { ...body, dryRun: false }),
    });

    return { preview, run };
}
