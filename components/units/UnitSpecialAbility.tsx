import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Spell } from "@/lib/api/spells";

export interface SpecialAbility {
  name?: string;
  description?: string;
  type?: "passive" | "active";
  spellId?: string;
  actionType?: "action" | "bonus_action";
}

interface UnitSpecialAbilityProps {
  ability: SpecialAbility;
  index: number;
  spells: Spell[];
  onChange: (ability: SpecialAbility) => void;
  onRemove: () => void;
}

export function UnitSpecialAbility({
  ability,
  index,
  spells,
  onChange,
  onRemove,
}: UnitSpecialAbilityProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`ability-name-${index}`}>Назва здібності</Label>
            <Input
              id={`ability-name-${index}`}
              value={ability.name || ""}
              onChange={(e) => onChange({ ...ability, name: e.target.value })}
              placeholder="Назва здібності"
            />
          </div>
          <div>
            <Label htmlFor={`ability-type-${index}`}>Тип</Label>
            <Select
              value={ability.type || "passive"}
              onValueChange={(value: "passive" | "active") =>
                onChange({ ...ability, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passive">Пасивна</SelectItem>
                <SelectItem value="active">Активна</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor={`ability-description-${index}`}>
            Опис (опціонально)
          </Label>
          <Textarea
            id={`ability-description-${index}`}
            value={ability.description || ""}
            onChange={(e) =>
              onChange({ ...ability, description: e.target.value })
            }
            placeholder="Опис здібності"
            rows={2}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`ability-spell-${index}`}>
              Заклинання (опціонально)
            </Label>
            <Select
              value={ability.spellId || "none"}
              onValueChange={(value) => {
                onChange({
                  ...ability,
                  spellId: value === "none" ? undefined : value,
                  actionType:
                    value === "none" ? undefined : ability.actionType,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без заклинання</SelectItem>
                {spells.map((spell) => (
                  <SelectItem key={spell.id} value={spell.id}>
                    {spell.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ability.spellId && (
            <div>
              <Label htmlFor={`ability-action-type-${index}`}>Тип дії</Label>
              <Select
                value={ability.actionType || "action"}
                onValueChange={(value: "action" | "bonus_action") =>
                  onChange({ ...ability, actionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action">Дія</SelectItem>
                  <SelectItem value="bonus_action">Бонусна дія</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
            Видалити
          </Button>
        </div>
      </div>
    </Card>
  );
}
