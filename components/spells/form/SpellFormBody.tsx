"use client";

import Link from "next/link";

import type { SpellFormData } from "./spell-form-defaults";
import { SPELL_FORM_TAB, type SpellFormTabId } from "./spell-form-tabs";
import { SpellFormBasicFields } from "./SpellFormBasicFields";
import { SpellFormEffects } from "./SpellFormEffects";
import { SpellFormPowerFields } from "./SpellFormPowerFields";

import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import type { IdName } from "@/types/common";

export interface SpellFormBodyProps {
  campaignId: string;
  form: { data: SpellFormData; set: (data: SpellFormData) => void };
  spellGroups: IdName[];
  submit: {
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
    label: string;
    error?: string | null;
  };
  remove?: { onDelete: () => void; isDeleting: boolean };
}

export function SpellFormBody({
  campaignId,
  form,
  spellGroups,
  submit,
  remove,
}: SpellFormBodyProps) {
  const { data: formData, set: setFormData } = form;

  const tabs: HudTab<SpellFormTabId>[] = [
    {
      id: SPELL_FORM_TAB.basic,
      label: "Основне",
      content: <SpellFormBasicFields formData={formData} setFormData={setFormData} spellGroups={spellGroups} />,
    },
    {
      id: SPELL_FORM_TAB.roll,
      label: "Сила",
      content: <SpellFormPowerFields formData={formData} setFormData={setFormData} />,
    },
    {
      id: SPELL_FORM_TAB.effects,
      label: "Ефекти",
      content: (
        <div className="space-y-4">
          <SpellFormEffects campaignId={campaignId} formData={formData} setFormData={setFormData} />
        </div>
      ),
    },
  ];

  return (
    <>
      {submit.error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
          <strong>Помилка:</strong> {submit.error}
        </p>
      )}
      <HudForm
        id="spell-form"
        onSubmit={submit.onSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Збереження..." : submit.label}
            </Button>
            {remove && (
              <Button type="button" variant="destructive" onClick={remove.onDelete} disabled={remove.isDeleting}>
                {remove.isDeleting ? "Видалення..." : "Видалити"}
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/spells`}>Скасувати</Link>
            </Button>
          </>
        }
      />
    </>
  );
}
