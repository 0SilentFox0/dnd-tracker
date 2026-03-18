"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import {
  DEFAULT_COMPLEX_TRIGGER,
  TriggerTarget,
  TriggerValueType,
} from "@/lib/constants/skill-triggers";
import type { ComplexSkillTrigger } from "@/types/skill-triggers";

export interface SelectOption {
  value: string;
  label: string;
}

interface ComplexTriggerFormProps {
  value: Partial<ComplexSkillTrigger>;
  onChange: (v: Partial<ComplexSkillTrigger>) => void;
  onAdd: () => void;
  onCancel: () => void;
  isValid: boolean;
  targetOptions: SelectOption[];
  comparisonOperatorOptions: SelectOption[];
  valueTypeOptions: SelectOption[];
  statTypeOptions: SelectOption[];
}

export function ComplexTriggerForm({
  value,
  onChange,
  onAdd,
  onCancel,
  isValid,
  targetOptions,
  comparisonOperatorOptions,
  valueTypeOptions,
  statTypeOptions,
}: ComplexTriggerFormProps) {
  return (
    <div className="space-y-3 border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <Label>
          Складний тригер (if{" "}
          {value.target || TriggerTarget.ALLY}{" "}
          {value.operator || DEFAULT_COMPLEX_TRIGGER.operator}{" "}
          {value.value ?? DEFAULT_COMPLEX_TRIGGER.value}
          {value.valueType === TriggerValueType.PERCENT ? "%" : ""}{" "}
          {value.stat || DEFAULT_COMPLEX_TRIGGER.stat})
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Ціль (a)</Label>
          <SelectField
            value={value.target || TriggerTarget.ALLY}
            onValueChange={(v) => onChange({ ...value, target: v as ComplexSkillTrigger["target"] })}
            placeholder="Виберіть ціль"
            options={targetOptions}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Оператор (b)</Label>
          <SelectField
            value={value.operator || DEFAULT_COMPLEX_TRIGGER.operator}
            onValueChange={(v) =>
              onChange({ ...value, operator: v as ComplexSkillTrigger["operator"] })
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
            value={value.value?.toString() ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                value: e.target.value ? parseFloat(e.target.value) : 0,
              })
            }
            placeholder="15"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Тип значення</Label>
          <SelectField
            value={value.valueType ?? TriggerValueType.PERCENT}
            onValueChange={(v) =>
              onChange({
                ...value,
                valueType: v as ComplexSkillTrigger["valueType"],
              })
            }
            placeholder="Виберіть тип"
            options={valueTypeOptions}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Статистика (d)</Label>
          <SelectField
            value={value.stat ?? DEFAULT_COMPLEX_TRIGGER.stat}
            onValueChange={(v) =>
              onChange({ ...value, stat: v as ComplexSkillTrigger["stat"] })
            }
            placeholder="Виберіть статистику"
            options={statTypeOptions}
          />
        </div>
      </div>
      <Button type="button" size="sm" onClick={onAdd} disabled={!isValid}>
        Додати
      </Button>
    </div>
  );
}
