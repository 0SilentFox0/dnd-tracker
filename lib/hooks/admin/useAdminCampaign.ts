'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminCampaign } from '@/lib/api/admin';

export function useAdminCampaign(id: string) {
    return useQuery({
        queryKey: adminKeys.campaign(id),
        queryFn: () => getAdminCampaign(id),
        refetchOnWindowFocus: false,
    });
}
