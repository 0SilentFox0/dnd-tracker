"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RemoveAllUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onConfirm: () => void;
  isRemoving: boolean;
}

export function RemoveAllUnitsDialog({
  open,
  onOpenChange,
  groupName,
  onConfirm,
  isRemoving,
}: RemoveAllUnitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити всі юніти з групи?</DialogTitle>
          <DialogDescription>
            Ви впевнені, що хочете видалити всі юніти з групи &quot;
            {groupName}&quot;? Юніти не будуть видалені, але вони втратять
            зв&apos;язок з цією групою.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            Скасувати
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? "Видалення..." : "Видалити всі з групи"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
