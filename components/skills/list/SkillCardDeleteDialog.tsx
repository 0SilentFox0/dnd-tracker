"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити скіл?"
      description={<>Скіл &quot;{skillName}&quot; буде видалено. Цю дію неможливо скасувати.</>}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button variant="destructive"
            onClick={() => {
            void onConfirm();
            onOpenChange(false);
          }}
          >
            Видалити
          </Button>
        </>
      }
    />
  );
}
