"use client";

import { Input } from "@/components/ui/input";
import type { RaceFormData, SpellSlotProgression } from "@/types/races";

interface RaceEditFormSpellSlotsProps {
  formData: RaceFormData;
  setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
}

export function RaceEditFormSpellSlots({
  formData,
  setFormData,
}: RaceEditFormSpellSlotsProps) {
  return (
    <div className="border rounded-md p-4">
      <div className="grid grid-cols-2 gap-4 mb-2 pb-2 border-b font-semibold text-sm">
        <div>Рівень магії</div>
        <div>Максимальна кількість слотів</div>
      </div>
      {[1, 2, 3, 4, 5].map((level) => {
        const progression = formData.spellSlotProgression?.find(
          (p) => p.level === level,
        );

        return (
          <div key={level} className="grid grid-cols-2 gap-4 py-2">
            <div className="flex items-center text-sm">Рівень {level}</div>
            <Input
              type="number"
              value={progression?.slots || 0}
              onChange={(e) => {
                const slots = parseInt(e.target.value, 10) || 0;

                setFormData((prev) => {
                  const current = prev.spellSlotProgression || [];

                  const index = current.findIndex((p) => p.level === level);

                  let updated: SpellSlotProgression[];

                  if (index >= 0) {
                    updated = [...current];
                    updated[index] = { level, slots };
                  } else {
                    updated = [...current, { level, slots }];
                  }

                  return { ...prev, spellSlotProgression: updated };
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
