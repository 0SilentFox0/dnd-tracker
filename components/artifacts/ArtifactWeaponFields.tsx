"use client";

import { useTranslations } from "next-intl";

import { WeaponTraitsField } from "@/components/common/WeaponTraitsField";
import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { AttackType } from "@/lib/constants/battle";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import { clamp } from "@/lib/utils/common/clamp";
import { patchDefined } from "@/lib/utils/common/patch-defined";

type NumberKey = "attackBonus" | "damageBonus" | "minTargets" | "maxTargets";

type TextKey = "damageDice" | "damageType" | "range" | "properties";

const TEXT_MAX: Record<TextKey, number> = { damageDice: 30, damageType: 30, range: 30, properties: 200 };

const NUMBER_RANGE: Record<NumberKey, { min: number; max: number }> = {
  attackBonus: { min: -20, max: 20 },
  damageBonus: { min: -20, max: 20 },
  minTargets: { min: 1, max: 20 },
  maxTargets: { min: 1, max: 20 },
};

const TEXT_FIELDS: Array<{ key: TextKey; placeholder?: string }> = [
  { key: "damageDice", placeholder: "1d8" },
  { key: "damageType", placeholder: "slashing, fire…" },
  { key: "range", placeholder: "5 ft" },
  { key: "properties" },
];

const NUMBER_FIELDS: Array<{ key: NumberKey }> = [{ key: "attackBonus" }, { key: "damageBonus" }, { key: "minTargets" }, { key: "maxTargets" }];


export function ArtifactWeaponFields({ value, onChange, bonusOnly = false }: { value: WeaponStats; onChange: (next: WeaponStats) => void; bonusOnly?: boolean }) {
  const t = useTranslations("artifacts.weapon");

  const attackTypeOptions = [
    { value: AttackType.MELEE, label: t("melee") },
    { value: AttackType.RANGED, label: t("ranged") },
  ];

  const set = <K extends keyof WeaponStats>(key: K, v: WeaponStats[K]) => {
    onChange(patchDefined(value, { [key]: v } as Partial<WeaponStats>, (x) => x === undefined || x === ""));
  };

  const numberFields = bonusOnly ? NUMBER_FIELDS.filter((f) => f.key === "attackBonus" || f.key === "damageBonus") : NUMBER_FIELDS;

  const numberGrid = (
    <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
      {numberFields.map((f) => (
        <div key={f.key} className="flex flex-col justify-end space-y-1">
          <Label htmlFor={`weapon-${f.key}`} className="text-xs leading-tight text-muted-foreground">
            {t(f.key)}
          </Label>
          <NumberInput id={`weapon-${f.key}`} value={value[f.key]} onChange={(v) => set(f.key, v === undefined ? v : clamp(v, NUMBER_RANGE[f.key].min, NUMBER_RANGE[f.key].max))} />
        </div>
      ))}
    </div>
  );

  if (bonusOnly) {
    return (
      <HudSection title={t("bonusTitle")} className="space-y-3">
        {numberGrid}
      </HudSection>
    );
  }

  return (
    <HudSection title={t("title")} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`weapon-${f.key}`} className="text-xs text-muted-foreground">
              {t(f.key)}
            </Label>
            <Input
              id={`weapon-${f.key}`}
              value={value[f.key] ?? ""}
              placeholder={f.key === "properties" ? t("propertiesPlaceholder") : f.placeholder}
              maxLength={TEXT_MAX[f.key]}
              onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="weapon-attackType" className="text-xs text-muted-foreground">
            {t("attackType")}
          </Label>
          <SelectField
            id="weapon-attackType"
            value={value.attackType ?? ""}
            options={attackTypeOptions}
            allowNone
            noneLabel={t("attackAuto")}
            onValueChange={(v) => set("attackType", (v || undefined) as WeaponStats["attackType"])}
          />
        </div>
      </div>
      <WeaponTraitsField
        idPrefix="weapon"
        value={value}
        onChange={onChange}
      />
      {numberGrid}
    </HudSection>
  );
}
