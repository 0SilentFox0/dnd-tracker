import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

interface UnitBasicInfoProps {
  formData: Partial<Unit>;
  races?: Race[];
  onChange: (data: Partial<Unit>) => void;
}

export function UnitBasicInfo({
  formData,
  races,
  onChange,
}: UnitBasicInfoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Назва юніта *</Label>
        <Input
          id="name"
          value={formData.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          placeholder="Назва юніта"
        />
      </div>

      <div>
        <Label htmlFor="race">Раса</Label>
        {races && races.length > 0 ? (
          <SelectField
            id="race"
            value={formData.race || ""}
            onValueChange={(value) => onChange({ race: value || null })}
            placeholder="Виберіть расу"
            options={(() => {
              const fromRaces = races.map((r) => ({ value: r.name, label: r.name }));

              const current = formData.race?.trim();

              if (current && !fromRaces.some((o) => o.value === current)) {
                return [{ value: current, label: current }, ...fromRaces];
              }

              return fromRaces;
            })()}
            allowNone
            noneLabel="Без раси"
          />
        ) : (
          <LabeledInput
            id="race"
            label=""
            value={formData.race || ""}
            onChange={(e) => onChange({ race: e.target.value || null })}
            placeholder="Наприклад: Ельф"
          />
        )}
      </div>

      <div>
        <Label htmlFor="level">Рівень *</Label>
        <Input
          id="level"
          type="number"
          min="1"
          max="30"
          value={formData.level || 1}
          onChange={(e) => onChange({ level: parseInt(e.target.value) || 1 })}
          required
        />
      </div>

      <div>
        <Label htmlFor="armorClass">Клас броні (AC) *</Label>
        <Input
          id="armorClass"
          type="number"
          min="0"
          value={formData.armorClass ?? 10}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);

            onChange({ armorClass: Number.isNaN(v) ? 10 : v });
          }}
          required
        />
      </div>

      <div>
        <Label htmlFor="maxHp">Максимальне HP *</Label>
        <Input
          id="maxHp"
          type="number"
          min="1"
          value={formData.maxHp || 10}
          onChange={(e) => onChange({ maxHp: parseInt(e.target.value) || 10 })}
          required
        />
      </div>

      <div>
        <Label htmlFor="speed">Швидкість *</Label>
        <Input
          id="speed"
          type="number"
          min="0"
          value={formData.speed || 30}
          onChange={(e) => onChange({ speed: parseInt(e.target.value) || 30 })}
          required
        />
      </div>

      <div>
        <Label htmlFor="initiative">Ініціатива</Label>
        <Input
          id="initiative"
          type="number"
          value={formData.initiative || 0}
          onChange={(e) =>
            onChange({ initiative: parseInt(e.target.value) || 0 })
          }
        />
      </div>

      <div>
        <Label htmlFor="proficiencyBonus">Бонус майстерності</Label>
        <Input
          id="proficiencyBonus"
          type="number"
          min="0"
          value={formData.proficiencyBonus || 2}
          onChange={(e) =>
            onChange({ proficiencyBonus: parseInt(e.target.value) || 2 })
          }
        />
      </div>

      <div>
        <Label htmlFor="minTargets">Мін. цілей</Label>
        <Input
          id="minTargets"
          type="number"
          min="1"
          value={formData.minTargets || 1}
          onChange={(e) =>
            onChange({ minTargets: parseInt(e.target.value) || 1 })
          }
        />
      </div>

      <div>
        <Label htmlFor="maxTargets">Макс. цілей</Label>
        <Input
          id="maxTargets"
          type="number"
          min="1"
          value={formData.maxTargets || 1}
          onChange={(e) =>
            onChange({ maxTargets: parseInt(e.target.value) || 1 })
          }
        />
      </div>
    </div>
  );
}
