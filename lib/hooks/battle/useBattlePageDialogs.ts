"use client";

import { useState } from "react";
import type { BattleParticipant } from "@/types/battle";

/**
 * Стейт діалогів сторінки бою (лог, додати учасника, змінити HP).
 * Використовується на сторінці битви для DM-дій.
 */
export function useBattlePageDialogs() {
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false);
  const [hpDialogParticipant, setHpDialogParticipant] =
    useState<BattleParticipant | null>(null);

  return {
    logPanelOpen,
    setLogPanelOpen,
    addParticipantDialogOpen,
    setAddParticipantDialogOpen,
    hpDialogParticipant,
    setHpDialogParticipant,
    openLog: () => setLogPanelOpen(true),
    openAddParticipant: () => setAddParticipantDialogOpen(true),
    openHpDialog: (p: BattleParticipant | null) => setHpDialogParticipant(p),
    closeHpDialog: () => setHpDialogParticipant(null),
  };
}
