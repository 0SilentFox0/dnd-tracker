"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ARTIFACT_FORM_TAB, type ArtifactFormTabId } from "./artifact-form-tabs";
import type { ArtifactSetOption } from "./ArtifactEditForm-types";
import { ArtifactWeaponFields } from "./ArtifactWeaponFields";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  ARTIFACT_RARITY_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
} from "@/lib/constants/artifacts";
import { useArtifactForm } from "@/lib/hooks/artifacts";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ArtifactFormSubmitPayload } from "@/lib/utils/artifacts/artifact-form";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

export type { ArtifactFormSubmitPayload };

export interface ArtifactFormInitial {
  name: string;
  description: string;
  rarity: string;
  slot: string;
  icon: string;
  setId: string | null;
  abilities: Ability[];
  abilityIssues: ConversionIssue[];
  weapon?: WeaponStats;
}

export interface ArtifactFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
  initial: ArtifactFormInitial;
  mode: "create" | "edit";
  title: string;
  description?: string;
  submitLabel: string;
  submitLabelSaving: string;
  onSubmit: (payload: ArtifactFormSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  cancelHref: string;
  iconHint: React.ReactNode;
}

export function ArtifactForm({
  campaignId,
  artifactSets,
  initial,
  mode,
  title,
  description: cardDescription,
  submitLabel,
  submitLabelSaving,
  onSubmit,
  onDelete,
  cancelHref,
  iconHint,
}: ArtifactFormProps) {
  const router = useRouter();

  const form = useArtifactForm({ initial, mode, onSubmit, onDelete });

  const { fields, setField } = form;

  const hasWeapon = isWeaponSlot(fields.slot);

  const [tab, setTab] = useState<ArtifactFormTabId>(ARTIFACT_FORM_TAB.basic);

  if (!hasWeapon && tab === ARTIFACT_FORM_TAB.weapon) setTab(ARTIFACT_FORM_TAB.basic);

  const activeTab = hasWeapon || tab !== ARTIFACT_FORM_TAB.weapon ? tab : ARTIFACT_FORM_TAB.basic;

  const tabs: HudTab<ArtifactFormTabId>[] = [
    {
      id: ARTIFACT_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              id="artifact-name"
              label="Назва"
              value={fields.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Наприклад: Кільце Сар Ісси"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">Рідкість</Label>
              <SelectField
                id="artifact-rarity"
                value={fields.rarity}
                onValueChange={(v) => setField("rarity", v)}
                placeholder="Виберіть рідкість"
                options={ARTIFACT_RARITY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-slot">Слот</Label>
              <SelectField
                id="artifact-slot"
                value={fields.slot}
                onValueChange={(v) => setField("slot", v)}
                placeholder="Виберіть слот"
                options={ARTIFACT_SLOT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-set">Сет</Label>
              <SelectField
                id="artifact-set"
                value={fields.setId || ""}
                onValueChange={(value) => setField("setId", value || null)}
                placeholder="Без сету"
                options={artifactSets.map((set) => ({
                  value: set.id,
                  label: set.name,
                }))}
                allowNone
                noneLabel="Без сету"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-description">Опис</Label>
            <Textarea
              id="artifact-description"
              value={fields.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Короткий опис артефакту"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <IconUrlField id="artifact-icon" label="Іконка (URL з інтернету)" value={fields.icon} onChange={(v) => setField("icon", v)} fallbackText={fields.name} />
            <p className="text-xs text-muted-foreground">{iconHint}</p>
          </div>
        </div>
      ),
    },
    ...(hasWeapon
      ? [
          {
            id: ARTIFACT_FORM_TAB.weapon,
            label: "Зброя",
            content: <ArtifactWeaponFields value={fields.weapon} onChange={(w) => setField("weapon", w)} />,
          },
        ]
      : []),
    {
      id: ARTIFACT_FORM_TAB.abilities,
      label: "Вміння",
      invalid: form.abilityErrors > 0 || initial.abilityIssues.length > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={fields.abilities}
          onChange={(a) => setField("abilities", a)}
          issues={initial.abilityIssues}
          onValidityChange={(_, n) => form.setAbilityErrors(n)}
        />
      ),
    },
  ];

  return (
    <HudFormPage title={title} aside={cardDescription}>
      {form.error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-[#d0705c]/50 bg-[#d0705c]/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {form.error}
        </p>
      )}
      <HudForm
        id="artifact-form"
        onSubmit={form.submit}
        tabs={tabs}
        tab={activeTab}
        onTabChange={setTab}
        actions={
          <>
            {onDelete && (
              <Button type="button" variant="destructive" onClick={() => void form.remove()} disabled={form.isBusy}>
                Видалити
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => router.push(cancelHref)} disabled={form.isBusy}>
              Скасувати
            </Button>
            <Button type="submit" disabled={form.isBusy || !form.abilitiesValid}>
              {form.isSaving ? submitLabelSaving : withAbilityErrors(submitLabel, form.abilityErrors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
