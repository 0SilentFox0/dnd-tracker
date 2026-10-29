"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { FeatBasicsTab } from "./FeatBasicsTab";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useErrorTotals } from "@/lib/hooks/common";
import { useFeatForm } from "@/lib/hooks/feats";
import type { FeatData } from "@/types/choices";

type FeatFormTabId = "basics" | "abilities" | "choices";

export function FeatForm({ campaignId, feat }: { campaignId: string; feat: FeatData }) {
  const t = useTranslations("feats");

  const tc = useTranslations("common");

  const { id, ...initial } = feat;

  const editor = useFeatForm(campaignId, id, initial);

  const { data, set } = editor.form;

  const [invalid, setInvalid] = useState({ abilities: false, choices: false });

  const { report } = useErrorTotals((_, total) => editor.abilities.setErrors(total));

  const track = (key: keyof typeof invalid) => (_: boolean, n: number) => {
    report(key, n);
    setInvalid((p) => (p[key] === n > 0 ? p : { ...p, [key]: n > 0 }));
  };

  const tabs: HudTab<FeatFormTabId>[] = [
    { id: "basics", label: tc("tabs.basic"), content: <FeatBasicsTab form={editor.form} /> },
    { id: "abilities", label: tc("tabs.abilities"), invalid: invalid.abilities, content: <AbilityListEditor campaignId={campaignId} value={data.abilities} onChange={(abilities) => set((p) => ({ ...p, abilities }))} onValidityChange={track("abilities")} /> },
    { id: "choices", label: tc("tabs.choices"), invalid: invalid.choices, content: <ChoiceListEditor campaignId={campaignId} owner="feat" value={data.choices} onChange={(choices) => set((p) => ({ ...p, choices }))} onValidityChange={track("choices")} /> },
  ];

  return (
    <HudFormPage title={t("form.editTitle")} aside={t("form.editAside")}>
      <HudForm
        id="feat-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? tc("actions.saving") : withAbilityErrors(tc("actions.save"), editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
