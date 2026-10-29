"use client";


import { SPELL_COST_KEYS, SPELL_LEVELS, type SpellFormData } from "./spell-form-defaults";
import { SpellFxFields } from "./SpellFxFields";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { SPELL_NAME_MAX } from "@/lib/constants/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { IdName } from "@/types/common";
import type { SpellCost } from "@/types/spells";

export interface SpellFormFieldsProps {
  formData: SpellFormData;
  setFormData: (data: SpellFormData) => void;
}

export function SpellFormBasicFields({ formData, setFormData, spellGroups }: SpellFormFieldsProps & { spellGroups: IdName[] }) {
  const t = useTranslator();

  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <LabeledInput containerClassName="col-span-2" id="name" label={t("spellEditor.basic.name")} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required maxLength={SPELL_NAME_MAX} placeholder={t("spellEditor.basic.name")} />
      <div>
        <Label htmlFor="level">{t("spellEditor.basic.level")}</Label>
        <SelectField id="level" value={String(formData.level)} onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })} placeholder={t("spellEditor.basic.levelPlaceholder")} options={SPELL_LEVELS.map((n) => ({ value: String(n), label: t(`gameTerms.spellLevels.${n}`) }))} />
      </div>
      <div>
        <Label htmlFor="cost">{t("spellEditor.basic.cost")}</Label>
        <SelectField id="cost" value={formData.cost} onValueChange={(value) => setFormData({ ...formData, cost: value as SpellCost, ...(value === "long" && { casting: { ...formData.casting, rounds: formData.casting?.rounds ?? 10 } }) })} placeholder={t("spellEditor.basic.cost")} options={SPELL_COST_KEYS.map((k) => ({ value: k, label: t(`spells.costs.${k}`) }))} />
      </div>
      {formData.cost === "long" && <LabeledInput id="casting-rounds" label={t("spellEditor.basic.castingRounds")} type="number" min={2} max={144000} value={formData.casting?.rounds ?? 10} onChange={(e) => setFormData({ ...formData, casting: { ...formData.casting, rounds: Number(e.target.value) } })} />}
      {formData.cost === "reaction" && <LabeledInput containerClassName="col-span-2" id="reaction-trigger" label={t("spellEditor.basic.reactionTrigger")} value={formData.casting?.trigger ?? ""} onChange={(e) => setFormData({ ...formData, casting: { ...formData.casting, trigger: e.target.value || undefined } })} />}
      <div className="col-span-2">
        <Label htmlFor="groupId">{t("spellEditor.basic.school")}</Label>
        <SelectField id="groupId" value={formData.groupId ?? ""} onValueChange={(value) => setFormData({ ...formData, groupId: value || null })} placeholder={t("spellEditor.basic.schoolPlaceholder")} options={spellGroups.map((g) => ({ value: g.id, label: g.name }))} allowNone noneLabel={t("spellEditor.basic.noSchool")} />
      </div>
      <SpellFxFields value={formData.fx} onChange={(fx) => setFormData({ ...formData, fx })} />
      <div className="col-span-2">
        <Label htmlFor="description">{t("spellEditor.basic.description")}</Label>
        <Textarea id="description" value={formData.description ?? ""} onChange={(e) => setFormData({ ...formData, description: e.target.value || null })} placeholder={t("spellEditor.basic.descriptionPlaceholder")} rows={3} />
      </div>
      <div className="col-span-2">
        <Label htmlFor="appearanceDescription">{t("spellEditor.basic.appearance")}</Label>
        <Textarea id="appearanceDescription" value={formData.appearanceDescription ?? ""} onChange={(e) => setFormData({ ...formData, appearanceDescription: e.target.value || null })} placeholder={t("spellEditor.basic.appearancePlaceholder")} rows={3} />
      </div>
      <div className="col-span-2">
        <IconUrlField id="icon" label={t("spellEditor.basic.icon")} value={formData.icon ?? ""} onChange={(icon) => setFormData({ ...formData, icon: icon || null })} fallbackText={formData.name} />
      </div>
    </div>
  );
}
