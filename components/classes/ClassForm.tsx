"use client";

import { useState } from "react";

import { ClassBasicsTab } from "./ClassBasicsTab";
import { ClassColumnsEditor } from "./ClassColumnsEditor";
import { ClassFeaturesEditor } from "./ClassFeaturesEditor";
import { SubclassesEditor } from "./SubclassesEditor";
import { useErrorTotals } from "./use-error-totals";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useClassForm } from "@/lib/hooks/classes";
import type { GameClassData } from "@/types/classes";

type ClassFormTabId = "basics" | "table" | "features" | "subclasses";

export function ClassForm({ campaignId, gameClass }: { campaignId: string; gameClass: GameClassData }) {
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

  const tabs: HudTab<ClassFormTabId>[] = [
    { id: "basics", label: "Основне", content: <ClassBasicsTab form={editor.form} campaignId={campaignId} /> },
    { id: "table", label: "Таблиця класу", content: <ClassColumnsEditor value={data.columns ?? []} onChange={(columns) => set((prev) => ({ ...prev, columns }))} /> },
    {
      id: "features",
      label: "Вміння за рівнями",
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
      label: "Підкласи",
      invalid: invalid.subclasses,
      content: <SubclassesEditor campaignId={campaignId} form={editor.form} onValidityChange={track("subclasses")} />,
    },
  ];

  return (
    <HudFormPage title="Редагувати клас" aside="Основне, вміння за рівнями та підкласи">
      <HudForm
        id="class-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              Скасувати
            </Button>
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? "Збереження..." : withAbilityErrors("Зберегти", editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
