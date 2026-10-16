"use client";

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
  label = "Покращення спела",
  placeholder = "Без спела",
  noneLabel = "Без спела",
  id = "skill-spell",
}: SkillSpellSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <SelectField
        id={id}
        value={spellId || ""}
        onValueChange={(value) => onSpellIdChange(value || null)}
        placeholder={placeholder}
        options={spells.map((spell) => ({ value: spell.id, label: spell.name }))}
        allowNone
        noneLabel={noneLabel}
      />
    </div>
  );
}
