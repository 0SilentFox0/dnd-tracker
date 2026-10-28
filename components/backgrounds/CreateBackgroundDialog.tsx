"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { BackgroundFormData } from "@/types/backgrounds";

const emptyBackground = (name: string): BackgroundFormData => ({ name, icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null });

export function CreateBackgroundDialog({ open, onOpenChange, onCreateBackground }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateBackground: (data: BackgroundFormData) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateBackground(emptyBackground(name.trim()));
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Нова передісторія"
      description="Навички, інструменти й вибори — після створення"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-background-form" disabled={!name.trim()}>
            Створити передісторію
          </Button>
        </>
      }
    >
      <form id="create-background-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-background-name">Назва передісторії *</Label>
        <Input id="new-background-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Наприклад: Мудрець" />
      </form>
    </ResponsiveDialog>
  );
}
