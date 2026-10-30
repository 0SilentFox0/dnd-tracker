"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { ClassBasicsTab } from "./ClassBasicsTab";
import { ClassColumnsEditor } from "./ClassColumnsEditor";
import { ClassFeaturesEditor } from "./ClassFeaturesEditor";
import { ClassProgressionMap } from "./progression";
import { SubclassesEditor } from "./SubclassesEditor";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useClassForm } from "@/lib/hooks/classes";
import { useErrorTotals } from "@/lib/hooks/common";
import { useTranslator } from "@/lib/i18n/use-translator";
import { buildClassProgression } from "@/lib/utils/characters/classes";
import type { GameClassData } from "@/types/classes";

type ClassFormTabId = "map" | "basics" | "table" | "features" | "subclasses";

export function ClassForm({ campaignId, gameClass }: { campaignId: string; gameClass: GameClassData }) {
  const t = useTranslations();

  const ta = useTranslator("abilities");

  const { id, ...initial } = gameClass;

  const editor = useClassForm(campaignId, id, initial);

  const [invalid, setInvalid] = useState({ features: false, subclasses: false });

  const { setErrors: setTotal } = editor.abilities;

  const { report } = useErrorTotals((_, total) => setTotal(total));

  const track = (key: keyof typeof invalid) => (_: boolean, n: number) => {
    report(key, n);
    setInvalid((p) => (p[key] === n > 0 ? p : { ...p, [key]: n > 0 }));
  };

  const { data, set } = editor.form;

  const [tab, setTab] = useState<ClassFormTabId>("map");

  const progression = useMemo(() => buildClassProgression({ id, ...data }), [id, data]);

  const tabs: HudTab<ClassFormTabId>[] = [
    {
      id: "map",
      label: t("classes.form.tabs.map"),
      content: <ClassProgressionMap progression={progression} actions={{ onOpenLevel: (_, column) => setTab(column === "subclass" ? "subclasses" : "features") }} />,
    },
    { id: "basics", label: t("common.tabs.basic"), content: <ClassBasicsTab form={editor.form} campaignId={campaignId} /> },
    { id: "table", label: t("classes.form.tabs.table"), content: <ClassColumnsEditor value={data.columns ?? []} onChange={(columns) => set((prev) => ({ ...prev, columns }))} /> },
    {
      id: "features",
      label: t("classes.form.tabs.features"),
      invalid: invalid.features,
      content: (
        <ClassFeaturesEditor
          campaignId={campaignId}
          value={data.features}
          onChange={(features) => set((prev) => ({ ...prev, features }))}
          onValidityChange={track("features")}
          classColumns={data.columns ?? []}
        />
      ),
    },
    {
      id: "subclasses",
      label: t("classes.form.tabs.subclasses"),
      invalid: invalid.subclasses,
      content: <SubclassesEditor campaignId={campaignId} form={editor.form} onValidityChange={track("subclasses")} />,
    },
  ];

  return (
    <HudFormPage title={t("classes.form.title")} aside={t("classes.form.aside")}>
      <HudForm
        id="class-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? t("common.actions.saving") : withAbilityErrors(t("common.actions.save"), editor.abilities.errors, ta)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
