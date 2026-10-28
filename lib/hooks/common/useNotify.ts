import { type ReactNode, useCallback, useContext } from "react";

import { ConfirmContext, type ConfirmOptions } from "./confirm-context";
import { useConfirm } from "./useConfirm";

import { NOTICE_TITLE } from "@/lib/constants/ui";

const notice = (message: ReactNode): ConfirmOptions => ({ title: NOTICE_TITLE, description: message, confirmLabel: "Зрозуміло", cancelLabel: null });

/** Replacement for window.alert: a one-button dialog (sheet on phones). */
export function useNotify(): (message: ReactNode) => Promise<void> {
  const confirm = useConfirm();

  return useCallback(async (message: ReactNode) => {
    await confirm(notice(message));
  }, [confirm]);
}

/** useNotify that is a no-op outside ConfirmProvider — for shared hooks that only sometimes notify. */
export function useOptionalNotify(): (message: ReactNode) => void {
  const confirm = useContext(ConfirmContext);

  return useCallback((message: ReactNode) => void confirm?.(notice(message)), [confirm]);
}
