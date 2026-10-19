"use client";

import { useState } from "react";

import type { BattleParticipant } from "@/types/battle";

export interface OpenableDialog {
  open: boolean;
  setOpen(open: boolean): void;
  show(): void;
}

export interface BattlePageDialogs {
  log: OpenableDialog;
  addParticipant: OpenableDialog;
  hp: { target: BattleParticipant | null; show(participant: BattleParticipant | null): void; close(): void };
}

function useOpenable(): OpenableDialog {
  const [open, setOpen] = useState(false);

  return { open, setOpen, show: () => setOpen(true) };
}

/** Стейт діалогів сторінки бою (лог, додати учасника, змінити HP) для DM-дій. */
export function useBattlePageDialogs(): BattlePageDialogs {
  const log = useOpenable();

  const addParticipant = useOpenable();

  const [target, setTarget] = useState<BattleParticipant | null>(null);

  return { log, addParticipant, hp: { target, show: setTarget, close: () => setTarget(null) } };
}
