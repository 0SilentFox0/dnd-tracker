"use client";

import { X } from "lucide-react";

import { FlagEditor } from "./effect-renderers/FlagEditor";
import { FieldRenderer } from "./fields/FieldRenderer";
import { useAbilityEditor, useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { allowedEffectKinds, changeEffectKind, getAtPath, newEffect, setAtPath } from "@/lib/utils/abilities/editor";
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

  const errorsUnder = useErrorsUnder(path);

  const kindErrors = useAbilityEditor().errorsByPath[`${path}.kind`] ?? [];

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
        <FieldErrors errors={errorsUnder} testId={`effect-errors-${path}`} />
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
      <FieldErrors errors={kindErrors} />
      <div className="grid grid-cols-2 gap-2">{body}</div>
      <p className="text-xs text-primary">
        <span aria-hidden>= </span>
        <span>{describeEffect(effect)}</span>
      </p>
    </div>
  );
}

type RandomOf = Extract<Effect, { kind: "randomOf" }>;

function RandomOfEditor({ effect, trigger, path, onChange }: { effect: RandomOf; trigger: Trigger; path: string; onChange: (e: Effect) => void }) {
  const kinds = allowedEffectKinds(trigger).filter((k) => k !== "randomOf");

  const setOptions = (options: RandomOf["options"]) => onChange({ ...effect, options });

  return (
    <div className="col-span-2 space-y-2">
      <p className="text-xs text-muted-foreground">Варіанти (обирається один випадково)</p>
      {effect.options.map((option, i) => (
        <EffectCard
          key={i}
          effect={option}
          trigger={trigger}
          path={`${path}.options.${i}`}
          kinds={kinds}
          actions={{
            onChange: (next) => setOptions(effect.options.map((o, j) => (j === i ? (next as RandomOf["options"][number]) : o))),
            onRemove: () => (effect.options.length > 2 ? setOptions(effect.options.filter((_, j) => j !== i)) : undefined),
          }}
        />
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => setOptions([...effect.options, newEffect("heal", trigger) as RandomOf["options"][number]])}>
        + варіант
      </Button>
    </div>
  );
}
