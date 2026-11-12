"use client";

import type { ComponentType, FormEvent } from "react";

import { DefaultAttacksSection } from "./sections/DefaultAttacksSection";
import { EncountersSection } from "./sections/EncountersSection";
import { ItemsSection } from "./sections/ItemsSection";
import { OutOfCombatSection } from "./sections/OutOfCombatSection";
import { SpellIngredientsSection } from "./sections/SpellIngredientsSection";
import { SystemSection } from "./sections/SystemSection";
import { RulesPathsProvider } from "./RulesPaths";

import { ErrorState, LoadingState } from "@/components/common/states";
import { HudForm, type HudTab } from "@/components/hud/form";
import { systemUiOf } from "@/components/systems";
import type { RulesSectionProps } from "@/components/systems/types";
import { Button } from "@/components/ui/button";
import { useRulesForm } from "@/lib/hooks/campaigns";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { MechanicKey } from "@/lib/utils/rules";
import { sectionsOfComposition } from "@/lib/utils/rules/section-registry";
import { rulePaths } from "@/lib/utils/rules/sections";
import { composition } from "@/lib/utils/rules/systems/catalog";

const FORM_ID = "campaign-rules-form";

const CORE_EDITORS: Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>> = {
  defaultAttacks: DefaultAttacksSection,
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

  const ui = systemUiOf(form.data.system.key, form.data.system.modules);

  const active = sectionsOfComposition(composition(form.data.system));

  const editors = { ...CORE_EDITORS, ...ui.rulesSections };

  const keys = (Object.keys(active) as MechanicKey[]).filter((key) => active[key].mechanic && editors[key]);

  const tabs: HudTab<MechanicKey>[] = keys.map((key) => {
    const Section = editors[key] as ComponentType<RulesSectionProps>;

    return { id: key, label: t(`mechanics.${key}.label`), content: <Section form={form} /> };
  });

  const pathsValue = { paths: new Set(rulePaths(active)), items: ui.rulesItems ?? {} };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void save();
  };

  return (
    <>
      <SystemSection form={form} locked={systemLocked} />
      <RulesPathsProvider value={pathsValue}>
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
      </RulesPathsProvider>
      <p className="px-4 pb-4 text-xs text-hud-muted">{t("form.hint")}</p>
    </>
  );
}
