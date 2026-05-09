"use client";

/**
 * Спільні поля форми Race для обох контекстів:
 * - CreateRaceDialog (модальне вікно)
 * - RaceEditForm (повноцінна сторінка з FormCard)
 *
 * Обгортки різні (Dialog vs FormCard), а поля — однакові.
 * Цей компонент видаляє ~80 рядків дублю.
 */

import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MainSkill } from "@/types/main-skills";
import type { RaceFormData } from "@/types/races";

export interface RaceFormFieldsProps {
  formData: RaceFormData;
  setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
  mainSkills: MainSkill[];
  /** Compact (Dialog) — менший max-h, опис тоншим. */
  compact?: boolean;
}

export function RaceFormFields({
  formData,
  setFormData,
  mainSkills,
  compact = false,
}: RaceFormFieldsProps) {
  const toggleAvailableSkill = (skillId: string) => {
    setFormData((prev) => {
      const isSelected = prev.availableSkills.includes(skillId);

      const newAvailable = isSelected
        ? prev.availableSkills.filter((id) => id !== skillId)
        : [...prev.availableSkills, skillId];

      return {
        ...prev,
        availableSkills: newAvailable,
        // disabledSkills завжди порожній — всі невказані автоматично недоступні.
        disabledSkills: [],
      };
    });
  };

  const skillsListMaxH = compact ? "max-h-40" : "max-h-60";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Назва раси {compact ? "*" : ""}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
          placeholder={compact ? "Наприклад: Люди, Ельфи, Демони" : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label>Доступні скіли для прокачки</Label>
        <p className="text-xs text-muted-foreground">
          Виберіть основні навики, які будуть доступні для прокачки цієї
          раси. Всі невказані навики будуть недоступні.
        </p>
        <div className={`border rounded-md p-3 ${skillsListMaxH} overflow-y-auto`}>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="passiveDescription">Опис пасивної здібності</Label>
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
      </div>

      <div className="space-y-2">
        <Label>Модифікатори характеристик</Label>
        <p className="text-xs text-muted-foreground">
          Виберіть ефекти для кожної характеристики
        </p>
        <RaceEditFormStatModifiers
          formData={formData}
          setFormData={setFormData}
        />
      </div>

      <div className="space-y-2">
        <Label>Прокачка магічних слотів</Label>
        <p className="text-xs text-muted-foreground">
          Вкажіть максимальну кількість магічних слотів для кожного рівня
          магії при прокачці рівня персонажа
        </p>
        <RaceEditFormSpellSlots
          formData={formData}
          setFormData={setFormData}
        />
      </div>
    </>
  );
}
