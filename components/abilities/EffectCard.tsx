"use client";

import { X } from "lucide-react";

import { FlagEditor } from "./effect-renderers/FlagEditor";
import { RandomOfEditor } from "./effect-renderers/RandomOfEditor";
import { FieldRenderer } from "./fields/FieldRenderer";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { allowedEffectKinds, changeEffectKind, getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { describeEffect, EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import type { Effect, EffectKind, Trigger } from "@/lib/utils/abilities/schema";

interface EffectCardProps {
  effect: Effect;
  trigger: Trigger;
  path: string;
  actions: { onChange: (e: Effect) => void; onRemove: () => void };
  kinds?: EffectKind[];
}

export function EffectCard({ effect, trigger, path, actions, kinds }: EffectCardProps) {
  const def = EFFECT_REGISTRY[effect.kind as EffectKind];

  if (!def) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs">
        <div className="flex items-center justify-between font-medium">
          Невідомий ефект
          <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} aria-label="Видалити ефект">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <pre className="overflow-x-auto text-muted-foreground">{JSON.stringify(effect)}</pre>
      </div>
    );
  }

  const options = (kinds ?? allowedEffectKinds(trigger)).map((k) => ({ value: k, label: EFFECT_REGISTRY[k].label }));

  const set = (name: string, v: unknown) => actions.onChange(setAtPath(effect, name, v));

  const body =
    effect.kind === "flag" ? (
      <FlagEditor effect={effect} path={path} onChange={actions.onChange} />
    ) : effect.kind === "randomOf" ? (
      <RandomOfEditor effect={effect} trigger={trigger} path={path} onChange={actions.onChange} />
    ) : (
      def.fields
        .filter((f) => !f.visibleWhen || f.visibleWhen(effect as Record<string, unknown>))
        .map((f) => <FieldRenderer key={f.name} meta={f} path={`${path}.${f.name}`} value={getAtPath(effect, f.name)} onChange={(v) => set(f.name, v)} />)
    );

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SelectField value={effect.kind} options={options} onValueChange={(k) => actions.onChange(changeEffectKind(effect, k as EffectKind, trigger))} />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} aria-label="Видалити ефект">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">{body}</div>
      <p className="text-xs text-primary">
        <span aria-hidden>= </span>
        <span>{describeEffect(effect)}</span>
      </p>
    </div>
  );
}
