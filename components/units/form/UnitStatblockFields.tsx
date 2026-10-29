"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import type { Unit, UnitStatblock } from "@/types/units";

const MOVEMENT_KEYS = ["fly", "swim", "climb", "burrow"] as const;

const SENSE_KEYS = ["darkvision", "blindsight", "tremorsense", "truesight"] as const;

const SIZE_KEYS = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

const CREATURE_TYPES = ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"] as const;

export function UnitStatblockFields({ formData, onChange }: { formData: Partial<Unit>; onChange: (data: Partial<Unit>) => void }) {
  const t = useTranslations("units.statblock");

  const tMonster = useTranslations("common.monster");

  const block = formData.statblock ?? {};

  const set = (patch: Partial<UnitStatblock>) => onChange({ statblock: { ...block, ...patch } });

  const number = (id: string, label: string, value: number | undefined, change: (value: number | undefined) => void, min = 5, max = 1000) => (
    <div key={id}><Label htmlFor={id}>{label}</Label><NumberInput id={id} min={min} max={max} value={value} onChange={(v) => change(v === undefined ? undefined : Math.min(max, Math.max(min, v)))} /></div>
  );

  return <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
    <div><Label htmlFor="creature-type">{t("creatureType")}</Label><Input id="creature-type" list="creature-types" value={block.creatureType ?? ""} maxLength={40} onChange={(e) => set({ creatureType: e.target.value || undefined })} /><datalist id="creature-types">{CREATURE_TYPES.map((type) => <option key={type} value={type} />)}</datalist></div>
    <div><Label htmlFor="creature-size">{t("size")}</Label><SelectField id="creature-size" allowNone value={block.size ?? ""} options={SIZE_KEYS.map((value) => ({ value, label: tMonster(`sizes.${value}`) }))} onValueChange={(v) => set({ size: v === "none" ? undefined : v as UnitStatblock["size"] })} /></div>
    <div className="col-span-2"><Label htmlFor="creature-alignment">{t("alignment")}</Label><Input id="creature-alignment" value={block.alignment ?? ""} maxLength={80} onChange={(e) => set({ alignment: e.target.value || undefined })} /></div>
    {SENSE_KEYS.map((key) => number(`sense-${key}`, t("feet", { label: tMonster(`senses.${key}`) }), block.senses?.[key], (v) => set({ senses: { ...block.senses, [key]: v } })))}
    {number("passive-perception", t("passivePerception"), block.senses?.passivePerception, (v) => set({ senses: { ...block.senses, passivePerception: v } }), 1, 40)}
    {MOVEMENT_KEYS.map((key) => number(`movement-${key}`, t("feet", { label: tMonster(key) }), block.movement?.[key], (v) => set({ movement: { ...block.movement, [key]: v } })))}
    <label className="flex items-center gap-2"><Checkbox checked={!!block.movement?.hover} onCheckedChange={(v) => set({ movement: { ...block.movement, hover: v === true || undefined } })} />{tMonster("hover")}</label>
    <div className="col-span-2"><Label htmlFor="creature-languages">{t("languages")}</Label><Input id="creature-languages" value={block.languages ?? ""} maxLength={300} onChange={(e) => set({ languages: e.target.value || undefined })} /></div>
    {number("creature-telepathy", t("telepathy"), block.telepathy, (telepathy) => set({ telepathy }))}
    {number("lair-resistances", t("lairResistances"), block.lairResistances, (lairResistances) => set({ lairResistances }), 0, 10)}
  </div>;
}
