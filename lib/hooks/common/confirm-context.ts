import { createContext, type ReactNode } from "react";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  /** `null` hides the cancel button (notice-style dialog). */
  cancelLabel?: string | null;
  destructive?: boolean;
  onConfirm?: () => Promise<unknown>;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
