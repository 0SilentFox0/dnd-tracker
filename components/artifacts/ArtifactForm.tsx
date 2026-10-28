"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ARTIFACT_FORM_TAB, type ArtifactFormTabId } from "./artifact-form-tabs";
import { ArtifactArmorFields } from "./ArtifactArmorFields";
import { ArtifactItemFields } from "./ArtifactItemFields";
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
  ARTIFACT_RARITY_VALUES,
  ARTIFACT_SLOT_VALUES,
  ArtifactSlot,
} from "@/lib/constants/artifacts";
import { useArtifactForm } from "@/lib/hooks/artifacts";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import type { ArtifactFormSubmitPayload } from "@/lib/utils/artifacts/artifact-form";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { ItemStats } from "@/lib/utils/items/item-stats";
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
  armor?: ArmorStats | null;
  item?: ItemStats | null;
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
  const t = useTranslations();

  const router = useRouter();

  const editor = useArtifactForm({ initial, mode, ...actions });

  const { data, set } = editor.form;

  const hasWeapon = isWeaponSlot(data.slot);

  const [tab, setTab] = useState<ArtifactFormTabId>(ARTIFACT_FORM_TAB.basic);

  const rules = useCampaignRules(campaignId).data;

  const classesEnabled = !!rules?.classes.enabled;

  const itemsEnabled = !!rules?.items?.enabled;

  const hasArmor = classesEnabled && data.slot === ArtifactSlot.ARMOR && !data.item?.property;

  const tabMissing = (id: ArtifactFormTabId) => (id === ARTIFACT_FORM_TAB.weapon && !hasWeapon) || (id === ARTIFACT_FORM_TAB.armor && !hasArmor);

  if (tabMissing(tab)) setTab(ARTIFACT_FORM_TAB.basic);

  const activeTab = tabMissing(tab) ? ARTIFACT_FORM_TAB.basic : tab;

  const tabs: HudTab<ArtifactFormTabId>[] = [
    {
      id: ARTIFACT_FORM_TAB.basic,
      label: t("artifacts.form.tabs.basic"),
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              id="artifact-name"
              label={t("artifacts.form.name")}
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("artifacts.form.namePlaceholder")}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">{t("artifacts.form.rarity")}</Label>
              <SelectField
                id="artifact-rarity"
                value={data.rarity}
                onValueChange={(v) => set("rarity", v)}
                placeholder={t("artifacts.form.rarityPlaceholder")}
                options={ARTIFACT_RARITY_VALUES.map((value) => ({
                  value,
                  label: t(`artifacts.rarity.${value}`),
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-slot">{t("artifacts.form.slot")}</Label>
              <SelectField
                id="artifact-slot"
                value={data.slot}
                onValueChange={(v) => set("slot", v)}
                placeholder={t("artifacts.form.slotPlaceholder")}
                options={ARTIFACT_SLOT_VALUES.map((value) => ({
                  value,
                  label: t(`artifacts.slots.${value}`),
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-set">{t("artifacts.form.set")}</Label>
              <SelectField
                id="artifact-set"
                value={data.setId || ""}
                onValueChange={(value) => set("setId", value || null)}
                placeholder={t("artifacts.form.noSet")}
                options={artifactSets.map((set) => ({
                  value: set.id,
                  label: set.name,
                }))}
                allowNone
                noneLabel={t("artifacts.form.noSet")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-description">{t("artifacts.form.description")}</Label>
            <Textarea
              id="artifact-description"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("artifacts.form.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <IconUrlField id="artifact-icon" label={t("artifacts.form.icon")} value={data.icon} onChange={(v) => set("icon", v)} fallbackText={data.name} />
            <p className="text-xs text-muted-foreground">{labels.iconHint}</p>
          </div>
        </div>
      ),
    },
    ...(hasWeapon
      ? [
          {
            id: ARTIFACT_FORM_TAB.weapon,
            label: t("artifacts.form.tabs.weapon"),
            content: <ArtifactWeaponFields value={data.weapon} onChange={(w) => set("weapon", w)} bonusOnly={!!data.item?.property} />,
          },
        ]
      : []),
    ...(hasArmor
      ? [{ id: ARTIFACT_FORM_TAB.armor, label: t("artifacts.form.tabs.armor"), content: <ArtifactArmorFields value={data.armor ?? null} onChange={(a) => set("armor", a)} /> }]
      : []),
    {
      id: ARTIFACT_FORM_TAB.item,
      label: t("artifacts.form.tabs.item"),
      content: <ArtifactItemFields campaignId={campaignId} name={data.name} slot={data.slot} value={data.item} onChange={(item) => set("item", item)} itemsEnabled={itemsEnabled} />,
    },
    {
      id: ARTIFACT_FORM_TAB.abilities,
      label: t("artifacts.form.tabs.abilities"),
      invalid: editor.abilities.errors > 0 || initial.abilityIssues.length > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          itemCharges={!!data.item?.charges || !!data.item?.consumable}
          value={data.abilities}
          onChange={(a) => set("abilities", a)}
          issues={initial.abilityIssues}
          onValidityChange={editor.abilities.onValidityChange}
        />
      ),
    },
  ];

  return (
    <HudFormPage title={labels.title} aside={labels.description}>
      <HudForm
        id="artifact-form"
        onSubmit={editor.actions.submit}
        error={editor.status.error}
        tabs={tabs}
        tab={activeTab}
        onTabChange={setTab}
        actions={
          <>
            {actions.onDelete && (
              <Button type="button" variant="destructive" onClick={() => void editor.actions.remove()} disabled={editor.status.isBusy}>
                {t("common.actions.delete")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => router.push(cancelHref)} disabled={editor.status.isBusy}>
              {t("common.actions.cancel")}
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
