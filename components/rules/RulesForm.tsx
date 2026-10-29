"use client";

import type { FormEvent } from "react";

import { ActionsSection } from "./sections/ActionsSection";
import { ClassesSection } from "./sections/ClassesSection";
import { ConcentrationSection } from "./sections/ConcentrationSection";
import { ConditionsSection } from "./sections/ConditionsSection";
import { CriticalsSection } from "./sections/CriticalsSection";
import { DeathSavesSection } from "./sections/DeathSavesSection";
import { DefaultAttacksSection } from "./sections/DefaultAttacksSection";
import { EncountersSection } from "./sections/EncountersSection";
import { FormulasSection } from "./sections/FormulasSection";
import { HeroScalingSection } from "./sections/HeroScalingSection";
import { InitiativeSection } from "./sections/InitiativeSection";
import { ItemsSection } from "./sections/ItemsSection";
import { MoraleSection } from "./sections/MoraleSection";
import { OutOfCombatSection } from "./sections/OutOfCombatSection";
import { SavesSection } from "./sections/SavesSection";

import { ErrorState, LoadingState } from "@/components/common/states";
import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useRulesForm } from "@/lib/hooks/campaigns";
import { useTranslator } from "@/lib/i18n/use-translator";
import { MECHANIC_REGISTRY, type Ruleset } from "@/lib/utils/rules";

const FORM_ID = "campaign-rules-form";

const SECTIONS = {
  morale: MoraleSection,
  criticals: CriticalsSection,
  formulas: FormulasSection,
  heroScaling: HeroScalingSection,
  initiative: InitiativeSection,
  defaultAttacks: DefaultAttacksSection,
  saves: SavesSection,
  deathSaves: DeathSavesSection,
  concentration: ConcentrationSection,
  conditions: ConditionsSection,
  actions: ActionsSection,
  classes: ClassesSection,
  outOfCombat: OutOfCombatSection,
  encounters: EncountersSection,
  items: ItemsSection,
} satisfies Record<keyof Ruleset, unknown>;

export function RulesForm({ campaignId }: { campaignId: string }) {
  const t = useTranslator("rules");

  const tc = useTranslator("common");

  const { form, save, reset, isSaving, isDirty, isLoading, loadError, reload } = useRulesForm(campaignId);

  if (loadError) return <ErrorState error={loadError} onRetry={reload} />;

  if (isLoading) return <LoadingState />;

  const tabs: HudTab<keyof Ruleset>[] = (Object.keys(MECHANIC_REGISTRY) as (keyof Ruleset)[]).map((key) => {
    const Section = SECTIONS[key];

    return { id: key, label: t(`mechanics.${key}.label`), content: <Section form={form} /> };
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save();
  };

  return (
    <>
      <HudForm
        id={FORM_ID}
        onSubmit={onSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" disabled={!isDirty || isSaving} onClick={reset}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={!isDirty || isSaving}>
              {tc("actions.save")}
            </Button>
          </>
        }
      />
      <p className="px-4 pb-4 text-xs text-hud-muted">{t("form.hint")}</p>
    </>
  );
}
