"use client";

import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { AttackType } from "@/lib/constants/battle";
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
  { value: AttackType.MELEE, label: "Ближня" },
  { value: AttackType.RANGED, label: "Дальня" },
];

export function ArtifactWeaponFields({ value, onChange }: { value: WeaponStats; onChange: (next: WeaponStats) => void }) {
  const set = <K extends keyof WeaponStats>(key: K, v: WeaponStats[K]) => {
    const next = { ...value, [key]: v };

    if (v === undefined || v === "") delete next[key];

    onChange(next);
  };

  return (
    <HudSection title="Зброя" className="space-y-3">
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
      </div>
      <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
        {NUMBER_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col justify-end space-y-1">
            <Label htmlFor={`weapon-${f.key}`} className="text-xs leading-tight text-muted-foreground">
              {f.label}
            </Label>
            <NumberInput id={`weapon-${f.key}`} value={value[f.key]} onChange={(v) => set(f.key, v)} />
          </div>
        ))}
      </div>
    </HudSection>
  );
}
