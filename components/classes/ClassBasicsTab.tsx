"use client";

import { useTranslations } from "next-intl";

import { SpellListHint } from "./SpellListHint";

import { ColorField } from "@/components/common/ColorField";
import { Checkbox } from "@/components/ui/checkbox";
import { CommaListInput } from "@/components/ui/comma-list-input";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { CLASS_CASTERS, HIT_DICE } from "@/lib/constants/classes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { useTranslator } from "@/lib/i18n/use-translator";
import { toggleItem } from "@/lib/utils/common/collections";
import type { ClassCaster, ClassFormData, HitDie } from "@/types/classes";

interface ClassBasicsTabProps {
  form: { data: ClassFormData; set: React.Dispatch<React.SetStateAction<ClassFormData>> };
  campaignId?: string;
}

function ListInput({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <CommaListInput id={id} value={value} onChange={onChange} />
    </div>
  );
}

export function ClassBasicsTab({ form: { data, set }, campaignId }: ClassBasicsTabProps) {
  const t = useTranslations();

  const tg = useTranslator("gameTerms");

  const patch = (next: Partial<ClassFormData>) => set((prev) => ({ ...prev, ...next }));

  const isCaster = data.caster !== "none";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="class-name">{t("classes.basics.name")}</Label>
        <Input id="class-name" value={data.name} required onChange={(e) => patch({ name: e.target.value })} />
      </div>

      <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon })} label={t("classes.basics.icon")} fallbackText={data.name} allowFile={false} />

      <ColorField id="class-color" label={t("classes.basics.color")} value={data.color ?? ""} onChange={(color) => patch({ color })} />

      <div className="space-y-2">
        <Label htmlFor="class-hit-die">{t("classes.basics.hitDie")}</Label>
        <SelectField
          id="class-hit-die"
          value={String(data.hitDie)}
          onValueChange={(v) => patch({ hitDie: Number(v) as HitDie })}
          options={HIT_DICE.map((d) => ({ value: String(d), label: `d${d}` }))}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("classes.basics.savingThrows")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITY_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.savingThrows.includes(key)} onCheckedChange={() => patch({ savingThrows: toggleItem(data.savingThrows, key) })} />
              {tg(`abilities.${key}.label`)}
            </label>
          ))}
        </div>
      </fieldset>

      <ListInput id="class-armor" label={t("classes.basics.armor")} value={data.proficiencies.armor} onChange={(armor) => patch({ proficiencies: { ...data.proficiencies, armor } })} />
      <ListInput id="class-weapons" label={t("classes.basics.weapons")} value={data.proficiencies.weapons} onChange={(weapons) => patch({ proficiencies: { ...data.proficiencies, weapons } })} />
      <ListInput id="class-tools" label={t("classes.basics.tools")} value={data.proficiencies.tools} onChange={(tools) => patch({ proficiencies: { ...data.proficiencies, tools } })} />

      <div className="space-y-2">
        <Label htmlFor="class-skill-count">{t("classes.basics.skillCount")}</Label>
        <Input
          id="class-skill-count"
          type="number"
          min={0}
          max={18}
          value={data.skillChoices.count}
          onChange={(e) => patch({ skillChoices: { ...data.skillChoices, count: Math.max(0, Number(e.target.value) || 0) } })}
          className="w-24"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("classes.basics.skillList")}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DND_SKILLS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.skillChoices.from.includes(skill)} onCheckedChange={() => patch({ skillChoices: { ...data.skillChoices, from: toggleItem(data.skillChoices.from, skill) } })} />
              {t(`gameTerms.dndSkills.${skill}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="class-caster">{t("classes.basics.caster")}</Label>
        <SelectField
          id="class-caster"
          value={data.caster}
          onValueChange={(v) => patch({ caster: v as ClassCaster })}
          options={CLASS_CASTERS.map((c) => ({ value: c, label: t(`classes.casters.${c}`) }))}
        />
      </div>

      {isCaster && (
        <div className="space-y-2">
          <Label htmlFor="class-spell-ability">{t("classes.basics.spellAbility")}</Label>
          <SelectField
            id="class-spell-ability"
            value={data.spellcastingAbility ?? ""}
            onValueChange={(v) => patch({ spellcastingAbility: (v || null) as AbilityKey | null })}
            options={ABILITY_KEYS.map((k) => ({ value: k, label: tg(`abilities.${k}.label`) }))}
            allowNone
          />
        </div>
      )}

      {isCaster && (
        <div className="space-y-2">
          <Label htmlFor="class-spell-list">{t("classes.basics.spellList")}</Label>
          <Input id="class-spell-list" value={data.spellList ?? ""} placeholder={data.name} onChange={(e) => patch({ spellList: e.target.value.trim() ? e.target.value : null })} />
          {campaignId && data.spellList && <SpellListHint campaignId={campaignId} tag={data.spellList} />}
        </div>
      )}
    </div>
  );
}
