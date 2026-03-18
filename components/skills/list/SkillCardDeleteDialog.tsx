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

interface SkillCardDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  onConfirm: () => void;
}

export function SkillCardDeleteDialog({
  open,
  onOpenChange,
  skillName,
  onConfirm,
}: SkillCardDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити скіл?</AlertDialogTitle>
          <AlertDialogDescription>
            Скіл &quot;{skillName}&quot; буде видалено. Цю дію неможливо
            скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
