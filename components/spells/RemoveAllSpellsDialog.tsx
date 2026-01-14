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

interface RemoveAllSpellsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onConfirm: () => void;
  isRemoving: boolean;
}

export function RemoveAllSpellsDialog({
  open,
  onOpenChange,
  groupName,
  onConfirm,
  isRemoving,
}: RemoveAllSpellsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити всі заклинання з групи?</DialogTitle>
          <DialogDescription>
            Ви впевнені, що хочете видалити всі заклинання з групи &quot;
            {groupName}&quot;? Заклинання не будуть видалені, але вони
            втратять зв&apos;язок з цією групою.
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
            Видалити всі з групи
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
