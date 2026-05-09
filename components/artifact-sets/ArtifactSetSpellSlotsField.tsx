"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPELL_SLOT_LEVEL_KEYS } from "@/lib/constants/artifact-sets";

interface Props {
  spellSlotBonus: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}

export function ArtifactSetSpellSlotsField({
  spellSlotBonus,
  onChange,
}: Props) {
  const setSlotLevel = (lvl: string, n: number) => {
    onChange({
      ...spellSlotBonus,
      [lvl]: Number.isFinite(n) ? n : 0,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Додаткові слоти заклинань</p>
      <p className="text-xs text-muted-foreground">
        Скільки додати до max і current для кожного рівня (1–9).
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
        {SPELL_SLOT_LEVEL_KEYS.map((lvl) => (
          <div key={lvl} className="space-y-1">
            <Label className="text-xs text-muted-foreground">Рів. {lvl}</Label>
            <Input
              type="number"
              value={String(spellSlotBonus[lvl] ?? 0)}
              onChange={(e) =>
                setSlotLevel(
                  lvl,
                  e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
