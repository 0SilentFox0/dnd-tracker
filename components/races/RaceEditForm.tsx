"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormCard } from "@/components/common/FormCard";
import { FormField } from "@/components/common/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_SCORES } from "@/lib/constants/abilities";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useUpdateRace } from "@/lib/hooks/useRaces";
import type { Race } from "@/types/races";
import type { RaceFormData, StatModifier } from "@/types/races";
import type { SpellSlotProgression } from "@/types/races";

interface RaceEditFormProps {
  campaignId: string;
  race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
  const router = useRouter();

  const updateRaceMutation = useUpdateRace(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const parsePassiveAbility = (pa: unknown) => {
    if (!pa) {
      return { description: "", statImprovements: "", statModifiers: {} };
    }

    if (typeof pa === "string") {
      return { description: pa, statImprovements: "", statModifiers: {} };
    }

    if (typeof pa === "object" && pa !== null) {
      const obj = pa as Record<string, unknown>;

      const statModifiers = obj.statModifiers;

      // Переконуємося, що statModifiers є об'єктом
      const parsedModifiers =
        statModifiers &&
        typeof statModifiers === "object" &&
        !Array.isArray(statModifiers)
          ? (statModifiers as Record<string, StatModifier>)
          : {};

      return {
        description: String(obj.description || ""),
        statImprovements: String(obj.statImprovements || ""),
        statModifiers: parsedModifiers,
      };
    }

    return { description: "", statImprovements: "", statModifiers: {} };
  };

  const [formData, setFormData] = useState<RaceFormData>(() => {
    const parsedPassiveAbility = parsePassiveAbility(race.passiveAbility);

    const progression = Array.isArray(race.spellSlotProgression)
      ? (race.spellSlotProgression as SpellSlotProgression[])
      : [];

    return {
      name: race.name,
      availableSkills: Array.isArray(race.availableSkills)
        ? race.availableSkills
        : [],
      disabledSkills: [], // Залишаємо для сумісності, але не використовуємо
      passiveAbility: parsedPassiveAbility,
      spellSlotProgression:
        progression.length > 0
          ? progression
          : [
              { level: 1, slots: 0 },
              { level: 2, slots: 0 },
              { level: 3, slots: 0 },
              { level: 4, slots: 0 },
              { level: 5, slots: 0 },
            ],
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Переконуємося, що statModifiers включені в дані для збереження
    const dataToSave: RaceFormData = {
      ...formData,
      passiveAbility: {
        description: formData.passiveAbility?.description || "",
        statImprovements: formData.passiveAbility?.statImprovements || "",
        statModifiers: formData.passiveAbility?.statModifiers || {},
      },
    };

    updateRaceMutation.mutate(
      { raceId: race.id, data: dataToSave },
      {
        onSuccess: () => {
          router.push(`/campaigns/${campaignId}/dm/races`);
          router.refresh();
        },
      },
    );
  };

  const toggleAvailableSkill = (skillId: string) => {
    setFormData((prev) => {
      const isSelected = prev.availableSkills.includes(skillId);

      const newAvailable = isSelected
        ? prev.availableSkills.filter((id) => id !== skillId)
        : [...prev.availableSkills, skillId];

      return {
        ...prev,
        availableSkills: newAvailable,
        // disabledSkills завжди порожній, оскільки всі невказані автоматично недоступні
        disabledSkills: [],
      };
    });
  };

  return (
    <FormCard
      title="Редагувати расу"
      description="Оновіть інформацію про расу"
      onSubmit={handleSubmit}
      isSubmitting={updateRaceMutation.isPending}
      onCancel={() => router.push(`/campaigns/${campaignId}/dm/races`)}
      submitLabel="Зберегти"
    >
      <FormField label="Назва раси" htmlFor="name" required>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </FormField>

      <FormField
        label="Доступні скіли для прокачки"
        description="Виберіть основні навики, які будуть доступні для прокачки цієї раси. Всі невказані навики будуть недоступні."
      >
        <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
          {mainSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Немає доступних основних навиків. Створіть їх в розділі
              &quot;Основні Навики&quot;.
            </p>
          ) : (
            <div className="space-y-2">
              {mainSkills.map((mainSkill) => (
                <label
                  key={mainSkill.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.availableSkills.includes(mainSkill.id)}
                    onChange={() => toggleAvailableSkill(mainSkill.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{mainSkill.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </FormField>

      <FormField label="Опис пасивної здібності" htmlFor="passiveDescription">
        <Textarea
          id="passiveDescription"
          value={formData.passiveAbility?.description || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              passiveAbility: {
                ...prev.passiveAbility,
                description: e.target.value,
                statImprovements: prev.passiveAbility?.statImprovements || "",
                statModifiers: prev.passiveAbility?.statModifiers || {},
              },
            }))
          }
          placeholder="Наприклад: Імунітет до вогню, Мораль завжди >= 0"
          rows={3}
        />
      </FormField>

      <FormField
        label="Модифікатори характеристик"
        description="Виберіть ефекти для кожної характеристики"
      >
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
                                  checked === true
                                    ? false
                                    : modifiers.alwaysZero,
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
                                  checked === true
                                    ? false
                                    : modifiers.alwaysZero,
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
                                  checked === true
                                    ? false
                                    : modifiers.nonNegative,
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
      </FormField>

      <FormField
        label="Прокачка магічних слотів"
        description="Вкажіть максимальну кількість магічних слотів для кожного рівня магії при прокачці рівня персонажа"
      >
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

                      let updated;

                      if (index >= 0) {
                        updated = [...current];
                        updated[index] = { level, slots };
                      } else {
                        updated = [...current, { level, slots }];
                      }

                      return {
                        ...prev,
                        spellSlotProgression: updated,
                      };
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </FormField>
    </FormCard>
  );
}
