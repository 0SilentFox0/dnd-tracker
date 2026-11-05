"use client";

import { useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { advanceCharacter, undoCharacterAdvance } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { AdvanceBody, AdvanceResult, Character } from "@/types/characters";

type AdvanceOp = { kind: "buy"; request: AdvanceBody } | { kind: "undo" };

export function useAdvance(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  // the response already carries the new characteristics, so the detail query is patched instead of refetched
  const applyDelta = ({ characteristics, experience }: AdvanceResult) => queryClient.setQueryData<Character>(characterKeys.detail(campaignId, characterId), (old) => old && { ...old, characteristics, experience });

  const mutation = useCrudMutation({
    mutationFn: (op: AdvanceOp) => (op.kind === "buy" ? advanceCharacter(campaignId, characterId, op.request) : undoCharacterAdvance(campaignId, characterId)),
    invalidateKeys: [characterKeys.sheet(campaignId, characterId), characterKeys.log(campaignId, characterId)],
    onSuccess: applyDelta,
  });

  const { mutateOk } = mutation;

  return {
    buy: async (request: AdvanceBody) => void (await mutateOk({ kind: "buy", request })),
    undo: async () => void (await mutateOk({ kind: "undo" })),
    isPending: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
  };
}
