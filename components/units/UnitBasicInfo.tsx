import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit, UnitGroup } from "@/lib/api/units";

interface UnitBasicInfoProps {
  formData: Partial<Unit>;
  unitGroups: UnitGroup[];
  onChange: (data: Partial<Unit>) => void;
}

export function UnitBasicInfo({
  formData,
  unitGroups,
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
        <Label htmlFor="groupId">Група юнітів</Label>
        <Select
          key={`group-select-${formData.groupId || "none"}-${unitGroups.length}`}
          value={formData.groupId ? String(formData.groupId) : "none"}
          onValueChange={(value) =>
            onChange({ groupId: value === "none" ? null : value })
          }
          disabled={unitGroups.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                unitGroups.length === 0
                  ? "Завантаження..."
                  : "Виберіть групу"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без групи</SelectItem>
            {unitGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.groupId && unitGroups.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Поточна група:{" "}
            {unitGroups.find((g) => g.id === formData.groupId)?.name ||
              "Не знайдено"}
          </p>
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
