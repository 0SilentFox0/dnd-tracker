"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { SpellFormData } from "./spell-form-defaults";
import { SPELL_FORM_TAB, type SpellFormTabId } from "./spell-form-tabs";
import { SpellFormBasicFields } from "./SpellFormBasicFields";
import { SpellFormEffects } from "./SpellFormEffects";
import { SpellFormPowerFields } from "./SpellFormPowerFields";

import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useCampaignRules } from "@/lib/hooks/campaigns";
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
  const t = useTranslations();

  const { data: formData, set: setFormData } = form;

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const tabs: HudTab<SpellFormTabId>[] = [
    {
      id: SPELL_FORM_TAB.basic,
      label: t("spellEditor.tabs.basic"),
      content: <SpellFormBasicFields formData={formData} setFormData={setFormData} spellGroups={spellGroups} />,
    },
    {
      id: SPELL_FORM_TAB.roll,
      label: t("spellEditor.tabs.power"),
      content: <SpellFormPowerFields formData={formData} setFormData={setFormData} classesEnabled={classesEnabled} />,
    },
    {
      id: SPELL_FORM_TAB.effects,
      label: t("spellEditor.tabs.effects"),
      content: (
        <div className="space-y-4">
          <SpellFormEffects campaignId={campaignId} formData={formData} setFormData={setFormData} />
        </div>
      ),
    },
  ];

  return (
    <>
      {formData.executionMode === "manual" && <p role="status">{t("spellEditor.body.manualNotice")}</p>}
      <label className="mx-4 my-3 flex items-center gap-2"><input type="checkbox" checked={formData.executionMode !== "manual"} onChange={e => setFormData({ ...formData, executionMode: e.target.checked ? "native" : "manual" })} /> {t("spellEditor.body.verified")}</label>
      <HudForm
        id="spell-form"
        onSubmit={submit.onSubmit}
        tabs={tabs}
        error={submit.error}
        actions={
          <>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? t("common.actions.saving") : submit.label}
            </Button>
            {remove && (
              <Button type="button" variant="destructive" onClick={remove.onDelete} disabled={remove.isDeleting}>
                {remove.isDeleting ? t("spellEditor.page.deleting") : t("common.actions.delete")}
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/spells`}>{t("common.actions.cancel")}</Link>
            </Button>
          </>
        }
      />
    </>
  );
}
