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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  newGroupName: string;
  onNewGroupNameChange: (name: string) => void;
  damageModifier: string | null;
  onDamageModifierChange: (value: string | null) => void;
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
  damageModifier,
  onDamageModifierChange,
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
          <div className="space-y-2">
            <Label htmlFor="group-name">Назва групи</Label>
            <Input
              id="group-name"
              value={newGroupName}
              onChange={(e) => onNewGroupNameChange(e.target.value)}
              placeholder="Введіть назву групи"
              disabled={isRenaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGroupName.trim() && !isRenaming) {
                  onConfirm();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Модифікатор шкоди для групи</Label>
            <Select
              value={damageModifier || "none"}
              onValueChange={(value) =>
                onDamageModifierChange(value === "none" ? null : value)
              }
              disabled={isRenaming}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без модифікатора" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без модифікатора</SelectItem>
                {DAMAGE_ELEMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isRenaming}
          >
            Скасувати
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!newGroupName.trim() || isRenaming}
          >
            {isRenaming ? "Збереження..." : "Зберегти"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
