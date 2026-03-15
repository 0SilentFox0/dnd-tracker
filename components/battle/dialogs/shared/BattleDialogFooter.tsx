"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOOTER_CLASS =
  "flex gap-2 flex-wrap [&>*]:min-h-[44px] [&>*]:touch-manipulation";

export interface BattleDialogFooterProps {
  className?: string;
  children: ReactNode;
}

/**
 * Consistent footer layout for battle dialogs (flex gap, touch-friendly buttons).
 */
export function BattleDialogFooter({
  className,
  children,
}: BattleDialogFooterProps) {
  return (
    <div className={cn(FOOTER_CLASS, className)}>
      {children}
    </div>
  );
}

export interface ConfirmCancelFooterProps {
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  /** Shown when confirmLoading is true; defaults to confirmLabel + "…" */
  confirmLoadingLabel?: string;
  className?: string;
}

/**
 * Standard Cancel + Confirm button row for battle dialogs.
 */
export function ConfirmCancelFooter({
  cancelLabel = "Скасувати",
  onCancel,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  confirmLoading = false,
  confirmLoadingLabel,
  className,
}: ConfirmCancelFooterProps) {
  return (
    <BattleDialogFooter className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1"
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled || confirmLoading}
        className="flex-1"
      >
        {confirmLoading ? (confirmLoadingLabel ?? `${confirmLabel}…`) : confirmLabel}
      </Button>
    </BattleDialogFooter>
  );
}
