import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cleanIdentity, serverIssueCodes } from './draft-form-helpers';

import type { CharacterTypeValue } from '@/lib/constants/characters';
import { characterKeys, characterWriteKeys } from '@/lib/hooks/characters';
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
    dm?: { characterType: CharacterTypeValue; controlledBy: string };
}

export function useWfrpDraftSubmit({
    campaignId,
    characterId,
    identity,
    speciesId,
    picks,
    canRun,
    dm,
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
                ...(picks.canon && { canon: picks.canon }),
                ...(dm && {
                    owner: {
                        type: dm.characterType,
                        controlledBy: dm.controlledBy,
                    },
                }),
            };

            return createWfrpDraft(campaignId, body);
        },
        onSuccess: async () => {
            const keys = dm
                ? characterWriteKeys(campaignId)
                : [characterKeys.sheet(campaignId)];

            await Promise.all(
                keys.map((queryKey) =>
                    queryClient.invalidateQueries({ queryKey })
                )
            );
            router.push(
                dm
                    ? `/campaigns/${campaignId}/dm/characters?type=${dm.characterType}`
                    : `/campaigns/${campaignId}/character`
            );
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
