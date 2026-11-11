"use client";

import { useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { advanceCharacterCareer, setCharacterCareer } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CareerResult } from "@/lib/utils/rules/systems";
import type { Character } from "@/types/characters";

type CareerOp = { kind: "set"; careerId: string } | { kind: "advance"; force?: boolean };

export function useCareerOps(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const mutation = useCrudMutation({
    mutationFn: (op: CareerOp) => (op.kind === "set" ? setCharacterCareer(campaignId, characterId, op.careerId) : advanceCharacterCareer(campaignId, characterId, op.force)),
    invalidateKeys: [characterKeys.sheet(campaignId, characterId), characterKeys.log(campaignId, characterId)],
    onSuccess: ({ characteristics }: CareerResult) => queryClient.setQueryData<Character>(characterKeys.detail(campaignId, characterId), (old) => old && { ...old, characteristics }),
  });

  return {
    setCareer: (careerId: string) => mutation.mutateOk({ kind: "set", careerId }),
    advanceCareer: (force?: boolean) => mutation.mutateOk({ kind: "advance", force }),
    isPending: mutation.isPending,
  };
}
