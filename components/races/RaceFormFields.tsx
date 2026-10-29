"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { RACE_FORM_TAB, type RaceFormTabId } from "./race-form-tabs";
import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";

import { AbilityListEditor } from "@/components/abilities";
import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { ColorField } from "@/components/common/ColorField";
import { HudSection, type HudTab, HudTabs } from "@/components/hud/form";
import { useRevealInvalidTab } from "@/components/hud/form/reveal-invalid-tab";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { RaceFormData } from "@/types/races";

export interface RaceFormFieldsProps {
  campaignId: string;
  form: { data: RaceFormData; set: React.Dispatch<React.SetStateAction<RaceFormData>> };
  compact?: boolean;
  abilityIssues?: ConversionIssue[];
  onAbilitiesValidityChange?: (ok: boolean, errorCount: number) => void;
}

export function RaceFormFields({
  campaignId,
  form: { data: formData, set: setFormData },
  compact = false,
  abilityIssues,
  onAbilitiesValidityChange,
}: RaceFormFieldsProps) {
  const t = useTranslations("races");

  const tc = useTranslations("common");

  const [tab, setTab] = useState<RaceFormTabId>(RACE_FORM_TAB.basic);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const [choiceErrors, setChoiceErrors] = useState(0);

  const onInvalidCapture = useRevealInvalidTab(tab, setTab);

  const handleAbilitiesValidity = (ok: boolean, errorCount: number) => {
    setAbilityErrors(errorCount);
    onAbilitiesValidityChange?.(ok, errorCount);
  };

  const tabs: HudTab<RaceFormTabId>[] = [
    {
      id: RACE_FORM_TAB.basic,
      label: tc("tabs.basic"),
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{compact ? t("form.nameRequired") : t("form.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              placeholder={compact ? t("form.namePlaceholder") : undefined}
            />
          </div>

          <ImageUpload value={formData.icon ?? ""} onChange={(v) => setFormData((prev) => ({ ...prev, icon: v }))} label={t("form.icon")} fallbackText={formData.name} allowFile={false} />

          <ColorField
            id="race-color"
            label={t("form.color")}
            value={formData.color ?? ""}
            onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
            description={t("form.colorDescription")}
          />

          <div className="space-y-2">
            <Label htmlFor="passiveDescription">{t("form.passiveDescription")}</Label>
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
              placeholder={t("form.passivePlaceholder")}
              rows={3}
            />
          </div>
        </div>
      ),
    },
    {
      id: RACE_FORM_TAB.stats,
      label: t("form.tabs.stats"),
      content: (
        <div className="space-y-4">
          <HudSection title={t("form.statModifiersTitle")} className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("form.statModifiersHint")}
            </p>
            <RaceEditFormStatModifiers
              formData={formData}
              setFormData={setFormData}
            />
          </HudSection>

          <HudSection title={t("form.slotsTitle")} className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("form.slotsHint")}
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
      label: tc("tabs.abilities"),
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
    ...(compact
      ? []
      : [
          {
            id: RACE_FORM_TAB.choices,
            label: t("form.tabs.choices"),
            invalid: choiceErrors > 0,
            content: (
              <ChoiceListEditor
                campaignId={campaignId}
                owner="race"
                value={formData.choices ?? []}
                onChange={(choices) => setFormData((prev) => ({ ...prev, choices }))}
                onValidityChange={(ok, n) => {
                  setChoiceErrors(n);
                  onAbilitiesValidityChange?.(ok && abilityErrors === 0, abilityErrors + n);
                }}
              />
            ),
          },
        ]),
  ];

  return (
    <div onInvalidCapture={onInvalidCapture}>
      <HudTabs tabs={tabs} value={tab} onValueChange={setTab} keepMounted contentClassName="px-0" />
    </div>
  );
}
