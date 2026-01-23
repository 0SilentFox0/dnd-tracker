"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити всі юніти?</DialogTitle>
          <DialogDescription>
            Ви впевнені, що хочете видалити всі юніти з кампанії? Ця дія
            незворотна. Буде видалено {unitsCount} юнітів.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Скасувати
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Видалення..." : "Видалити всі юніти"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
