import { createContext, type ReactNode } from "react";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  /** `null` hides the cancel button (notice-style dialog). */
  cancelLabel?: string | null;
  destructive?: boolean;
  onConfirm?: () => Promise<unknown>;
  /** Aborting closes the dialog as cancelled (e.g. the owner unmounted). */
  signal?: AbortSignal;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
