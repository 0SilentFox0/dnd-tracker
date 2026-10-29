"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();

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
      title={t("classes.create.title")}
      description={t("classes.create.description")}
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="create-class-form" disabled={!name.trim()}>
            {t("classes.create.submit")}
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-class-name">{t("classes.create.nameLabel")}</Label>
        <Input id="new-class-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("classes.create.namePlaceholder")} />
      </form>
    </ResponsiveDialog>
  );
}
