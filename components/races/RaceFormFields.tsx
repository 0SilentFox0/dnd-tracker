"use client";

import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";

import { AbilityListEditor } from "@/components/abilities";
import { ColorField } from "@/components/common/ColorField";
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
  mainSkills?: MainSkill[];
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

      <ImageUpload value={formData.icon ?? ""} onChange={(v) => setFormData((prev) => ({ ...prev, icon: v }))} label="Іконка раси" fallbackText={formData.name} allowFile={false} />

      <ColorField
        id="race-color"
        label="Колір раси"
        value={formData.color ?? ""}
        onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
        description="Смуга й чіп раси у списку юнітів; порожньо — колір із палітри"
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
