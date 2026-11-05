"use client";

import { useRef } from "react";
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
    // a refusal means the cached balance is stale
    onError: () => void queryClient.invalidateQueries({ queryKey: characterKeys.detail(campaignId, characterId) }),
  });

  const inFlight = useRef(false);

  // synchronous: isPending only flips after a render, a fast second click would slip through
  const guarded = async (op: AdvanceOp) => {
    if (inFlight.current) return;

    inFlight.current = true;

    try {
      await mutateOk(op);
    } finally {
      inFlight.current = false;
    }
  };

  const { mutateOk } = mutation;

  return {
    buy: (request: AdvanceBody) => guarded({ kind: "buy", request }),
    undo: () => guarded({ kind: "undo" }),
    isPending: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
  };
}
