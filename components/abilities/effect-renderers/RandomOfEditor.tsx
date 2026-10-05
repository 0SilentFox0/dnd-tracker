"use client";

import { EffectCard } from "@/components/abilities/EffectCard";
import { Button } from "@/components/ui/button";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import type { Effect, Trigger } from "@/lib/utils/abilities/schema";

type RandomOf = Extract<Effect, { kind: "randomOf" }>;

export function RandomOfEditor({ effect, trigger, path, onChange }: { effect: RandomOf; trigger: Trigger; path: string; onChange: (e: Effect) => void }) {
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
