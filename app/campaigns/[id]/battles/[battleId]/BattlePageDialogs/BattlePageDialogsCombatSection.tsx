"use client";

import type { BattlePageDialogsMoraleOverlay } from "./BattlePageDialogs-types";

import { RollResultOverlay } from "@/components/battle/RollResultOverlay";

interface BattlePageDialogsCombatSectionProps {
  moraleOverlay: BattlePageDialogsMoraleOverlay;
}

export function BattlePageDialogsCombatSection({
  moraleOverlay,
}: BattlePageDialogsCombatSectionProps) {
  return (
    <RollResultOverlay
      type={moraleOverlay.overlayType}
      customText={moraleOverlay.overlayCustomText}
      onComplete={moraleOverlay.handleOverlayComplete}
    />
  );
}
