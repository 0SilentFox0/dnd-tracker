"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  skillsCount: number;
}

export function DeleteAllSkillsDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  skillsCount,
}: Props) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити всі скіли?"
      description={<>Ця дія видалить всі скіли з бібліотеки ({skillsCount} скілів). Цю дію неможливо скасувати.</>}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Скасувати</Button>
          <Button variant="destructive"
            onClick={() => {
            void onConfirm();
            onOpenChange(false);
          }}
            disabled={isPending}
          >
            {isPending ? "Видалення..." : "Видалити всі"}
          </Button>
        </>
      }
    />
  );
}
