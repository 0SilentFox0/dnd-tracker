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
          <div className="space-y-2">
            <Label htmlFor="group-name">Назва групи</Label>
            <Input
              id="group-name"
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
          </div>
          <div className="space-y-2">
            <Label>Модифікатор шкоди для групи</Label>
            <Select
              value={damageModifier || "none"}
              onValueChange={(value) =>
                onDamageModifierChange(value === "none" ? null : value)
              }
              disabled={isCreating}
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
