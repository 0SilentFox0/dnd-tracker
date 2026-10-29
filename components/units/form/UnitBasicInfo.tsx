import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

type NumericKey = "level" | "armorClass" | "maxHp" | "speed" | "initiative" | "proficiencyBonus" | "minTargets" | "maxTargets";

const NUMBER_FIELDS: Array<{ key: NumericKey; required?: boolean; min?: number; max?: number }> = [
  { key: "level", required: true, min: 1, max: 30 },
  { key: "armorClass", required: true, min: 0 },
  { key: "maxHp", required: true, min: 1 },
  { key: "speed", required: true, min: 0 },
  { key: "initiative" },
  { key: "proficiencyBonus", min: 0 },
  { key: "minTargets", min: 1 },
  { key: "maxTargets", min: 1 },
];

const clamp = (value: number | undefined, min = -Infinity, max = Infinity) => (value === undefined ? value : Math.min(max, Math.max(min, value)));

const GRID_SIZES = ["1", "2", "3"] as const;

interface UnitBasicInfoProps {
  formData: Partial<Unit>;
  races: Race[];
  onChange: (data: Partial<Unit>) => void;
}

export function UnitBasicInfo({ formData, races, onChange }: UnitBasicInfoProps) {
  const t = useTranslations("units.basic");

  const tg = useTranslations("gameTerms");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">{t("name")} *</Label>
        <Input id="name" value={formData.name || ""} onChange={(e) => onChange({ name: e.target.value })} required maxLength={100} placeholder={t("name")} />
      </div>

      <div>
        <Label htmlFor="race">{t("race")}</Label>
        <SelectField
          id="race"
          value={formData.raceId ?? ""}
          onValueChange={(value) => onChange({ raceId: value || null })}
          placeholder={t("racePlaceholder")}
          options={races.map((r) => ({ value: r.id, label: r.name }))}
          allowNone
          noneLabel={tg("ungrouped.race")}
        />
      </div>

      <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4 md:col-span-2">
        {NUMBER_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col justify-end">
            <Label htmlFor={field.key} className="text-xs leading-tight">
              {t(`fields.${field.key}`)}
              {field.required && " *"}
            </Label>
            <NumberInput
              id={field.key}
              value={formData[field.key]}
              onChange={(value) => onChange({ [field.key]: clamp(value, field.min, field.max) } as Partial<Unit>)}
              required={field.required}
              min={field.min}
              max={field.max}
              inputMode={field.key === "initiative" ? "text" : "numeric"}
            />
          </div>
        ))}
        <div className="col-span-2 flex flex-col justify-end">
          <Label htmlFor="gridSize" className="text-xs leading-tight">
            {t("gridSize")}
          </Label>
          <SelectField
            id="gridSize"
            value={String(formData.gridSize ?? 1)}
            onValueChange={(value) => onChange({ gridSize: Number(value) || 1 })}
            options={GRID_SIZES.map((value) => ({ value, label: t(`gridSizes.${value}`) }))}
          />
        </div>
      </div>
    </div>
  );
}
