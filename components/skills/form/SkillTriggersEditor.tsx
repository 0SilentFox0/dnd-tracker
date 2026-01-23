"use client";

import { memo,useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import {
  COMPARISON_OPERATOR_OPTIONS,
  DEFAULT_COMPLEX_TRIGGER,
  SIMPLE_TRIGGER_OPTIONS,
  STAT_TYPE_OPTIONS,
  TARGET_OPTIONS,
  TriggerTarget,
  TriggerType,
  TriggerValueType,
  VALUE_TYPE_OPTIONS,
} from "@/lib/constants/skill-triggers";
import type {
  ComplexSkillTrigger,
  SimpleSkillTrigger,
  SimpleSkillTriggerConfig,
  SkillTriggers,
} from "@/types/skill-triggers";

interface SkillTriggersEditorProps {
  triggers: SkillTriggers;
  onChange: (triggers: SkillTriggers) => void;
}

function SkillTriggersEditorComponent({
  triggers,
  onChange,
}: SkillTriggersEditorProps) {
  const [newTriggerType, setNewTriggerType] = useState<TriggerType | null>(null);

  const [newSimpleTrigger, setNewSimpleTrigger] = useState<SimpleSkillTrigger | "">("");

  const [newComplexTrigger, setNewComplexTrigger] = useState<Partial<ComplexSkillTrigger>>({
    ...DEFAULT_COMPLEX_TRIGGER,
  });

  // Мемоізуємо опції для SelectField
  const simpleTriggerOptions = useMemo(
    () => SIMPLE_TRIGGER_OPTIONS.map(t => ({ value: t.value, label: t.label })),
    []
  );

  const comparisonOperatorOptions = useMemo(
    () => COMPARISON_OPERATOR_OPTIONS.map(op => ({ value: op.value, label: op.label })),
    []
  );

  const statTypeOptions = useMemo(
    () => STAT_TYPE_OPTIONS.map(stat => ({ value: stat.value, label: stat.label })),
    []
  );

  const targetOptions = useMemo(
    () => TARGET_OPTIONS.map(t => ({ value: t.value, label: t.label })),
    []
  );

  const valueTypeOptions = useMemo(
    () => VALUE_TYPE_OPTIONS.map(vt => ({ value: vt.value, label: vt.label })),
    []
  );

  // Мемоізуємо функції обробки
  const addSimpleTrigger = useCallback(() => {
    if (!newSimpleTrigger) return;

    const newTrigger: SimpleSkillTriggerConfig = {
      type: TriggerType.SIMPLE,
      trigger: newSimpleTrigger,
    };

    onChange([...triggers, newTrigger]);
    setNewSimpleTrigger("");
    setNewTriggerType(null);
  }, [newSimpleTrigger, triggers, onChange]);

  const addComplexTrigger = useCallback(() => {
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
      type: TriggerType.COMPLEX,
      target: newComplexTrigger.target,
      operator: newComplexTrigger.operator,
      value: newComplexTrigger.value,
      valueType: newComplexTrigger.valueType,
      stat: newComplexTrigger.stat,
    };

    onChange([...triggers, newTrigger]);
    setNewComplexTrigger({ ...DEFAULT_COMPLEX_TRIGGER });
    setNewTriggerType(null);
  }, [newComplexTrigger, triggers, onChange]);

  const removeTrigger = useCallback(
    (index: number) => {
      onChange(triggers.filter((_, i) => i !== index));
    },
    [triggers, onChange]
  );

  const formatComplexTrigger = useCallback((trigger: ComplexSkillTrigger): string => {
    return `if ${trigger.target} ${trigger.operator} ${trigger.value}${trigger.valueType === TriggerValueType.PERCENT ? "%" : ""} ${trigger.stat}`;
  }, []);

  const resetComplexTrigger = useCallback(() => {
    setNewComplexTrigger({ ...DEFAULT_COMPLEX_TRIGGER });
  }, []);

  const handleCancelSimple = useCallback(() => {
    setNewTriggerType(null);
    setNewSimpleTrigger("");
  }, []);

  const handleCancelComplex = useCallback(() => {
    setNewTriggerType(null);
    resetComplexTrigger();
  }, [resetComplexTrigger]);

  // Мемоізуємо перевірку валідності складного тригера
  const isComplexTriggerValid = useMemo(
    () =>
      Boolean(
        newComplexTrigger.target &&
          newComplexTrigger.operator &&
          newComplexTrigger.value !== undefined &&
          newComplexTrigger.valueType &&
          newComplexTrigger.stat
      ),
    [newComplexTrigger]
  );

  // Мемоізуємо список тригерів з форматуванням
  const formattedTriggers = useMemo(
    () =>
      triggers.map((trigger, index) => ({
        id: index,
        trigger,
        label:
          trigger.type === TriggerType.SIMPLE
            ? SIMPLE_TRIGGER_OPTIONS.find((t) => t.value === trigger.trigger)?.label ||
              trigger.trigger
            : formatComplexTrigger(trigger),
      })),
    [triggers, formatComplexTrigger]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Тригери скіла</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Список існуючих тригерів */}
        {formattedTriggers.length > 0 && (
          <div className="space-y-2">
            <Label>Додані тригери:</Label>
            <div className="flex flex-wrap gap-2">
              {formattedTriggers.map(({ id, label }) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => removeTrigger(id)}
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
              onClick={() => setNewTriggerType(TriggerType.SIMPLE)}
            >
              + Простий тригер
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewTriggerType(TriggerType.COMPLEX)}
            >
              + Складний тригер
            </Button>
          </div>
        ) : newTriggerType === TriggerType.SIMPLE ? (
          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label>Простий тригер</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelSimple}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SelectField
              value={newSimpleTrigger}
              onValueChange={(value) =>
                setNewSimpleTrigger(value as SimpleSkillTrigger)
              }
              placeholder="Оберіть тригер"
              options={simpleTriggerOptions}
            />
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
              <Label>
                Складний тригер (if {newComplexTrigger.target || TriggerTarget.ALLY}{" "}
                {newComplexTrigger.operator || DEFAULT_COMPLEX_TRIGGER.operator}{" "}
                {newComplexTrigger.value ?? DEFAULT_COMPLEX_TRIGGER.value}
                {newComplexTrigger.valueType === TriggerValueType.PERCENT ? "%" : ""}{" "}
                {newComplexTrigger.stat || DEFAULT_COMPLEX_TRIGGER.stat})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelComplex}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ціль (a)</Label>
                <SelectField
                  value={newComplexTrigger.target || TriggerTarget.ALLY}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      target: value as ComplexSkillTrigger["target"],
                    })
                  }
                  placeholder="Виберіть ціль"
                  options={targetOptions}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Оператор (b)</Label>
                <SelectField
                  value={newComplexTrigger.operator || DEFAULT_COMPLEX_TRIGGER.operator}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      operator: value as ComplexSkillTrigger["operator"],
                    })
                  }
                  placeholder="Виберіть оператор"
                  options={comparisonOperatorOptions}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Значення (c)</Label>
                <LabeledInput
                  label=""
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
                <SelectField
                  value={newComplexTrigger.valueType || TriggerValueType.PERCENT}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      valueType: value as ComplexSkillTrigger["valueType"],
                    })
                  }
                  placeholder="Виберіть тип"
                  options={valueTypeOptions}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Статистика (d)</Label>
                <SelectField
                  value={newComplexTrigger.stat || DEFAULT_COMPLEX_TRIGGER.stat}
                  onValueChange={(value) =>
                    setNewComplexTrigger({
                      ...newComplexTrigger,
                      stat: value as ComplexSkillTrigger["stat"],
                    })
                  }
                  placeholder="Виберіть статистику"
                  options={statTypeOptions}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addComplexTrigger}
              disabled={!isComplexTriggerValid}
            >
              Додати
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Мемоізуємо компонент для оптимізації рендеру
export const SkillTriggersEditor = memo(SkillTriggersEditorComponent);
