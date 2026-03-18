"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ABILITY_SCORES } from "@/lib/constants/abilities";
import type { RaceFormData } from "@/types/races";

interface RaceEditFormStatModifiersProps {
  formData: RaceFormData;
  setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
}

export function RaceEditFormStatModifiers({
  formData,
  setFormData,
}: RaceEditFormStatModifiersProps) {
  return (
    <div className="border rounded-md p-3 space-y-4 max-h-96 overflow-y-auto">
      {ABILITY_SCORES.map((ability) => {
        const modifiers =
          formData.passiveAbility?.statModifiers?.[ability.key] || {};

        return (
          <div
            key={ability.key}
            className="space-y-2 pb-3 border-b last:border-0"
          >
            <Label className="text-sm font-semibold mt-2">
              {ability.label} ({ability.abbreviation})
            </Label>
            <div className="space-y-2 pl-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ability.key}-bonus`}
                  checked={modifiers.bonus || false}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      passiveAbility: {
                        ...prev.passiveAbility,
                        description: prev.passiveAbility?.description || "",
                        statImprovements:
                          prev.passiveAbility?.statImprovements || "",
                        statModifiers: {
                          ...prev.passiveAbility?.statModifiers,
                          [ability.key]: {
                            ...modifiers,
                            bonus: checked === true,
                            alwaysZero:
                              checked === true ? false : modifiers.alwaysZero,
                          },
                        },
                      },
                    }));
                  }}
                />
                <Label
                  htmlFor={`${ability.key}-bonus`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Дати + (бонус)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ability.key}-non-negative`}
                  checked={modifiers.nonNegative || false}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      passiveAbility: {
                        ...prev.passiveAbility,
                        description: prev.passiveAbility?.description || "",
                        statImprovements:
                          prev.passiveAbility?.statImprovements || "",
                        statModifiers: {
                          ...prev.passiveAbility?.statModifiers,
                          [ability.key]: {
                            ...modifiers,
                            nonNegative: checked === true,
                            alwaysZero:
                              checked === true ? false : modifiers.alwaysZero,
                          },
                        },
                      },
                    }));
                  }}
                />
                <Label
                  htmlFor={`${ability.key}-non-negative`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Зробити невід`ємним (мінімум 0)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ability.key}-always-zero`}
                  checked={modifiers.alwaysZero || false}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      passiveAbility: {
                        ...prev.passiveAbility,
                        description: prev.passiveAbility?.description || "",
                        statImprovements:
                          prev.passiveAbility?.statImprovements || "",
                        statModifiers: {
                          ...prev.passiveAbility?.statModifiers,
                          [ability.key]: {
                            bonus:
                              checked === true ? false : modifiers.bonus,
                            nonNegative:
                              checked === true ? false : modifiers.nonNegative,
                            alwaysZero: checked === true,
                          },
                        },
                      },
                    }));
                  }}
                />
                <Label
                  htmlFor={`${ability.key}-always-zero`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Завжди 0
                </Label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
