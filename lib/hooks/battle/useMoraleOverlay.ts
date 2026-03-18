"use client";

import { useCallback, useState } from "react";

import type { RollResultType } from "@/components/battle/RollResultOverlay";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import { getMoraleOverlayText } from "@/lib/utils/battle/battle-morale";

export interface UseMoraleOverlayParams {
  onSkipTurn: () => void;
}

export function useMoraleOverlay({ onSkipTurn }: UseMoraleOverlayParams) {
  const [moraleResultModal, setMoraleResultModal] = useState<{
    open: boolean;
    result: MoraleCheckResult | null;
  }>({ open: false, result: null });

  const showMoraleResult = useCallback((result: MoraleCheckResult) => {
    setMoraleResultModal({ open: true, result });
  }, []);

  const closeMoraleResult = useCallback(() => {
    setMoraleResultModal((prev) => ({ ...prev, open: false }));
  }, []);

  const overlayType: RollResultType | null =
    moraleResultModal.open && moraleResultModal.result
      ? moraleResultModal.result.hasExtraTurn ||
          !moraleResultModal.result.shouldSkipTurn
        ? "success"
        : "fail"
      : null;

  const overlayCustomText =
    moraleResultModal.open && moraleResultModal.result
      ? getMoraleOverlayText(moraleResultModal.result)
      : null;

  const handleOverlayComplete = useCallback(() => {
    const shouldSkip = moraleResultModal.result?.shouldSkipTurn;

    setMoraleResultModal((prev) => ({ ...prev, open: false }));

    if (shouldSkip) onSkipTurn();
  }, [moraleResultModal.result?.shouldSkipTurn, onSkipTurn]);

  return {
    moraleResultModal,
    showMoraleResult,
    closeMoraleResult,
    overlayType,
    overlayCustomText,
    handleOverlayComplete,
  };
}
