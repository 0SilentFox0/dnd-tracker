"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { MONSTER_SENSE_LABELS, MONSTER_SIZE_LABELS } from "@/lib/constants/monster";
import type { Unit, UnitStatblock } from "@/types/units";

const MOVEMENT = { fly: "Політ", swim: "Плавання", climb: "Лазіння", burrow: "Риття" } as const;

export function UnitStatblockFields({ formData, onChange }: { formData: Partial<Unit>; onChange: (data: Partial<Unit>) => void }) {
  const block = formData.statblock ?? {};

  const set = (patch: Partial<UnitStatblock>) => onChange({ statblock: { ...block, ...patch } });

  const number = (id: string, label: string, value: number | undefined, change: (value: number | undefined) => void, min = 5, max = 1000) => (
    <div key={id}><Label htmlFor={id}>{label}</Label><NumberInput id={id} min={min} max={max} value={value} onChange={(v) => change(v === undefined ? undefined : Math.min(max, Math.max(min, v)))} /></div>
  );

  return <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
    <div><Label htmlFor="creature-type">Тип істоти</Label><Input id="creature-type" list="creature-types" value={block.creatureType ?? ""} maxLength={40} onChange={(e) => set({ creatureType: e.target.value || undefined })} /><datalist id="creature-types">{["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"].map((t) => <option key={t} value={t} />)}</datalist></div>
    <div><Label htmlFor="creature-size">Розмір</Label><SelectField id="creature-size" allowNone value={block.size ?? ""} options={Object.entries(MONSTER_SIZE_LABELS).map(([value, label]) => ({ value, label }))} onValueChange={(v) => set({ size: v === "none" ? undefined : v as UnitStatblock["size"] })} /></div>
    <div className="col-span-2"><Label htmlFor="creature-alignment">Світогляд</Label><Input id="creature-alignment" value={block.alignment ?? ""} maxLength={80} onChange={(e) => set({ alignment: e.target.value || undefined })} /></div>
    {Object.entries(MONSTER_SENSE_LABELS).map(([key, label]) => number(`sense-${key}`, `${label}, фт`, block.senses?.[key as keyof typeof MONSTER_SENSE_LABELS], (v) => set({ senses: { ...block.senses, [key]: v } })))}
    {number("passive-perception", "Пасивна Уважність", block.senses?.passivePerception, (v) => set({ senses: { ...block.senses, passivePerception: v } }), 1, 40)}
    {Object.entries(MOVEMENT).map(([key, label]) => number(`movement-${key}`, `${label}, фт`, block.movement?.[key as keyof typeof MOVEMENT], (v) => set({ movement: { ...block.movement, [key]: v } })))}
    <label className="flex items-center gap-2"><Checkbox checked={!!block.movement?.hover} onCheckedChange={(v) => set({ movement: { ...block.movement, hover: v === true || undefined } })} />Зависання</label>
    <div className="col-span-2"><Label htmlFor="creature-languages">Мови</Label><Input id="creature-languages" value={block.languages ?? ""} maxLength={300} onChange={(e) => set({ languages: e.target.value || undefined })} /></div>
    {number("creature-telepathy", "Телепатія, фт", block.telepathy, (telepathy) => set({ telepathy }))}
    {number("lair-resistances", "Легендарний опір у лігві", block.lairResistances, (lairResistances) => set({ lairResistances }), 0, 10)}
  </div>;
}
