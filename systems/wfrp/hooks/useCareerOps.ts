'use client';

import { useQueryClient } from '@tanstack/react-query';

import { characterKeys } from '@/lib/hooks/characters';
import { useCrudMutation } from '@/lib/hooks/common';
import {
    advanceCharacterCareer,
    revertCharacterCareer,
    setCharacterCareer,
    tickCharacterTrapping,
} from '@/systems/wfrp/api/characters';
import type { CareerResult } from '@/systems/wfrp/api/types';
import type { Character } from '@/types/characters';

type CareerOp =
    | { kind: 'set'; careerId: string }
    | { kind: 'advance'; force?: boolean }
    | { kind: 'revert' }
    | { kind: 'trapping'; name: string };

export function useCareerOps(campaignId: string, characterId: string) {
    const queryClient = useQueryClient();

    const mutation = useCrudMutation({
        mutationFn: (op: CareerOp) => {
            switch (op.kind) {
                case 'set':
                    return setCharacterCareer(
                        campaignId,
                        characterId,
                        op.careerId
                    );
                case 'advance':
                    return advanceCharacterCareer(
                        campaignId,
                        characterId,
                        op.force
                    );
                case 'revert':
                    return revertCharacterCareer(campaignId, characterId);
                case 'trapping':
                    return tickCharacterTrapping(
                        campaignId,
                        characterId,
                        op.name
                    );
            }
        },
        invalidateKeys: [
            characterKeys.sheet(campaignId, characterId),
            characterKeys.log(campaignId, characterId),
        ],
        onSuccess: ({ characteristics }: CareerResult) =>
            queryClient.setQueryData<Character>(
                characterKeys.detail(campaignId, characterId),
                (old) => old && { ...old, characteristics }
            ),
    });

    return {
        setCareer: (careerId: string) =>
            mutation.mutateOk({ kind: 'set', careerId }),
        advanceCareer: (force?: boolean) =>
            mutation.mutateOk({ kind: 'advance', force }),
        revertCareer: () => mutation.mutateOk({ kind: 'revert' }),
        tickTrapping: (name: string) =>
            mutation.mutateOk({ kind: 'trapping', name }),
        isPending: mutation.isPending,
    };
}
