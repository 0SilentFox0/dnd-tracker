"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити всі заклинання?"
      description={
        <>Ви впевнені, що хочете видалити всі заклинання з кампанії? Ця дія незворотна. Буде видалено {spellsCount} заклинань.</>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Видалення..." : "Видалити всі заклинання"}
          </Button>
        </>
      }
    ></ResponsiveDialog>
  );
}
