"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { Character } from "@/types/characters";

interface Props {
  character: Character | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteCharacterDialog({
  character,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  return (
    <ResponsiveDialog
      open={!!character}
      onOpenChange={(open) => !open && onClose()}
      title="Видалити персонажа?"
      description={<>Персонажа &quot;{character?.name}&quot; буде видалено. Цю дію не можна скасувати.</>}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => ((open) => !open && onClose())(false)}>
            Скасувати
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void onConfirm();
              ((open) => !open && onClose())(false);
            }}
          >
            {isPending ? "Видалення…" : "Видалити"}
          </Button>
        </>
      }
    />
  );
}
