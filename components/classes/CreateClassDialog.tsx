"use client";

import { useTranslations } from "next-intl";

import { NameOnlyCreateDialog } from "@/components/common/NameOnlyCreateDialog";
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
  const t = useTranslations("classes.create");

  const texts = { title: t("title"), description: t("description"), name: t("nameLabel"), namePlaceholder: t("namePlaceholder"), submit: t("submit") };

  return <NameOnlyCreateDialog open={open} onOpenChange={onOpenChange} formId="create-class-form" texts={texts} onSubmit={(name) => onCreateClass(emptyClass(name))} />;
}
