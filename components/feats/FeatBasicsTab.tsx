"use client";

import { useTranslations } from "next-intl";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CHOICE_LIMITS, FEAT_TYPES } from "@/lib/constants/choices";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { toggleItem } from "@/lib/utils/common/collections";
import type { FeatFormData, FeatType } from "@/types/choices";

export function FeatBasicsTab({ form: { data, set } }: { form: { data: FeatFormData; set: React.Dispatch<React.SetStateAction<FeatFormData>> } }) {
  const t = useTranslations("feats");

  const patch = (next: Partial<FeatFormData>) => set((prev) => ({ ...prev, ...next }));

  const prereq = data.prerequisite;

  const setPrereq = (next: FeatFormData["prerequisite"]) => patch({ prerequisite: Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) });

  const scoreAbilities = prereq.scores?.abilities ?? [];

  const toggleAbility = (a: AbilityKey) => {
    const abilities = toggleItem(scoreAbilities, a);

    setPrereq({ ...prereq, scores: abilities.length > 0 ? { abilities, min: prereq.scores?.min ?? 13 } : undefined });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="feat-name">{t("form.name")}</Label>
        <Input id="feat-name" value={data.name} required onChange={(e) => patch({ name: e.target.value })} />
      </div>
      <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon })} label={t("form.icon")} fallbackText={data.name} allowFile={false} />
      <div className="space-y-2">
        <Label htmlFor="feat-type">{t("form.type")}</Label>
        <select id="feat-type" className={HUD_SELECT_CLASS} value={data.type} onChange={(e) => patch({ type: e.target.value as FeatType })}>
          {FEAT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className="hud-sc text-sm">{t("form.prerequisites")}</legend>
        <label className="flex items-center gap-2 text-sm">
          {t("form.minLevel")}
          <Input type="number" min={1} max={MAX_CLASS_LEVEL} className="w-20" value={prereq.level ?? ""} onChange={(e) => setPrereq({ ...prereq, level: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t("form.scoreMin")}</span>
          <Input type="number" min={1} max={CHOICE_LIMITS.max} className="w-20" aria-label={t("form.scoreMinAria")} disabled={scoreAbilities.length === 0} value={prereq.scores?.min ?? 13} onChange={(e) => prereq.scores && setPrereq({ ...prereq, scores: { ...prereq.scores, min: Number(e.target.value) || 13 } })} />
          {ABILITY_KEYS.map((a) => (
            <label key={a} className="flex items-center gap-1">
              <Checkbox checked={scoreAbilities.includes(a)} onCheckedChange={() => toggleAbility(a)} />
              {ABILITY_LABELS[a]}
            </label>
          ))}
        </div>
        <Input aria-label={t("form.prereqText")} placeholder={t("form.prereqTextPlaceholder")} value={prereq.text ?? ""} onChange={(e) => setPrereq({ ...prereq, text: e.target.value || undefined })} />
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={data.repeatable} onCheckedChange={(on) => patch({ repeatable: on === true })} />
        {t("form.repeatable")}
      </label>
      <div className="space-y-2">
        <Label htmlFor="feat-description">{t("form.description")}</Label>
        <Textarea id="feat-description" rows={6} value={data.description ?? ""} onChange={(e) => patch({ description: e.target.value || null })} />
      </div>
    </div>
  );
}
