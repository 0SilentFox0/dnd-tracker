"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteAllCharactersDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: Props) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити всіх персонажів?"
      description="Буде видалено всіх персонажів гравців у цій кампанії. Цю дію не можна скасувати."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void onConfirm();
              onOpenChange(false);
            }}
          >
            {isPending ? "Видалення…" : "Видалити всіх"}
          </Button>
        </>
      }
    />
  );
}
