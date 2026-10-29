"use client";

import type { ComponentType } from "react";
import { X } from "lucide-react";

import { SPELL_ONLY_EDITORS } from "./spell-only-editors";
import type { SpellOnlyEditorProps } from "./spell-only-types";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { EffectCard } from "@/components/abilities/EffectCard";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useText } from "@/lib/i18n/use-text";
import { useTranslator } from "@/lib/i18n/use-translator";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect, EffectKind } from "@/lib/utils/abilities/schema";
import { isSpellOnlyKind, newSpellOnlyEffect, SPELL_EFFECT_TRIGGER, SPELL_ONLY_LABEL_KEYS,type SpellOnlyKind } from "@/lib/utils/spells/editor/spell-only";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

interface SpellEffectCardProps {
  effect: SpellEffect;
  path: string;
  actions: { onChange: (e: SpellEffect) => void; onRemove?: () => void };
}

export function SpellEffectCard({ effect, path, actions }: SpellEffectCardProps) {
  const t = useTranslator("editors");

  const tr = useTranslator("abilityRegistry");

  const text = useText();

  const errors = useFieldErrors(path);

  const spellOnlyOptions = (Object.keys(SPELL_ONLY_EDITORS) as SpellOnlyKind[]).map((k) => ({ value: k, label: t(SPELL_ONLY_LABEL_KEYS[k]) }));

  const switchKind = (kind: string) => actions.onChange(isSpellOnlyKind(kind) ? newSpellOnlyEffect(kind) : newEffect(kind as EffectKind, SPELL_EFFECT_TRIGGER));

  const Editor = isSpellOnlyKind(effect.kind) ? (SPELL_ONLY_EDITORS[effect.kind] as ComponentType<SpellOnlyEditorProps> | undefined) : undefined;

  if (!isSpellOnlyKind(effect.kind) || !Editor) {
    return (
      <>
        <EffectCard
          effect={effect as Effect}
          trigger={SPELL_EFFECT_TRIGGER}
          path={path}
          extraKinds={spellOnlyOptions}
          actions={{ onChange: (e) => actions.onChange(e as SpellEffect), onRemove: actions.onRemove, onSwitchKind: switchKind }}
        />
        <FieldErrors errors={errors} />
      </>
    );
  }

  const options = [...allowedEffectKinds(SPELL_EFFECT_TRIGGER).map((k) => ({ value: k, label: tr(`effects.${k}.label`) })), ...spellOnlyOptions];

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2" data-testid={`spell-only-${effect.kind}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SelectField value={effect.kind} options={options} onValueChange={switchKind} />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} disabled={!actions.onRemove} aria-label={t("spellEffects.delete")}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <FieldErrors errors={errors} />
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        <Editor effect={effect as never} path={path} onChange={(next) => actions.onChange(next as SpellEffect)} />
      </div>
      <p className="text-xs text-primary">
        <span aria-hidden>= </span>
        <span>{text(describeEffect(effect))}</span>
      </p>
    </div>
  );
}
