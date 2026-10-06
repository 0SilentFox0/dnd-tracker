"use client";

import Link from "next/link";

import type { SpellFormData } from "./spell-form-defaults";
import { SPELL_FORM_TAB, type SpellFormTabId } from "./spell-form-tabs";
import { SpellDamageDistributionField } from "./SpellDamageDistributionField";
import { SpellFormBasicFields, SpellFormRollFields } from "./SpellFormBasicFields";
import { SpellFormEffectsAndMeta } from "./SpellFormEffectsAndMeta";
import { SpellFormSavingThrow } from "./SpellFormSavingThrow";

import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";

export interface SpellFormBodyProps {
  campaignId: string;
  formData: SpellFormData;
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void;
  spellGroups: { id: string; name: string }[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string | null;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function SpellFormBody({
  campaignId,
  formData,
  setFormData,
  spellGroups,
  onSubmit,
  isSubmitting,
  submitLabel,
  error,
  onDelete,
  isDeleting,
}: SpellFormBodyProps) {
  const tabs: HudTab<SpellFormTabId>[] = [
    {
      id: SPELL_FORM_TAB.basic,
      label: "Основне",
      content: <SpellFormBasicFields formData={formData} setFormData={setFormData} spellGroups={spellGroups} />,
    },
    {
      id: SPELL_FORM_TAB.roll,
      label: "Кидок",
      content: (
        <div className="space-y-4">
          <SpellFormRollFields formData={formData} setFormData={setFormData} />
          <SpellDamageDistributionField
            damageDistribution={formData.damageDistribution}
            onChange={(next) => setFormData({ ...formData, damageDistribution: next })}
          />
          <SpellFormSavingThrow formData={formData} setFormData={setFormData} />
        </div>
      ),
    },
    {
      id: SPELL_FORM_TAB.effects,
      label: "Ефекти",
      content: (
        <div className="space-y-4">
          <SpellFormEffectsAndMeta campaignId={campaignId} formData={formData} setFormData={setFormData} />
        </div>
      ),
    },
  ];

  return (
    <>
      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-[#d0705c]/50 bg-[#d0705c]/10 px-3 py-2 text-sm text-[#f0b4a6]">
          <strong>Помилка:</strong> {error}
        </p>
      )}
      <HudForm
        id="spell-form"
        onSubmit={onSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Збереження..." : submitLabel}
            </Button>
            {onDelete != null && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? "Видалення..." : "Видалити"}
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
