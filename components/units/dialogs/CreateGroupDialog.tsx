"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Створити групу"
      description="Додайте нову групу для юнітів"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Скасувати
          </Button>
          <Button onClick={onConfirm} disabled={!name.trim() || isCreating}>
            {isCreating ? "Створення..." : "Створити"}
          </Button>
        </>
      }
    >
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
            options={DAMAGE_ELEMENT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            allowNone
            noneLabel="Без модифікатора"
            disabled={isCreating}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
