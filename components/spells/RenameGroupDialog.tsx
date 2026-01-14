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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перейменувати групу</DialogTitle>
          <DialogDescription>
            Введіть нову назву для групи &quot;{groupName}&quot;
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isRenaming}>
            Скасувати
          </Button>
          <Button onClick={onConfirm} disabled={isRenaming}>
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
