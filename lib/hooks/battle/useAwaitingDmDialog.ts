"use client";

import { useState } from "react";

export interface DialogState {
  open: boolean;
  setOpen(open: boolean): void;
}

type Awaiting = "victory" | "defeat" | null;

/** ДМ закрив діалог — він лишається закритим до наступного стану очікування; банер відкриває його знову. */
export function useAwaitingDmDialog(isDM: boolean, awaiting: Awaiting): DialogState {
  const [dismissed, setDismissed] = useState<Awaiting>(null);

  if (!awaiting && dismissed) setDismissed(null);

  return {
    open: isDM && !!awaiting && dismissed !== awaiting,
    setOpen: (open) => setDismissed(open ? null : awaiting),
  };
}
