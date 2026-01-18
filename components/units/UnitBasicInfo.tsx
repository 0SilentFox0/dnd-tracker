import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit } from "@/lib/api/units";
import type { Race } from "@/lib/types/races";

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
          <Select
            value={formData.race || ""}
            onValueChange={(value) => onChange({ race: value || null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Виберіть расу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Без раси</SelectItem>
              {races.map((race) => (
                <SelectItem key={race.id} value={race.name}>
                  {race.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="race"
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
          onChange={(e) =>
            onChange({ level: parseInt(e.target.value) || 1 })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="armorClass">Клас броні *</Label>
        <Input
          id="armorClass"
          type="number"
          min="0"
          value={formData.armorClass || 10}
          onChange={(e) =>
            onChange({ armorClass: parseInt(e.target.value) || 10 })
          }
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
          onChange={(e) =>
            onChange({ maxHp: parseInt(e.target.value) || 10 })
          }
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
          onChange={(e) =>
            onChange({ speed: parseInt(e.target.value) || 30 })
          }
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
    </div>
  );
}
