"use client";

import { X } from "lucide-react";

import { FieldRenderer } from "./fields/FieldRenderer";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { AttackType } from "@/lib/constants/battle";
import { getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { CONDITION_REGISTRY } from "@/lib/utils/abilities/registry/conditions";
import type { Condition } from "@/lib/utils/abilities/schema";

const TYPE_OPTIONS = Object.entries(CONDITION_REGISTRY).map(([value, d]) => ({ value, label: d.label }));

export const DEFAULT_CONDITION: Condition = { type: "hpBelow", who: "self", percent: 50 };

function defaultFor(type: Condition["type"]): Condition {
  switch (type) {
    case "hpBelow":
    case "hpAbove":
      return { type, who: "self", percent: 50 };
    case "attackKind":
      return { type, kind: AttackType.MELEE };
    case "targetHasCondition":
      return { type, condition: "no_reaction" };
    case "targetDead":
      return { type };
    case "all":
    case "any":
      return { type, conditions: [DEFAULT_CONDITION] };
  }
}

export function ConditionEditor({ condition, path, actions }: { condition: Condition; path: string; actions: { onChange: (c: Condition) => void; onRemove: () => void } }) {
  const isGroup = condition.type === "all" || condition.type === "any";

  return (
    <div className="space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SelectField value={condition.type} options={TYPE_OPTIONS} onValueChange={(t) => actions.onChange(defaultFor(t as Condition["type"]))} />
        </div>
        <Button type="button" size="icon" variant="ghost" aria-label="Видалити умову" onClick={actions.onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isGroup ? (
        <div className="space-y-2 pl-2">
          {condition.conditions.map((c, i) => (
            <ConditionEditor
              key={i}
              condition={c}
              path={`${path}.conditions.${i}`}
              actions={{
                onChange: (next) => actions.onChange({ ...condition, conditions: condition.conditions.map((x, j) => (j === i ? next : x)) }),
                onRemove: () =>
                  condition.conditions.length > 1 ? actions.onChange({ ...condition, conditions: condition.conditions.filter((_, j) => j !== i) }) : actions.onRemove(),
              }}
            />
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => actions.onChange({ ...condition, conditions: [...condition.conditions, DEFAULT_CONDITION] })}>
            + умова
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
          {CONDITION_REGISTRY[condition.type].fields.map((f) => (
            <FieldRenderer
              key={f.name}
              meta={f}
              path={`${path}.${f.name}`}
              value={getAtPath(condition, f.name)}
              onChange={(v) => actions.onChange(setAtPath(condition, f.name, v))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
