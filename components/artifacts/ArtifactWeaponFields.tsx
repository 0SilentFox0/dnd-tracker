"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

type NumberKey = "attackBonus" | "minTargets" | "maxTargets";

type TextKey = "damageDice" | "damageType" | "range" | "properties";

const TEXT_FIELDS: Array<{ key: TextKey; label: string; placeholder: string }> = [
  { key: "damageDice", label: "Кубики шкоди", placeholder: "1d8" },
  { key: "damageType", label: "Тип шкоди", placeholder: "slashing, fire…" },
  { key: "range", label: "Дальність", placeholder: "5 ft" },
  { key: "properties", label: "Властивості", placeholder: "finesse, two-handed…" },
];

const NUMBER_FIELDS: Array<{ key: NumberKey; label: string }> = [
  { key: "attackBonus", label: "Бонус атаки" },
  { key: "minTargets", label: "Мін. цілей" },
  { key: "maxTargets", label: "Макс. цілей" },
];

const ATTACK_TYPE_OPTIONS = [
  { value: "melee", label: "Ближня" },
  { value: "ranged", label: "Дальня" },
];

function NumberInput({ id, value, onChange }: { id: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  const [text, setText] = useState(value === undefined ? "" : String(value));

  return (
    <Input
      id={id}
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const next = e.target.value;

        setText(next);

        const n = Number(next);

        if (next.trim() === "") onChange(undefined);
        else if (Number.isFinite(n)) onChange(Math.trunc(n));
      }}
    />
  );
}

export function ArtifactWeaponFields({ value, onChange }: { value: WeaponStats; onChange: (next: WeaponStats) => void }) {
  const set = <K extends keyof WeaponStats>(key: K, v: WeaponStats[K]) => {
    const next = { ...value, [key]: v };

    if (v === undefined || v === "") delete next[key];

    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-semibold">Зброя</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`weapon-${f.key}`} className="text-xs text-muted-foreground">
              {f.label}
            </Label>
            <Input id={`weapon-${f.key}`} value={value[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="weapon-attackType" className="text-xs text-muted-foreground">
            Тип атаки
          </Label>
          <SelectField
            id="weapon-attackType"
            value={value.attackType ?? ""}
            options={ATTACK_TYPE_OPTIONS}
            allowNone
            noneLabel="Авто"
            onValueChange={(v) => set("attackType", (v || undefined) as WeaponStats["attackType"])}
          />
        </div>
        {NUMBER_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`weapon-${f.key}`} className="text-xs text-muted-foreground">
              {f.label}
            </Label>
            <NumberInput id={`weapon-${f.key}`} value={value[f.key]} onChange={(v) => set(f.key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
