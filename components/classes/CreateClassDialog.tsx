"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { ClassFormData } from "@/types/classes";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateClass: (data: ClassFormData) => void;
}

const emptyClass = (name: string): ClassFormData => ({
  name,
  icon: null,
  color: null,
  hitDie: 8,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 0, from: [] },
  caster: "none",
  spellcastingAbility: null,
  features: [],
  subclassLevel: null,
  subclasses: [],
});

export function CreateClassDialog({ open, onOpenChange, onCreateClass }: CreateClassDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateClass(emptyClass(name.trim()));
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Новий клас"
      description="Решту налаштувань можна заповнити після створення"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-class-form" disabled={!name.trim()}>
            Створити клас
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-class-name">Назва класу *</Label>
        <Input id="new-class-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Наприклад: Воїн, Чарівник" />
      </form>
    </ResponsiveDialog>
  );
}
