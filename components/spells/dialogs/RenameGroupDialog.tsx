"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  newGroupName: string;
  onNewGroupNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isRenaming: boolean;
}

export function RenameGroupDialog({
  open,
  onOpenChange,
  groupName,
  newGroupName,
  onNewGroupNameChange,
  onConfirm,
  onCancel,
  isRenaming,
}: RenameGroupDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Перейменувати групу"
      description={<>Введіть нову назву для групи &quot;{groupName}&quot;</>}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isRenaming}>
            Скасувати
          </Button>
          <Button onClick={onConfirm} disabled={isRenaming}>
            Зберегти
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="groupName">Назва групи</Label>
          <Input
            id="groupName"
            value={newGroupName}
            onChange={(e) => onNewGroupNameChange(e.target.value)}
            placeholder="Назва групи"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
