import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cleanIdentity, serverIssueCodes } from './draft-form-helpers';

import { characterKeys } from '@/lib/hooks/characters/keys';
import {
    createWfrpDraft,
    updateWfrpDraftIdentity,
} from '@/systems/wfrp/api/characters';
import type {
    WfrpDraftIdentityInput,
    WfrpDraftInput,
} from '@/systems/wfrp/api/types';
import type { CreationPicks } from '@/systems/wfrp/rules/creation';

export interface WfrpDraftSubmitOptions {
    campaignId: string;
    characterId?: string;
    identity: WfrpDraftIdentityInput;
    speciesId?: string;
    picks: CreationPicks;
    canRun: boolean;
}

export function useWfrpDraftSubmit({
    campaignId,
    characterId,
    identity,
    speciesId,
    picks,
    canRun,
}: WfrpDraftSubmitOptions) {
    const router = useRouter();

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => {
            if (characterId)
                return updateWfrpDraftIdentity(
                    campaignId,
                    characterId,
                    cleanIdentity(identity)
                );

            const body: WfrpDraftInput = {
                ...cleanIdentity(identity),
                speciesId: speciesId ?? '',
                career: picks.career,
                stats: picks.stats,
                talents: picks.talents,
            };

            return createWfrpDraft(campaignId, body);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: characterKeys.sheet(campaignId),
            });
            router.push(`/campaigns/${campaignId}/character`);
        },
    });

    return {
        run: () => mutation.mutate(),
        isPending: mutation.isPending,
        error: mutation.error,
        issueCodes: serverIssueCodes(mutation.error),
        canRun,
    };
}
