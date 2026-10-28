"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { FeatFormData } from "@/types/choices";

const emptyFeat = (name: string): FeatFormData => ({ name, icon: null, type: "general", prerequisite: {}, repeatable: false, description: null, abilities: [], choices: [] });

export function CreateFeatDialog({ open, onOpenChange, onCreateFeat }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateFeat: (data: FeatFormData) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateFeat(emptyFeat(name.trim()));
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Нова риса"
      description="Тип, передумови, вміння й вибори — після створення"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-feat-form" disabled={!name.trim()}>
            Створити рису
          </Button>
        </>
      }
    >
      <form id="create-feat-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-feat-name">Назва риси *</Label>
        <Input id="new-feat-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Наприклад: Пильний" />
      </form>
    </ResponsiveDialog>
  );
}
