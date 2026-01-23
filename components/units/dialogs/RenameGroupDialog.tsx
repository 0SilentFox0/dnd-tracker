"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
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
          <LabeledInput
            id="group-name"
            label="Назва групи"
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
          <div className="space-y-2">
            <Label>Модифікатор шкоди для групи</Label>
            <SelectField
              value={damageModifier || ""}
              onValueChange={(value) => onDamageModifierChange(value || null)}
              placeholder="Без модифікатора"
              options={DAMAGE_ELEMENT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              allowNone
              noneLabel="Без модифікатора"
              disabled={isRenaming}
            />
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
