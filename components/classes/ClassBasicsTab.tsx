"use client";

import { useState } from "react";

import { ColorField } from "@/components/common/ColorField";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CLASS_CASTER_LABELS, CLASS_CASTERS, HIT_DICE } from "@/lib/constants/classes";
import { DND_SKILL_META, DND_SKILLS } from "@/lib/constants/skills";
import type { ClassCaster, ClassFormData, HitDie } from "@/types/classes";

interface ClassBasicsTabProps {
  form: { data: ClassFormData; set: React.Dispatch<React.SetStateAction<ClassFormData>> };
}

const parseList = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

function ListInput({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (next: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseList(e.target.value));
        }}
        placeholder="Через кому"
      />
    </div>
  );
}

const toggle = <T extends string>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function ClassBasicsTab({ form: { data, set } }: ClassBasicsTabProps) {
  const patch = (next: Partial<ClassFormData>) => set((prev) => ({ ...prev, ...next }));

  const isCaster = data.caster !== "none";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="class-name">Назва класу *</Label>
        <Input id="class-name" value={data.name} required onChange={(e) => patch({ name: e.target.value })} />
      </div>

      <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon })} label="Іконка класу" fallbackText={data.name} allowFile={false} />

      <ColorField id="class-color" label="Колір класу" value={data.color ?? ""} onChange={(color) => patch({ color })} />

      <div className="space-y-2">
        <Label htmlFor="class-hit-die">Кістка хітів</Label>
        <SelectField
          id="class-hit-die"
          value={String(data.hitDie)}
          onValueChange={(v) => patch({ hitDie: Number(v) as HitDie })}
          options={HIT_DICE.map((d) => ({ value: String(d), label: `d${d}` }))}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Рятівні кидки</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITY_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.savingThrows.includes(key)} onCheckedChange={() => patch({ savingThrows: toggle<AbilityKey>(data.savingThrows, key) })} />
              {ABILITY_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <ListInput id="class-armor" label="Володіння бронею" value={data.proficiencies.armor} onChange={(armor) => patch({ proficiencies: { ...data.proficiencies, armor } })} />
      <ListInput id="class-weapons" label="Володіння зброєю" value={data.proficiencies.weapons} onChange={(weapons) => patch({ proficiencies: { ...data.proficiencies, weapons } })} />
      <ListInput id="class-tools" label="Володіння інструментами" value={data.proficiencies.tools} onChange={(tools) => patch({ proficiencies: { ...data.proficiencies, tools } })} />

      <div className="space-y-2">
        <Label htmlFor="class-skill-count">Навичок на вибір</Label>
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
        <legend className="text-sm font-medium">Навички на вибір — перелік</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DND_SKILLS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.skillChoices.from.includes(skill)} onCheckedChange={() => patch({ skillChoices: { ...data.skillChoices, from: toggle(data.skillChoices.from, skill) } })} />
              {DND_SKILL_META[skill].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="class-caster">Тип заклинача</Label>
        <SelectField
          id="class-caster"
          value={data.caster}
          onValueChange={(v) => patch({ caster: v as ClassCaster })}
          options={CLASS_CASTERS.map((c) => ({ value: c, label: CLASS_CASTER_LABELS[c] }))}
        />
      </div>

      {isCaster && (
        <div className="space-y-2">
          <Label htmlFor="class-spell-ability">Характеристика заклинань</Label>
          <SelectField
            id="class-spell-ability"
            value={data.spellcastingAbility ?? ""}
            onValueChange={(v) => patch({ spellcastingAbility: (v || null) as AbilityKey | null })}
            options={ABILITY_KEYS.map((k) => ({ value: k, label: ABILITY_LABELS[k] }))}
            allowNone
          />
        </div>
      )}
    </div>
  );
}
