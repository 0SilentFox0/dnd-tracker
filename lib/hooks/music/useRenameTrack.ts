"use client";

import { useCallback, useMemo } from "react";

import { trackKeys } from "./keys";

import { updateTrack } from "@/lib/api/tracks";
import { useCrudMutation } from "@/lib/hooks/common";

export function useRenameTrack(campaignId: string, onError: (e: unknown) => void): (id: string, title: string) => void {
  const invalidateKeys = useMemo(() => [trackKeys.list(campaignId)], [campaignId]);

  const { mutate } = useCrudMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateTrack(campaignId, id, { title }),
    invalidateKeys,
    onError,
  });

  return useCallback((id: string, title: string) => mutate({ id, title }), [mutate]);
}
