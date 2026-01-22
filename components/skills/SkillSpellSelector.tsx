"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Select
        value={spellId || "none"}
        onValueChange={(value) =>
          onSpellIdChange(value === "none" ? null : value)
        }
      >
        <SelectTrigger id="skill-spell">
          <SelectValue placeholder="Без спела" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Без спела</SelectItem>
          {spells.map((spell) => (
            <SelectItem key={spell.id} value={spell.id}>
              {spell.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
