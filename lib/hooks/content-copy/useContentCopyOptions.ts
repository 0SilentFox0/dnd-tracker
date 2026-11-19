import { useQuery } from '@tanstack/react-query';

import { contentCopyKeys } from './keys';

import { contentCopyApi } from '@/lib/api/content-copy';
import type { ContentCopyKind } from '@/types/content-copy';

export const useContentCopyOptions = (
    campaignId: string,
    kind: ContentCopyKind,
    enabled: boolean
) =>
    useQuery({
        queryKey: contentCopyKeys.options(campaignId, kind),
        queryFn: () => contentCopyApi.options(campaignId, kind),
        enabled,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
    });
