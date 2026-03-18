"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";
import { getInitialRaceFormData } from "./RaceEditFormUtils";

import { FormCard } from "@/components/common/FormCard";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateRace } from "@/lib/hooks/races";
import { useMainSkills } from "@/lib/hooks/skills";
import type { Race } from "@/types/races";
import type { RaceFormData } from "@/types/races";

interface RaceEditFormProps {
  campaignId: string;
  race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
  const router = useRouter();

  const updateRaceMutation = useUpdateRace(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(() =>
    getInitialRaceFormData(race),
  );

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
        <RaceEditFormStatModifiers formData={formData} setFormData={setFormData} />
      </FormField>

      <FormField
        label="Прокачка магічних слотів"
        description="Вкажіть максимальну кількість магічних слотів для кожного рівня магії при прокачці рівня персонажа"
      >
        <RaceEditFormSpellSlots formData={formData} setFormData={setFormData} />
      </FormField>
    </FormCard>
  );
}
