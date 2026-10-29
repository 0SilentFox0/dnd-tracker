"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { CHALLENGE_OPTIONS, xpForChallenge } from "@/lib/constants/challenge";
import { applyChallenge } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

type CountKey = "multiattack" | "legendaryActions" | "legendaryResistances";

const COUNT_FIELDS: Array<{ key: CountKey; min: number }> = [
  { key: "multiattack", min: 1 },
  { key: "legendaryActions", min: 0 },
  { key: "legendaryResistances", min: 0 },
];

interface UnitFiveEFieldsProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitFiveEFields({ formData, onChange }: UnitFiveEFieldsProps) {
  const t = useTranslations("units.fiveE");

  const tAbilities = useTranslations("common.abilities");

  const cr = formData.cr ?? null;

  const saves = formData.saveProficiencies ?? [];

  const toggleSave = (key: AbilityKey, on: boolean) =>
    onChange({ saveProficiencies: ABILITY_KEYS.filter((k) => (k === key ? on : saves.includes(k))) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-5">
        <div className="flex flex-col justify-end">
          <Label htmlFor="cr" className="text-xs leading-tight">
            {t("cr")}
          </Label>
          <SelectField
            id="cr"
            value={cr === null ? "" : String(cr)}
            onValueChange={(v) => onChange(applyChallenge(v === "" ? null : Number(v)))}
            options={CHALLENGE_OPTIONS}
            allowNone
            noneLabel={t("noCr")}
          />
        </div>
        <div className="flex flex-col justify-end">
          <Label htmlFor="xp" className="text-xs leading-tight">
            XP
          </Label>
          <NumberInput
            id="xp"
            value={formData.xp ?? undefined}
            placeholder={cr === null ? "" : String(xpForChallenge(cr))}
            onChange={(v) => onChange({ xp: v ?? null })}
          />
        </div>
        {COUNT_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col justify-end">
            <Label htmlFor={f.key} className="text-xs leading-tight">
              {t(`counts.${f.key}`)}
            </Label>
            <NumberInput
              id={f.key}
              value={formData[f.key] ?? f.min}
              onChange={(v) => onChange({ [f.key]: Math.max(f.min, v ?? f.min) } as Partial<Unit>)}
            />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("saves")}</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ABILITY_KEYS.map((key) => (
            <label key={key} htmlFor={`save-${key}`} className="flex items-center gap-2 text-sm">
              <Checkbox id={`save-${key}`} checked={saves.includes(key)} onCheckedChange={(v) => toggleSave(key, v === true)} />
              {tAbilities(`${key}.label`)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
