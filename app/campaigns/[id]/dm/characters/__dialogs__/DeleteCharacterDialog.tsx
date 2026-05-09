"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog
      open={!!character}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити персонажа?</AlertDialogTitle>
          <AlertDialogDescription>
            Персонажа &quot;{character?.name}&quot; буде видалено. Цю дію не
            можна скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Видалення…" : "Видалити"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
