"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";

export interface UnitAttackItem {
  name: string;
  type?: "melee" | "ranged";
  targetType?: "target" | "aoe";
  attackBonus: number;
  damageDice: string;
  damageType: string;
  range?: string;
  properties?: string;
  maxTargets?: number;
  damageDistribution?: number[];
  guaranteedDamage?: number;
}

interface UnitAttackProps {
  attack: UnitAttackItem;
  index: number;
  onChange: (attack: UnitAttackItem) => void;
  onRemove: () => void;
}

export function UnitAttack({
  attack,
  index,
  onChange,
  onRemove,
}: UnitAttackProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">Атака #{index + 1}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Видалити
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledInput
            id={`attack-name-${index}`}
            label="Назва"
            value={attack.name}
            onChange={(e) => onChange({ ...attack, name: e.target.value })}
            placeholder="Наприклад: Удар мечем"
          />
          <div>
            <Label htmlFor={`attack-type-${index}`}>Вид атаки</Label>
            <SelectField
              id={`attack-type-${index}`}
              value={attack.type ?? (attack.range && !/^5\s*(фт|ft)/i.test(attack.range) ? "ranged" : "melee")}
              onValueChange={(value) =>
                onChange({
                  ...attack,
                  type: (value === "ranged" ? "ranged" : "melee") as "melee" | "ranged",
                })
              }
              placeholder="Виберіть вид"
              options={[
                { value: "melee", label: "Ближня (melee)" },
                { value: "ranged", label: "Дальня (ranged)" },
              ]}
            />
          </div>
          <LabeledInput
            id={`attack-bonus-${index}`}
            label="Бонус до атаки"
            type="number"
            value={attack.attackBonus}
            onChange={(e) =>
              onChange({
                ...attack,
                attackBonus: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <LabeledInput
            id={`attack-damage-dice-${index}`}
            label="Кубики шкоди"
            value={attack.damageDice}
            onChange={(e) => onChange({ ...attack, damageDice: e.target.value })}
            placeholder="1d6, 2d8+3"
          />
          <div>
            <Label htmlFor={`attack-damage-type-${index}`}>Тип шкоди</Label>
            <SelectField
              id={`attack-damage-type-${index}`}
              value={attack.damageType || "bludgeoning"}
              onValueChange={(value) =>
                onChange({ ...attack, damageType: value || "bludgeoning" })
              }
              placeholder="Виберіть тип"
              options={DAMAGE_ELEMENT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </div>
          <LabeledInput
            id={`attack-range-${index}`}
            label="Дальність (опц.)"
            value={attack.range || ""}
            onChange={(e) => onChange({ ...attack, range: e.target.value })}
            placeholder="5 фт, 30/120 фт"
          />
          <LabeledInput
            id={`attack-properties-${index}`}
            label="Властивості (опц.)"
            value={attack.properties || ""}
            onChange={(e) => onChange({ ...attack, properties: e.target.value })}
            placeholder="Finesse, reach"
          />
          <LabeledInput
            id={`attack-guaranteed-${index}`}
            label="Гарантована шкода (опц.)"
            type="number"
            min={0}
            value={attack.guaranteedDamage ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({
                ...attack,
                guaranteedDamage: e.target.value === "" ? undefined : Math.max(0, v),
              });
            }}
            placeholder="0 — навіть при промаху"
          />
          <div>
            <Label htmlFor={`attack-target-type-${index}`}>Ціль (Target/AOE)</Label>
            <SelectField
              id={`attack-target-type-${index}`}
              value={attack.targetType ?? "target"}
              onValueChange={(value) =>
                onChange({
                  ...attack,
                  targetType: (value === "aoe" ? "aoe" : "target") as "target" | "aoe",
                })
              }
              options={[
                { value: "target", label: "Одна ціль" },
                { value: "aoe", label: "AOE (область)" },
              ]}
            />
          </div>
          {attack.targetType === "aoe" && (
            <>
              <LabeledInput
                id={`attack-max-targets-${index}`}
                label="Макс. цілей"
                type="number"
                min={1}
                max={20}
                value={attack.maxTargets ?? 3}
                onChange={(e) =>
                  onChange({
                    ...attack,
                    maxTargets: Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)),
                  })
                }
              />
              <div className="md:col-span-2 space-y-2">
                <Label>Розподіл шкоди (%) — окремо на ціль</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: attack.maxTargets ?? 3 }).map((_, i) => (
                    <LabeledInput
                      key={i}
                      id={`attack-damage-dist-${index}-${i}`}
                      label={`Ціль ${i + 1}`}
                      type="number"
                      min={0}
                      max={100}
                      value={
                        attack.damageDistribution?.[i] ??
                        Math.round(100 / (attack.maxTargets ?? 3))
                      }
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                        const prev = attack.damageDistribution ?? [];
                        const next = [...prev];
                        next[i] = val;
                        while (next.length > (attack.maxTargets ?? 3)) next.pop();
                        onChange({ ...attack, damageDistribution: next });
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Кожна ціль: 0–100%. Сума може перевищувати 100%.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
