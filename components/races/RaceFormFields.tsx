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

import { AbilityListEditor } from "@/components/abilities";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
import type { MainSkill } from "@/types/main-skills";
import type { RaceFormData } from "@/types/races";

export interface RaceFormFieldsProps {
  campaignId: string;
  formData: RaceFormData;
  setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
  /** Не використовується: набір гілок раси тепер задає дерево прокачки. */
  mainSkills?: MainSkill[];
  /** Compact (Dialog) — менший max-h, опис тоншим. */
  compact?: boolean;
  abilityIssues?: ConversionIssue[];
  onAbilitiesValidityChange?: (ok: boolean, errorCount: number) => void;
}

export function RaceFormFields({
  campaignId,
  formData,
  setFormData,
  compact = false,
  abilityIssues,
  onAbilitiesValidityChange,
}: RaceFormFieldsProps) {
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

      <ImageUpload
        value={formData.icon ?? ""}
        onChange={(v) => setFormData((prev) => ({ ...prev, icon: v }))}
        label="Іконка раси"
        placeholder="URL іконки раси або завантажте файл"
        previewAlt="Іконка раси"
      />

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

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Вміння в бою</h3>
        <AbilityListEditor
          campaignId={campaignId}
          value={formData.abilities}
          onChange={(abilities) => setFormData((prev) => ({ ...prev, abilities }))}
          issues={abilityIssues}
          onValidityChange={onAbilitiesValidityChange}
        />
      </div>
    </>
  );
}
