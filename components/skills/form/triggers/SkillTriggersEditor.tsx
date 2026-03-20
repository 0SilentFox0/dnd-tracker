"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import { ComplexTriggerForm } from "./ComplexTriggerForm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
  COMPARISON_OPERATOR_OPTIONS,
  DEFAULT_COMPLEX_TRIGGER,
  SIMPLE_TRIGGER_OPTIONS,
  STAT_TYPE_OPTIONS,
  TARGET_OPTIONS,
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

const RESPONSE_TYPE_OPTIONS = [
  { value: "melee", label: "Мілі" },
  { value: "ranged", label: "Рендж" },
  { value: "magic", label: "Магія" },
] as const;

interface SkillTriggersEditorProps {
  triggers: SkillTriggers;
  onChange: (triggers: SkillTriggers) => void;
}

function SkillTriggersEditorComponent({
  triggers,
  onChange,
}: SkillTriggersEditorProps) {
  const [newTriggerType, setNewTriggerType] = useState<TriggerType | null>(
    null,
  );

  const [newSimpleTrigger, setNewSimpleTrigger] = useState<
    SimpleSkillTrigger | ""
  >("");

  const [newResponseType, setNewResponseType] = useState<
    "melee" | "ranged" | "magic"
  >("melee");

  const [newComplexTrigger, setNewComplexTrigger] = useState<
    Partial<ComplexSkillTrigger>
  >({
    ...DEFAULT_COMPLEX_TRIGGER,
  });

  const simpleTriggerOptions = useMemo(
    () =>
      SIMPLE_TRIGGER_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const comparisonOperatorOptions = useMemo(
    () =>
      COMPARISON_OPERATOR_OPTIONS.map((op) => ({
        value: op.value,
        label: op.label,
      })),
    [],
  );

  const statTypeOptions = useMemo(
    () =>
      STAT_TYPE_OPTIONS.map((stat) => ({
        value: stat.value,
        label: stat.label,
      })),
    [],
  );

  const targetOptions = useMemo(
    () => TARGET_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const valueTypeOptions = useMemo(
    () =>
      VALUE_TYPE_OPTIONS.map((vt) => ({ value: vt.value, label: vt.label })),
    [],
  );

  const addSimpleTrigger = useCallback(() => {
    if (!newSimpleTrigger) return;

    const newTrigger: SimpleSkillTriggerConfig = {
      type: TriggerType.SIMPLE,
      trigger: newSimpleTrigger,
      ...(newSimpleTrigger === "onFirstHitTakenPerRound"
        ? {
            modifiers: {
              responseType: newResponseType,
            },
          }
        : {}),
    };

    onChange([...triggers, newTrigger]);
    setNewSimpleTrigger("");
    setNewResponseType("melee");
    setNewTriggerType(null);
  }, [newSimpleTrigger, newResponseType, triggers, onChange]);

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
    [triggers, onChange],
  );

  const formatComplexTrigger = useCallback(
    (trigger: ComplexSkillTrigger): string => {
      return `if ${trigger.target} ${trigger.operator} ${trigger.value}${trigger.valueType === TriggerValueType.PERCENT ? "%" : ""} ${trigger.stat}`;
    },
    [],
  );

  const resetComplexTrigger = useCallback(() => {
    setNewComplexTrigger({ ...DEFAULT_COMPLEX_TRIGGER });
  }, []);

  const handleCancelSimple = useCallback(() => {
    setNewTriggerType(null);
    setNewSimpleTrigger("");
    setNewResponseType("melee");
  }, []);

  const handleCancelComplex = useCallback(() => {
    setNewTriggerType(null);
    resetComplexTrigger();
  }, [resetComplexTrigger]);

  const isComplexTriggerValid = useMemo(
    () =>
      Boolean(
        newComplexTrigger.target &&
        newComplexTrigger.operator &&
        newComplexTrigger.value !== undefined &&
        newComplexTrigger.valueType &&
        newComplexTrigger.stat,
      ),
    [newComplexTrigger],
  );

  const formattedTriggers = useMemo(
    () =>
      triggers.map((trigger, index) => ({
        id: index,
        trigger,
        label:
          trigger.type === TriggerType.SIMPLE
            ? (() => {
                const base =
                  SIMPLE_TRIGGER_OPTIONS.find((t) => t.value === trigger.trigger)
                    ?.label || trigger.trigger;

                if (
                  trigger.trigger === "onFirstHitTakenPerRound" &&
                  trigger.modifiers?.responseType
                ) {
                  const rt =
                    RESPONSE_TYPE_OPTIONS.find(
                      (o) => o.value === trigger.modifiers?.responseType,
                    )?.label ?? trigger.modifiers.responseType;

                  return `${base} (${rt})`;
                }

                return base;
              })()
            : formatComplexTrigger(trigger),
      })),
    [triggers, formatComplexTrigger],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Тригери скіла</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {newSimpleTrigger === "onFirstHitTakenPerRound" && (
              <SelectField
                value={newResponseType}
                onValueChange={(value) =>
                  setNewResponseType(value as "melee" | "ranged" | "magic")
                }
                placeholder="Тип відповіді"
                options={[...RESPONSE_TYPE_OPTIONS]}
              />
            )}
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
          <ComplexTriggerForm
            value={newComplexTrigger}
            onChange={setNewComplexTrigger}
            onAdd={addComplexTrigger}
            onCancel={handleCancelComplex}
            isValid={isComplexTriggerValid}
            targetOptions={targetOptions}
            comparisonOperatorOptions={comparisonOperatorOptions}
            valueTypeOptions={valueTypeOptions}
            statTypeOptions={statTypeOptions}
          />
        )}
      </CardContent>
    </Card>
  );
}

export const SkillTriggersEditor = memo(SkillTriggersEditorComponent);
