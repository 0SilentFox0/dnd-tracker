'use client';

import { useQuery } from '@tanstack/react-query';

import { artifactSetKeys } from './keys';

import { artifactKeys } from '@/lib/hooks/artifacts';
import { useCrudMutation } from '@/lib/hooks/common';
import {
    type ArtifactSetCreatePayload,
    createArtifactSet,
    deleteArtifactSet,
    getArtifactSets,
    updateArtifactSet,
} from '@/systems/artifactsets/api/artifact-sets';

const keys = (campaignId: string) => [
    artifactSetKeys.list(campaignId),
    artifactKeys.list(campaignId),
];

export function useArtifactSetsList(campaignId: string) {
    return useQuery({
        queryKey: artifactSetKeys.list(campaignId),
        queryFn: () => getArtifactSets(campaignId),
        enabled: !!campaignId,
    });
}

export function useSaveArtifactSet(campaignId: string, setId?: string) {
    return useCrudMutation({
        mutationFn: (payload: ArtifactSetCreatePayload) =>
            setId
                ? updateArtifactSet(campaignId, setId, payload)
                : createArtifactSet(campaignId, payload),
        invalidateKeys: keys(campaignId),
    });
}

export function useDeleteArtifactSet(campaignId: string) {
    return useCrudMutation({
        mutationFn: (setId: string) => deleteArtifactSet(campaignId, setId),
        invalidateKeys: keys(campaignId),
    });
}
