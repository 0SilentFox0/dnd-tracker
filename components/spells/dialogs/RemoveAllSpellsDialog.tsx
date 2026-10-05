"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити всі заклинання з групи?"
      description={<>Ви впевнені, що хочете видалити всі заклинання з групи &quot; {groupName}&quot;? Заклинання не будуть видалені, але вони втратять зв&apos;язок з цією групою.</>}
      footer={
        <>
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
        </>
      }
    >
    </ResponsiveDialog>
  );
}
