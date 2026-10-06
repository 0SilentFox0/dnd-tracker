"use client";

import { useState } from "react";

import { RACE_FORM_TAB, type RaceFormTabId } from "./race-form-tabs";
import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";

import { AbilityListEditor } from "@/components/abilities";
import { ColorField } from "@/components/common/ColorField";
import { HudSection, type HudTab, HudTabs } from "@/components/hud/form";
import { useRevealInvalidTab } from "@/components/hud/form/reveal-invalid-tab";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
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
  const [tab, setTab] = useState<RaceFormTabId>(RACE_FORM_TAB.basic);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const onInvalidCapture = useRevealInvalidTab(tab, setTab);

  const handleAbilitiesValidity = (ok: boolean, errorCount: number) => {
    setAbilityErrors(errorCount);
    onAbilitiesValidityChange?.(ok, errorCount);
  };

  const tabs: HudTab<RaceFormTabId>[] = [
    {
      id: RACE_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-4">
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
        </div>
      ),
    },
    {
      id: RACE_FORM_TAB.stats,
      label: "Характеристики",
      content: (
        <div className="space-y-4">
          <HudSection title="Модифікатори характеристик" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Виберіть ефекти для кожної характеристики
            </p>
            <RaceEditFormStatModifiers
              formData={formData}
              setFormData={setFormData}
            />
          </HudSection>

          <HudSection title="Прокачка магічних слотів" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Вкажіть максимальну кількість магічних слотів для кожного рівня
              магії при прокачці рівня персонажа
            </p>
            <RaceEditFormSpellSlots
              formData={formData}
              setFormData={setFormData}
            />
          </HudSection>
        </div>
      ),
    },
    {
      id: RACE_FORM_TAB.abilities,
      label: "Вміння",
      invalid: (abilityIssues?.length ?? 0) > 0 || abilityErrors > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={formData.abilities}
          onChange={(abilities) => setFormData((prev) => ({ ...prev, abilities }))}
          issues={abilityIssues}
          onValidityChange={handleAbilitiesValidity}
        />
      ),
    },
  ];

  return (
    <div onInvalidCapture={onInvalidCapture}>
      <HudTabs tabs={tabs} value={tab} onValueChange={setTab} keepMounted contentClassName="px-0" />
    </div>
  );
}
