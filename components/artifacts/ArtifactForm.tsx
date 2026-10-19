"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ARTIFACT_FORM_TAB, type ArtifactFormTabId } from "./artifact-form-tabs";
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
import type { ArtifactSetOption } from "@/types/artifacts";

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
  labels: { title: string; description?: string; submit: string; saving: string; iconHint: React.ReactNode };
  actions: { onSubmit: (payload: ArtifactFormSubmitPayload) => Promise<void>; onDelete?: () => Promise<void> };
  cancelHref: string;
}

export function ArtifactForm({ campaignId, artifactSets, initial, mode, labels, actions, cancelHref }: ArtifactFormProps) {
  const router = useRouter();

  const editor = useArtifactForm({ initial, mode, ...actions });

  const { data, set } = editor.form;

  const hasWeapon = isWeaponSlot(data.slot);

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
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Наприклад: Кільце Сар Ісси"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">Рідкість</Label>
              <SelectField
                id="artifact-rarity"
                value={data.rarity}
                onValueChange={(v) => set("rarity", v)}
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
                value={data.slot}
                onValueChange={(v) => set("slot", v)}
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
                value={data.setId || ""}
                onValueChange={(value) => set("setId", value || null)}
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
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Короткий опис артефакту"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <IconUrlField id="artifact-icon" label="Іконка (URL з інтернету)" value={data.icon} onChange={(v) => set("icon", v)} fallbackText={data.name} />
            <p className="text-xs text-muted-foreground">{labels.iconHint}</p>
          </div>
        </div>
      ),
    },
    ...(hasWeapon
      ? [
          {
            id: ARTIFACT_FORM_TAB.weapon,
            label: "Зброя",
            content: <ArtifactWeaponFields value={data.weapon} onChange={(w) => set("weapon", w)} />,
          },
        ]
      : []),
    {
      id: ARTIFACT_FORM_TAB.abilities,
      label: "Вміння",
      invalid: editor.abilities.errors > 0 || initial.abilityIssues.length > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={data.abilities}
          onChange={(a) => set("abilities", a)}
          issues={initial.abilityIssues}
          onValidityChange={(_, n) => editor.abilities.setErrors(n)}
        />
      ),
    },
  ];

  return (
    <HudFormPage title={labels.title} aside={labels.description}>
      {editor.status.error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {editor.status.error}
        </p>
      )}
      <HudForm
        id="artifact-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        tab={activeTab}
        onTabChange={setTab}
        actions={
          <>
            {actions.onDelete && (
              <Button type="button" variant="destructive" onClick={() => void editor.actions.remove()} disabled={editor.status.isBusy}>
                Видалити
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => router.push(cancelHref)} disabled={editor.status.isBusy}>
              Скасувати
            </Button>
            <Button type="submit" disabled={editor.status.isBusy || !editor.abilities.valid}>
              {editor.status.isSaving ? labels.saving : withAbilityErrors(labels.submit, editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
