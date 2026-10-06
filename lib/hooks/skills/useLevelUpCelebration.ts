"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { markLevelSeen } from "@/lib/api/character-progression";
import { characterSheetKey, useCharacterSheet } from "@/lib/hooks/characters";
import type { CharacterSheet } from "@/types/characters";

export function useLevelUpCelebration(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const { data: sheet } = useCharacterSheet(campaignId, characterId);

  const [dismissedFor, setDismissedFor] = useState<number | null>(null);

  const markedFor = useRef<number | null>(null);

  const progression = sheet?.progression;

  const seenLevel = progression?.seenLevel ?? null;

  const level = progression?.level ?? 0;

  const pending = !!sheet?.viewer.isOwner && !sheet.viewer.isDM && seenLevel !== null && level > seenLevel;

  useEffect(() => {
    if (!pending || markedFor.current === level) return;

    markedFor.current = level;
    void markLevelSeen(campaignId, characterId).catch(() => {});
  }, [pending, level, campaignId, characterId]);

  const [opened, setOpened] = useState<{ from: number; to: number } | null>(null);

  // після markLevelSeen наступний лист приходить уже з seenLevel = level: відкритий оверлей тримається до закриття
  if (pending && seenLevel !== null && opened?.to !== level && dismissedFor !== level) setOpened({ from: seenLevel, to: level });

  const celebration = opened && dismissedFor !== opened.to ? { ...opened, free: progression?.freePoints ?? 0 } : null;

  const dismiss = () => {
    setDismissedFor(opened?.to ?? level);
    queryClient.setQueryData<CharacterSheet>(characterSheetKey(campaignId, characterId), (old) =>
      old ? { ...old, progression: { ...old.progression, seenLevel: old.progression.level } } : old,
    );
  };

  return { celebration, dismiss };
}
