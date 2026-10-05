"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface DeleteAllUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitsCount: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteAllUnitsDialog({
  open,
  onOpenChange,
  unitsCount,
  onConfirm,
  isDeleting,
}: DeleteAllUnitsDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити всі юніти?"
      description={<>Ви впевнені, що хочете видалити всі юніти з кампанії? Ця дія незворотна. Буде видалено {unitsCount} юнітів.</>}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Видалення..." : "Видалити всі юніти"}
          </Button>
        </>
      }
    ></ResponsiveDialog>
  );
}
