"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmCancelFooterProps {
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  confirmLoadingLabel?: string;
  className?: string;
}

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
    <div className={cn("flex flex-wrap gap-2 [&>*]:min-h-[44px] [&>*]:touch-manipulation", className)}>
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
    </div>
  );
}
