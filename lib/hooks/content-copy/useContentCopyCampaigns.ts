import { useQuery } from '@tanstack/react-query';

import { contentCopyKeys } from './keys';

import { contentCopyApi } from '@/lib/api/content-copy';

const FIVE_MINUTES = 5 * 60_000;

export const useContentCopyCampaigns = (campaignId: string) =>
    useQuery({
        queryKey: contentCopyKeys.campaigns(campaignId),
        queryFn: () => contentCopyApi.campaigns(campaignId),
        staleTime: FIVE_MINUTES,
    });
