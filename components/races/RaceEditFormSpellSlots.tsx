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
      <div className="mb-2 flex flex-wrap justify-between gap-x-4 border-b pb-2 text-sm font-semibold">
        <div>Рівень магії</div>
        <div>Максимальна кількість слотів</div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {[1, 2, 3, 4, 5].map((level) => {
        const progression = formData.spellSlotProgression?.find(
          (p) => p.level === level,
        );

        return (
          <div key={level} className="space-y-1">
            <div className="text-xs leading-tight">Рівень {level}</div>
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
    </div>
  );
}
