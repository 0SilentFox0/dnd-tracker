import { useContext } from "react";

import { ConfirmContext,type ConfirmFn } from "./confirm-context";

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);

  if (!confirm) throw new Error("useConfirm requires ConfirmProvider (mounted in app/layout.tsx)");

  return confirm;
}
