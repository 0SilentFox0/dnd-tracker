"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CardArgs<E> {
  effect: E;
  path: string;
  actions: { onChange: (e: E) => void; onRemove?: () => void };
}

interface NestedEffectsEditorProps<E> {
  effects: E[];
  path: string;
  limits: { min: number; max?: number };
  labels: { heading?: string; add: string };
  create: () => E;
  onChange: (next: E[]) => void;
  renderCard: (args: CardArgs<E>) => ReactNode;
  className?: string;
  renderAdd?: (add: (next: E[]) => void, ctx: { canAdd: boolean }) => ReactNode;
}

export function NestedEffectsEditor<E>({ effects, path, limits, labels, create, onChange, renderCard, className = "col-span-6", renderAdd }: NestedEffectsEditorProps<E>) {
  const canRemove = effects.length > limits.min;

  const canAdd = limits.max === undefined || effects.length < limits.max;

  return (
    <div className={cn("space-y-2", className)}>
      {labels.heading && <p className="text-xs text-muted-foreground">{labels.heading}</p>}
      {effects.map((effect, i) => (
        <div key={i}>
          {renderCard({
            effect,
            path: `${path}.${i}`,
            actions: {
              onChange: (next) => onChange(effects.map((e, j) => (j === i ? next : e))),
              onRemove: canRemove ? () => onChange(effects.filter((_, j) => j !== i)) : undefined,
            },
          })}
        </div>
      ))}
      {renderAdd ? (
        renderAdd(onChange, { canAdd })
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={!canAdd} onClick={() => onChange([...effects, create()])}>
          {labels.add}
        </Button>
      )}
    </div>
  );
}
