import { useQuery } from '@tanstack/react-query';

import { contentCopyKeys } from './keys';

import { contentCopyApi } from '@/lib/api/content-copy';
import type { ContentKind } from '@/lib/constants/content-kinds';

export const useContentCopyOptions = (
    campaignId: string,
    kind: ContentKind,
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
