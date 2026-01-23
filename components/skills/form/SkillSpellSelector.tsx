"use client";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";

interface SpellOption {
  id: string;
  name: string;
}

interface SkillSpellSelectorProps {
  spellId: string | null;
  spells: SpellOption[];
  onSpellIdChange: (value: string | null) => void;
}

export function SkillSpellSelector({
  spellId,
  spells,
  onSpellIdChange,
}: SkillSpellSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="skill-spell">Покращення спела</Label>
      <SelectField
        id="skill-spell"
        value={spellId || ""}
        onValueChange={(value) => onSpellIdChange(value || null)}
        placeholder="Без спела"
        options={spells.map(spell => ({ value: spell.id, label: spell.name }))}
        allowNone
        noneLabel="Без спела"
      />
    </div>
  );
}
