import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { Spell } from "@/types/spells";

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
          <LabeledInput
            id={`ability-name-${index}`}
            label="Назва здібності"
            value={ability.name || ""}
            onChange={(e) => onChange({ ...ability, name: e.target.value })}
            placeholder="Назва здібності"
          />
          <div>
            <Label htmlFor={`ability-type-${index}`}>Тип</Label>
            <SelectField
              id={`ability-type-${index}`}
              value={ability.type || "passive"}
              onValueChange={(value) => onChange({ ...ability, type: value as "passive" | "active" })}
              placeholder="Виберіть тип"
              options={[
                { value: "passive", label: "Пасивна" },
                { value: "active", label: "Активна" },
              ]}
            />
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
            <SelectField
              id={`ability-spell-${index}`}
              value={ability.spellId || ""}
              onValueChange={(value) => {
                onChange({
                  ...ability,
                  spellId: value || undefined,
                  actionType: value ? ability.actionType : undefined,
                });
              }}
              placeholder="Виберіть заклинання"
              options={spells.map(spell => ({ value: spell.id, label: spell.name }))}
              allowNone
              noneLabel="Без заклинання"
            />
          </div>
          {ability.spellId && (
            <div>
              <Label htmlFor={`ability-action-type-${index}`}>Тип дії</Label>
              <SelectField
                id={`ability-action-type-${index}`}
                value={ability.actionType || "action"}
                onValueChange={(value) => onChange({ ...ability, actionType: value as "action" | "bonus_action" })}
                placeholder="Виберіть тип дії"
                options={[
                  { value: "action", label: "Дія" },
                  { value: "bonus_action", label: "Бонусна дія" },
                ]}
              />
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
