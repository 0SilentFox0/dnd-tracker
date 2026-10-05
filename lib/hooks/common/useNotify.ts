import { type ReactNode, useCallback } from "react";

import { useConfirm } from "./useConfirm";

/** Replacement for window.alert: a one-button dialog (sheet on phones). */
export function useNotify(): (message: ReactNode) => Promise<void> {
  const confirm = useConfirm();

  return useCallback(async (message: ReactNode) => {
    await confirm({ title: message, confirmLabel: "Зрозуміло", cancelLabel: null });
  }, [confirm]);
}
