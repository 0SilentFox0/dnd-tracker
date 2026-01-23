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

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  damageModifier: string | null;
  onDamageModifierChange: (value: string | null) => void;
  onConfirm: () => void;
  isCreating: boolean;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  damageModifier,
  onDamageModifierChange,
  onConfirm,
  isCreating,
}: CreateGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Створити групу</DialogTitle>
          <DialogDescription>Додайте нову групу для юнітів</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <LabeledInput
            id="group-name"
            label="Назва групи"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Введіть назву групи"
            disabled={isCreating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && !isCreating) {
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
              disabled={isCreating}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Скасувати
          </Button>
          <Button onClick={onConfirm} disabled={!name.trim() || isCreating}>
            {isCreating ? "Створення..." : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
