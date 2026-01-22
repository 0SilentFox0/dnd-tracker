"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { SkillTriggers, SimpleSkillTrigger, ComplexSkillTrigger, SimpleSkillTriggerConfig } from "@/types/skill-triggers";

interface SkillTriggersEditorProps {
  triggers: SkillTriggers;
  onChange: (triggers: SkillTriggers) => void;
}

const SIMPLE_TRIGGERS: { value: SimpleSkillTrigger; label: string }[] = [
  { value: "startRound", label: "Початок раунду" },
  { value: "endRound", label: "Кінець раунду" },
  { value: "beforeOwnerAttack", label: "Перед атакою власника" },
  { value: "beforeEnemyAttack", label: "Перед атакою ворога" },
  { value: "afterOwnerAttack", label: "Після атаки власника" },
  { value: "afterEnemyAttack", label: "Після атаки ворога" },
  { value: "beforeOwnerSpellCast", label: "Перед кастом заклинання власника" },
  { value: "afterOwnerSpellCast", label: "Після касту заклинання власника" },
  { value: "beforeEnemySpellCast", label: "Перед кастом заклинання ворога" },
  { value: "afterEnemySpellCast", label: "Після касту заклинання ворога" },
  { value: "bonusAction", label: "Бонусна дія" },
];

const COMPARISON_OPERATORS: { value: ComplexSkillTrigger["operator"]; label: string }[] = [
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "=", label: "=" },
  { value: "<=", label: "<=" },
  { value: ">=", label: ">=" },
];

const STAT_TYPES: { value: ComplexSkillTrigger["stat"]; label: string }[] = [
  { value: "HP", label: "HP" },
  { value: "Attack", label: "Атака" },
  { value: "AC", label: "AC" },
  { value: "Speed", label: "Швидкість" },
  { value: "Morale", label: "Мораль" },
  { value: "Level", label: "Рівень" },
];

export function SkillTriggersEditor({
  triggers,
  onChange,
}: SkillTriggersEditorProps) {
  const [newTriggerType, setNewTriggerType] = useState<"simple" | "complex" | null>(null);
  const [newSimpleTrigger, setNewSimpleTrigger] = useState<SimpleSkillTrigger | "">("");
  const [newComplexTrigger, setNewComplexTrigger] = useState<Partial<ComplexSkillTrigger>>({
    type: "complex",
    target: "ally",
    operator: "<=",
    value: 15,
    valueType: "percent",
    stat: "HP",
  });

  const addSimpleTrigger = () => {
    if (!newSimpleTrigger) return;
    const newTrigger: SimpleSkillTriggerConfig = {
      type: "simple",
      trigger: newSimpleTrigger,
    };
    onChange([...triggers, newTrigger]);
    setNewSimpleTrigger("");
    setNewTriggerType(null);
  };

  const addComplexTrigger = () => {
    if (
      !newComplexTrigger.target ||
      !newComplexTrigger.operator ||
      newComplexTrigger.value === undefined ||
      !newComplexTrigger.valueType ||
      !newComplexTrigger.stat
    ) {
      return;
    }
    const newTrigger: ComplexSkillTrigger = {
      type: "complex",
      target: newComplexTrigger.target,
      operator: newComplexTrigger.operator,
      value: newComplexTrigger.value,
      valueType: newComplexTrigger.valueType,
      stat: newComplexTrigger.stat,
    };
    onChange([...triggers, newTrigger]);
    setNewComplexTrigger({
      type: "complex",
      target: "ally",
      operator: "<=",
      value: 15,
      valueType: "percent",
      stat: "HP",
    });
    setNewTriggerType(null);
  };

  const removeTrigger = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const formatComplexTrigger = (trigger: ComplexSkillTrigger): string => {
    return `if ${trigger.target} ${trigger.operator} ${trigger.value}${trigger.valueType === "percent" ? "%" : ""} ${trigger.stat}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Тригери скіла</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Список існуючих тригерів */}
        {triggers.length > 0 && (
          <div className="space-y-2">
            <Label>Додані тригери:</Label>
            <div className="flex flex-wrap gap-2">
              {triggers.map((trigger, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span>
                    {trigger.type === "simple"
                      ? SIMPLE_TRIGGERS.find((t) => t.value === trigger.trigger)?.label ||
                        trigger.trigger
                      : formatComplexTrigger(trigger)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTrigger(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Додавання нового тригера */}
        {newTriggerType === null ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewTriggerType("simple")}
            >
              + Простий тригер
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewTriggerType("complex")}
            >
              + Складний тригер
            </Button>
          </div>
        ) : newTriggerType === "simple" ? (
          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label>Простий тригер</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewTriggerType(null);
                  setNewSimpleTrigger("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={newSimpleTrigger}
              onValueChange={(value) =>
                setNewSimpleTrigger(value as SimpleSkillTrigger)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Оберіть тригер" />
              </SelectTrigger>
              <SelectContent>
                {SIMPLE_TRIGGERS.map((trigger) => (
                  <SelectItem key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={addSimpleTrigger}
              disabled={!newSimpleTrigger}
            >
              Додати
            </Button>
          </div>
        ) : (
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label>Складний тригер (if {newComplexTrigger.target || "ally"} {newComplexTrigger.operator || "<="} {newComplexTrigger.value || 15}{newComplexTrigger.valueType === "percent" ? "%" : ""} {newComplexTrigger.stat || "HP"})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewTriggerType(null);
                  setNewComplexTrigger({
                    type: "complex",
                    target: "ally",
                    operator: "<=",
                    value: 15,
                    valueType: "percent",
                    stat: "HP",
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ціль (a)</Label>
                <Select
                  value={newComplexTrigger.target || "ally"}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      target: value as "ally" | "enemy",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ally">Союзник</SelectItem>
                    <SelectItem value="enemy">Ворог</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Оператор (b)</Label>
                <Select
                  value={newComplexTrigger.operator || "<="}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      operator: value as ComplexSkillTrigger["operator"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARISON_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Значення (c)</Label>
                <Input
                  type="number"
                  value={newComplexTrigger.value?.toString() || ""}
                  onChange={(e) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      value: e.target.value ? parseFloat(e.target.value) : 0,
                    })
                  }
                  placeholder="15"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Тип значення</Label>
                <Select
                  value={newComplexTrigger.valueType || "percent"}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      valueType: value as "number" | "percent",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Число</SelectItem>
                    <SelectItem value="percent">Відсоток</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Статистика (d)</Label>
                <Select
                  value={newComplexTrigger.stat || "HP"}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      stat: value as ComplexSkillTrigger["stat"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAT_TYPES.map((stat) => (
                      <SelectItem key={stat.value} value={stat.value}>
                        {stat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addComplexTrigger}
              disabled={
                !newComplexTrigger.target ||
                !newComplexTrigger.operator ||
                newComplexTrigger.value === undefined ||
                !newComplexTrigger.valueType ||
                !newComplexTrigger.stat
              }
            >
              Додати
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
