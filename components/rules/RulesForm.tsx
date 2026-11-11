"use client";

import type { ComponentType, FormEvent } from "react";

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
import { SpellIngredientsSection } from "./sections/SpellIngredientsSection";
import { SystemSection } from "./sections/SystemSection";

import { ErrorState, LoadingState } from "@/components/common/states";
import { HudForm, type HudTab } from "@/components/hud/form";
import { systemUiOf } from "@/components/systems";
import type { RulesSectionProps } from "@/components/systems/types";
import { Button } from "@/components/ui/button";
import { useRulesForm } from "@/lib/hooks/campaigns";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { MechanicKey } from "@/lib/utils/rules";
import { metaOf } from "@/lib/utils/rules/systems/meta";

const FORM_ID = "campaign-rules-form";

const SECTIONS: Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>> = {
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
  spellIngredients: SpellIngredientsSection,
} satisfies Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>>;

export function RulesForm({ campaignId }: { campaignId: string }) {
  const t = useTranslator("rules");

  const tc = useTranslator("common");

  const { form, save, reset, isSaving, isDirty, isLoading, loadError, reload, systemLocked } = useRulesForm(campaignId);

  if (loadError) return <ErrorState error={loadError} onRetry={reload} />;

  if (isLoading) return <LoadingState />;

  const unused: readonly string[] = metaOf(form.data.system.key)?.unusedMechanics ?? [];

  const sections = { ...SECTIONS, ...systemUiOf(form.data.system.key).rulesSections };

  const tabs: HudTab<MechanicKey>[] = (Object.keys(sections) as MechanicKey[]).map((key) => {
    const Section = sections[key] as ComponentType<RulesSectionProps>;

    return {
      id: key,
      label: t(`mechanics.${key}.label`),
      content: (
        <>
          {unused.includes(key) && <p className="mb-3 text-xs text-hud-muted">{t("form.unusedInSystem")}</p>}
          <Section form={form} />
        </>
      ),
    };
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save();
  };

  return (
    <>
      <SystemSection form={form} locked={systemLocked} />
      <HudForm
        id={FORM_ID}
        onSubmit={onSubmit}
        tabs={tabs}
        triggerClassName="flex-none px-3"
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
