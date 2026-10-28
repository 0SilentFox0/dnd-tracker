"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { IdName } from "@/types/common";

interface SkillSpellSelectorProps {
  spellId: string | null;
  spells: IdName[];
  onSpellIdChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  noneLabel?: string;
  id?: string;
}

export function SkillSpellSelector({
  spellId,
  spells,
  onSpellIdChange,
  label,
  placeholder,
  noneLabel,
  id = "skill-spell",
}: SkillSpellSelectorProps) {
  const t = useTranslations("skills.form.spell");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label ?? t("upgrade")}</Label>
      <SelectField
        id={id}
        value={spellId || ""}
        onValueChange={(value) => onSpellIdChange(value || null)}
        placeholder={placeholder ?? t("none")}
        options={spells.map((spell) => ({ value: spell.id, label: spell.name }))}
        allowNone
        noneLabel={noneLabel ?? t("none")}
      />
    </div>
  );
}
