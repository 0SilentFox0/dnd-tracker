"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { FlagEditor } from "./effect-renderers/FlagEditor";
import { FieldRenderer } from "./fields/FieldRenderer";
import { useAbilityEditor, useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";
import { NestedEffectsEditor } from "./NestedEffectsEditor";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import { allowedEffectKinds, changeEffectKind, getAtPath, newEffect, setAtPath } from "@/lib/utils/abilities/editor";
import { describeEffect, EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import type { Effect, EffectKind, Trigger } from "@/lib/utils/abilities/schema";

interface EffectCardProps {
  effect: Effect;
  trigger: Trigger;
  path: string;
  /** Without onRemove the ✕ is disabled (e.g. the last two randomOf options). */
  actions: { onChange: (e: Effect) => void; onRemove?: () => void; onSwitchKind?: (kind: string) => void };
  kinds?: EffectKind[];
  /** Extra header-select entries (spell-only kinds); picking one calls `actions.onSwitchKind`. */
  extraKinds?: { value: string; label: string }[];
}

export function EffectCard({ effect, trigger, path, actions, kinds, extraKinds = [] }: EffectCardProps) {
  const t = useTranslations("abilities.effect");

  const tr = useTranslator("abilityRegistry");

  const def = EFFECT_REGISTRY[effect.kind as EffectKind];

  const errorsUnder = useErrorsUnder(path);

  const kindErrors = useAbilityEditor().errorsByPath[`${path}.kind`] ?? [];

  if (!def) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs">
        <div className="flex items-center justify-between font-medium">
          {t("unknown")}
          <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} disabled={!actions.onRemove} title={actions.onRemove ? undefined : t("minOptions")} aria-label={t("delete")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <pre className="overflow-x-auto text-muted-foreground">{JSON.stringify(effect)}</pre>
        <FieldErrors errors={errorsUnder} testId={`effect-errors-${path}`} />
      </div>
    );
  }

  const options = [...(kinds ?? allowedEffectKinds(trigger)).map((k) => ({ value: k, label: tr(`effects.${k}.label`) })), ...extraKinds];

  const set = (name: string, v: unknown) => actions.onChange(setAtPath(effect, name, v));

  const body =
    effect.kind === "flag" ? (
      <FlagEditor effect={effect} path={path} onChange={actions.onChange} />
    ) : effect.kind === "randomOf" ? (
      <RandomOfEditor effect={effect} trigger={trigger} path={path} onChange={actions.onChange} />
    ) : (
      def.fields
        .filter((f) => !f.visibleWhen || f.visibleWhen(effect as Record<string, unknown>))
        .map((f) => <FieldRenderer key={f.name} meta={f} owner={`effects.${effect.kind}`} path={`${path}.${f.name}`} value={getAtPath(effect, f.name)} onChange={(v) => set(f.name, v)} />)
    );

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SelectField value={effect.kind} options={options} onValueChange={(k) => (extraKinds.some((x) => x.value === k) ? actions.onSwitchKind?.(k) : actions.onChange(changeEffectKind(effect, k as EffectKind, trigger)))} />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} disabled={!actions.onRemove} title={actions.onRemove ? undefined : t("minOptions")} aria-label={t("delete")}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <FieldErrors errors={kindErrors} />
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">{body}</div>
      <p className="text-xs text-primary">
        <span aria-hidden>= </span>
        <span>{describeEffect(effect)}</span>
      </p>
    </div>
  );
}

type RandomOf = Extract<Effect, { kind: "randomOf" }>;

function RandomOfEditor({ effect, trigger, path, onChange }: { effect: RandomOf; trigger: Trigger; path: string; onChange: (e: Effect) => void }) {
  const t = useTranslations("abilities.effect");

  const kinds = allowedEffectKinds(trigger).filter((k) => k !== "randomOf");

  return (
    <NestedEffectsEditor
      effects={effect.options}
      path={`${path}.options`}
      limits={{ min: 2 }}
      labels={{ heading: t("options"), add: t("addOption") }}
      create={() => newEffect("heal", trigger) as RandomOf["options"][number]}
      onChange={(options) => onChange({ ...effect, options })}
      renderCard={({ effect: option, path: optionPath, actions }) => (
        <EffectCard effect={option} trigger={trigger} path={optionPath} kinds={kinds} actions={{ ...actions, onChange: (next) => actions.onChange(next as RandomOf["options"][number]) }} />
      )}
    />
  );
}
