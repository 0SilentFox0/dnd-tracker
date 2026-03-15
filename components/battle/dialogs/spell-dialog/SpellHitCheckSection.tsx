"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SpellHitCheckSectionProps {
  ability: string;
  dc: number;
  value: string;
  onChange: (value: string) => void;
}

export function SpellHitCheckSection({
  ability,
  dc,
  value,
  onChange,
}: SpellHitCheckSectionProps) {
  return (
    <div>
      <Label>
        Кидок попадання ({ability.toUpperCase()}) — потрібно &gt;= {dc}
      </Label>
      <Input
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1d20"
      />
    </div>
  );
}
