"use client";

import type { FormEvent } from "react";

import { ConcentrationSection } from "./sections/ConcentrationSection";
import { ConditionsSection } from "./sections/ConditionsSection";
import { CriticalsSection } from "./sections/CriticalsSection";
import { DeathSavesSection } from "./sections/DeathSavesSection";
import { DefaultAttacksSection } from "./sections/DefaultAttacksSection";
import { FormulasSection } from "./sections/FormulasSection";
import { HeroScalingSection } from "./sections/HeroScalingSection";
import { InitiativeSection } from "./sections/InitiativeSection";
import { MoraleSection } from "./sections/MoraleSection";
import { SavesSection } from "./sections/SavesSection";

import { LoadingState } from "@/components/common/states";
import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useRulesForm } from "@/lib/hooks/campaigns";
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
} satisfies Record<keyof Ruleset, unknown>;

export function RulesForm({ campaignId }: { campaignId: string }) {
  const { form, save, reset, isSaving, isDirty, isLoading } = useRulesForm(campaignId);

  if (isLoading) return <LoadingState />;

  const tabs: HudTab<keyof Ruleset>[] = (Object.keys(MECHANIC_REGISTRY) as (keyof Ruleset)[]).map((key) => {
    const Section = SECTIONS[key];

    return { id: key, label: MECHANIC_REGISTRY[key].label, content: <Section form={form} /> };
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
              Скасувати
            </Button>
            <Button type="submit" disabled={!isDirty || isSaving}>
              Зберегти
            </Button>
          </>
        }
      />
      <p className="px-4 pb-4 text-xs text-hud-muted">Зміни діють для нових боїв; бій, що вже йде, використовує правила, зафіксовані на його старті</p>
    </>
  );
}
