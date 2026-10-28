import { type ReactNode, useCallback, useContext, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { ConfirmContext, type ConfirmOptions } from "./confirm-context";
import { useConfirm } from "./useConfirm";

type CommonT = ReturnType<typeof useTranslations<"common">>;

const notice = (t: CommonT, message: ReactNode): ConfirmOptions => ({
  title: t("notify.title"),
  description: message,
  confirmLabel: t("notify.gotIt"),
  cancelLabel: null,
});

/** Replacement for window.alert: a one-button dialog (sheet on phones). */
export function useNotify(): (message: ReactNode) => Promise<void> {
  const translate = useTranslations("common");

  const t = useRef(translate);

  const confirm = useConfirm();

  useEffect(() => {
    t.current = translate;
  });

  return useCallback(async (message: ReactNode) => {
    await confirm(notice(t.current, message));
  }, [confirm]);
}

/** useNotify that is a no-op outside ConfirmProvider — for shared hooks that only sometimes notify. */
export function useOptionalNotify(): (message: ReactNode) => void {
  const translate = useTranslations("common");

  const t = useRef(translate);

  const confirm = useContext(ConfirmContext);

  useEffect(() => {
    t.current = translate;
  });

  return useCallback((message: ReactNode) => void confirm?.(notice(t.current, message)), [confirm]);
}
