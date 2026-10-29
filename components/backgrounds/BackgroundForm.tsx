"use client";

import { useTranslations } from "next-intl";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { HUD_SELECT_CLASS,HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DND_SKILLS } from "@/lib/constants/skills";
import { useBackgroundForm } from "@/lib/hooks/backgrounds";
import { useFeats } from "@/lib/hooks/feats";
import { toggleItem } from "@/lib/utils/common/collections";
import type { BackgroundData } from "@/types/backgrounds";

export function BackgroundForm({ campaignId, background }: { campaignId: string; background: BackgroundData }) {
  const t = useTranslations("backgrounds");

  const tc = useTranslations("common");

  const { form: { data, patch }, validation: { invalid, setInvalid }, status: { isSaving }, actions } = useBackgroundForm(campaignId, background);

  const { data: feats = [] } = useFeats(campaignId);

  return (
    <HudFormPage title={t("form.editTitle")} aside={t("form.editAside")}>
      <HudForm id="background-form" onSubmit={actions.submit} tabs={[
        { id: "basics", label: tc("tabs.basic"), content: <div className="space-y-4">
          <Label htmlFor="background-name">{t("form.name")}</Label>
          <Input id="background-name" required value={data.name} onChange={(e) => patch({ name: e.target.value })} />
          <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon: icon || null })} label={t("form.icon")} fallbackText={data.name} allowFile={false} />
          <Label htmlFor="background-description">{t("form.description")}</Label>
          <Textarea id="background-description" value={data.description ?? ""} onChange={(e) => patch({ description: e.target.value || null })} />
          <fieldset className="space-y-2"><legend>{t("form.skills")}</legend><div className="flex flex-wrap gap-3">
            {DND_SKILLS.map((skill) => <label key={skill} className="flex items-center gap-2 text-sm"><Checkbox checked={data.skillProficiencies.includes(skill)} onCheckedChange={() => patch({ skillProficiencies: toggleItem(data.skillProficiencies, skill) })} />{tc(`dndSkills.${skill}`)}</label>)}
          </div></fieldset>
          <Label htmlFor="background-tools">{t("form.tools")}</Label>
          <Textarea id="background-tools" value={data.toolProficiencies.join("\n")} onChange={(e) => patch({ toolProficiencies: e.target.value.split("\n") })} onBlur={() => patch({ toolProficiencies: data.toolProficiencies.map((s) => s.trim()).filter(Boolean) })} />
          <Label htmlFor="background-origin">{t("form.origin")}</Label>
          <select id="background-origin" className={HUD_SELECT_CLASS} value={data.originFeatId ?? ""} onChange={(e) => patch({ originFeatId: e.target.value || null })}>
            <option value="">{t("form.noOrigin")}</option>{feats.filter((f) => f.type === "origin").map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Label htmlFor="background-equipment">{t("form.equipment")}</Label>
          <Textarea id="background-equipment" value={data.equipmentText ?? ""} onChange={(e) => patch({ equipmentText: e.target.value || null })} />
          <p className="text-sm text-muted-foreground">{t("form.equipmentNote")}</p>
        </div> },
        { id: "choices", label: tc("tabs.choices"), invalid, content: <ChoiceListEditor campaignId={campaignId} owner="background" value={data.choices} onChange={(choices) => patch({ choices })} onValidityChange={(valid) => setInvalid(!valid)} /> },
      ]} actions={<><Button type="button" variant="outline" onClick={actions.cancel}>{tc("actions.cancel")}</Button><Button type="submit" disabled={invalid || isSaving}>{isSaving ? tc("actions.saving") : tc("actions.save")}</Button></>} />
    </HudFormPage>
  );
}
