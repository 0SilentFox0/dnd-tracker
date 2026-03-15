"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SpellRollInputsSectionProps {
  label: string;
  diceCount: number;
  diceTypeLabel: string;
  diceTypeValue: number;
  values: string[];
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent) => void;
  inputRef: (index: number, el: HTMLInputElement | null) => void;
  onSubmit?: () => void;
}

export function SpellRollInputsSection({
  label,
  diceCount,
  diceTypeLabel,
  diceTypeValue,
  values,
  onChange,
  onKeyDown,
  inputRef,
}: SpellRollInputsSectionProps) {
  if (diceCount <= 0) return null;

  return (
    <div>
      <Label>
        {label} ({diceCount}
        {diceTypeLabel})
      </Label>
      <div className="space-y-2">
        {Array.from({ length: diceCount }).map((_, index) => (
          <Input
            key={index}
            ref={(el) => inputRef(index, el)}
            type="number"
            min={1}
            max={diceTypeValue}
            value={values[index] ?? ""}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            placeholder={`Кубик ${index + 1} (1-${diceTypeValue})`}
          />
        ))}
      </div>
    </div>
  );
}
