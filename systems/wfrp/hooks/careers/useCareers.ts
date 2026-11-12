import { useQuery } from '@tanstack/react-query';

import { careerKeys } from './keys';

import { characterKeys } from '@/lib/hooks/characters/keys';
import { useCrudMutation } from '@/lib/hooks/common';
import { REFERENCE_STALE_MS } from '@/lib/providers/query-provider';
import {
    createCareer,
    deleteCareer,
    getCareers,
    updateCareer,
} from '@/systems/wfrp/api/careers';
import type {
    CareerData,
    CareerFormData,
} from '@/systems/wfrp/rules/careers/types';

const careerDependentKeys = (campaignId: string) => [
    careerKeys.list(campaignId),
    characterKeys.sheet(campaignId),
];

export function useCareers(campaignId: string, opts?: { enabled?: boolean }) {
    return useQuery<CareerData[]>({
        queryKey: careerKeys.list(campaignId),
        staleTime: REFERENCE_STALE_MS,
        queryFn: () => getCareers(campaignId),
        enabled: opts?.enabled ?? true,
    });
}

export function useCreateCareer(campaignId: string) {
    return useCrudMutation({
        mutationFn: (data: CareerFormData) => createCareer(campaignId, data),
        invalidateKeys: [careerKeys.list(campaignId)],
    });
}

export function useUpdateCareer(campaignId: string) {
    return useCrudMutation({
        mutationFn: ({
            careerId,
            data,
        }: {
            careerId: string;
            data: Partial<CareerFormData>;
        }) => updateCareer(campaignId, careerId, data),
        invalidateKeys: careerDependentKeys(campaignId),
    });
}

export function useDeleteCareer(campaignId: string) {
    return useCrudMutation({
        mutationFn: (careerId: string) => deleteCareer(campaignId, careerId),
        invalidateKeys: careerDependentKeys(campaignId),
    });
}
