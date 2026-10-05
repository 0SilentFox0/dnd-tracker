"use client";

import { useEffect, useRef, useState } from "react";

import { useCharacterProgression } from "./useCharacterProgression";

import { markLevelSeen } from "@/lib/api/character-progression";

export function useLevelUpCelebration(campaignId: string, characterId: string) {
  const { data, view } = useCharacterProgression(campaignId, characterId);

  const [dismissedFor, setDismissedFor] = useState<number | null>(null);

  const markedFor = useRef<number | null>(null);

  const pending = !!data?.isOwner && data.seenLevel !== null && data.level > data.seenLevel;

  useEffect(() => {
    if (!pending || !data || markedFor.current === data.level) return;

    markedFor.current = data.level;
    void markLevelSeen(campaignId, characterId).catch(() => {});
  }, [pending, data, campaignId, characterId]);

  const celebration =
    pending && data && data.seenLevel !== null && dismissedFor !== data.level
      ? { from: data.seenLevel, to: data.level, free: view?.points.free ?? 0 }
      : null;

  return { celebration, dismiss: () => setDismissedFor(data?.level ?? null) };
}
