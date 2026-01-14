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

interface DeleteAllSpellsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spellsCount: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteAllSpellsDialog({
  open,
  onOpenChange,
  spellsCount,
  onConfirm,
  isDeleting,
}: DeleteAllSpellsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити всі заклинання?</DialogTitle>
          <DialogDescription>
            Ви впевнені, що хочете видалити всі заклинання з кампанії? Ця дія
            незворотна. Буде видалено {spellsCount} заклинань.
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
            {isDeleting ? "Видалення..." : "Видалити всі заклинання"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
