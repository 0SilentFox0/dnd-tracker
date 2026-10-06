import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

type NumericKey = "level" | "armorClass" | "maxHp" | "speed" | "initiative" | "proficiencyBonus" | "minTargets" | "maxTargets";

const NUMBER_FIELDS: Array<{ key: NumericKey; label: string; required?: boolean }> = [
  { key: "level", label: "Рівень", required: true },
  { key: "armorClass", label: "Клас броні (AC)", required: true },
  { key: "maxHp", label: "Максимальне HP", required: true },
  { key: "speed", label: "Швидкість", required: true },
  { key: "initiative", label: "Ініціатива" },
  { key: "proficiencyBonus", label: "Бонус майстерності" },
  { key: "minTargets", label: "Мін. цілей" },
  { key: "maxTargets", label: "Макс. цілей" },
];

interface UnitBasicInfoProps {
  formData: Partial<Unit>;
  races: Race[];
  onChange: (data: Partial<Unit>) => void;
}

export function UnitBasicInfo({ formData, races, onChange }: UnitBasicInfoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Назва юніта *</Label>
        <Input id="name" value={formData.name || ""} onChange={(e) => onChange({ name: e.target.value })} required placeholder="Назва юніта" />
      </div>

      <div>
        <Label htmlFor="race">Раса</Label>
        <SelectField
          id="race"
          value={formData.raceId ?? ""}
          onValueChange={(value) => onChange({ raceId: value || null })}
          placeholder="Виберіть расу"
          options={races.map((r) => ({ value: r.id, label: r.name }))}
          allowNone
          noneLabel="Без раси"
        />
      </div>

      <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4 md:col-span-2">
        {NUMBER_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col justify-end">
            <Label htmlFor={field.key} className="text-xs leading-tight">
              {field.label}
              {field.required && " *"}
            </Label>
            <NumberInput
              id={field.key}
              value={formData[field.key]}
              onChange={(value) => onChange({ [field.key]: value } as Partial<Unit>)}
              required={field.required}
              inputMode={field.key === "initiative" ? "text" : "numeric"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
